function doPost(e) {

  // プロジェクトのプロパティ>スクリプトのプロパティから情報取得
  // AppのVerification Tokenが入っている前提
  const prop = PropertiesService.getScriptProperties();
  
  // Events APIからのPOSTを取得
  // 参考→https://api.slack.com/events-api
  const json = JSON.parse(e.postData.getDataAsString());
  
  // Events APIからのPOSTであることを確認
  if (prop.getProperty('verification_token') != json.token) {
    throw new Error('invalid token.');
  }
  
  // Events APIを使用する初回、URL Verificationのための記述
  if (json.type == 'url_verification') {
    return ContentService.createTextOutput(json.challenge);
  }

  // 参考→https://api.slack.com/events/message.channels
  const token = prop.getProperty('bot_token'); // Bot User OAuth Access Token （xoxbから始まるもの）を取得
  const workspace = prop.getProperty('workspace'); // ワークスペースのURLの固有部分（hoge.slack.comのhoge部分）を取得
  //const webhook_url = prop.getProperty('webhook_url'); // Webhookの URLを取得 未使用

  const event_type   = json.event.type;
  const host_channel = json.event.channel;
  const text         = json.event.text;
  const ts           = json.event.ts;
  //const event_ts     = json.event.event_ts;
  const channel_type = json.event.channel_type;

  //Slackの再送判定を行う＜ED＞
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('posthistory');

  //チャンネル(ts)で再送判定
  var textFinder = sheet.createTextFinder(ts);
  var cells = textFinder.findAll();
    
  Logger.log('ヒット数 ： ' + cells.length);

  if(cells.length > 0){
    return
  }
  //Slackの再送判定を行う＜ED＞

  //ユーザIDを取得する＜ST＞
  if(event_type == 'message' && json.event.user == null && text.match(/@/)){
    //ショートカットから投入された場合、json.event.userに連携されないためjson.event.textから'@'をキーに検索し取得
    var user = text.substring(text.search('@')+1,text.search('>'));
  }else if(event_type == 'message' && json.event.user != null){
    //入力された場合、json.event.userから取得
    var user = json.event.user;
  }else{
    //userが取得できない場合、return
    return null;
  }
  //ユーザIDを取得する＜ED＞

  //チャンネルIDを取得する＜ST＞
  if(event_type == 'message' && text.match(/#/)){
    var channel = text.substring(text.search('#'));
  }else{
    var channel = host_channel;
  }
  //チャンネルIDを取得する＜ED＞

  //log代わりにposthistoryシートに記録＜ST＞
  //日付取得
  var datetime     = new Date();
  var date         = Utilities.formatDate(datetime,'JST', 'yyyy-MM-dd');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('posthistory');

  //日付(date)で日替わり判定
  var textFinder = sheet.createTextFinder(date);
  var cells = textFinder.findAll();

  Logger.log('ヒット数 ： ' + cells.length);

  //日替わりで'posthistory'のシートクリア
  if(cells.length == 0){
    //履歴シートクリア
    sheet.clear();
  }

  //追加する配列を作成
  //array = [json.token,json.team_id,json.api_app_id,json.type,json.event_id,json.event_time,token,workspace,event_type,host_channel,text,user,ts,event_ts,channel_type,channel];
  array = [date,json.type,json.event_id,json.event_time,token,workspace,event_type,host_channel,text,user,ts,channel_type,channel];

  //シートの最下行に配列を記述
  sheet.appendRow(array);

  //tsの書式設定
  //K列は、Slack再送判定に使用するため書式を変更する
  var range = sheet.getRange("K:K");
  range.setNumberFormat('0.000000');
  //log代わりにposthistoryシートに記録＜ED＞

  if(text.match(/コメント/)){
    // コメント入力の場合
    var response = CommentStamp(token,channel,text,user);
  }else{
    // タイムカード打刻の場合
    var response = TimecardStamp(token,event_type,channel,text,user);
    if (response == null){
      // ターゲットワードなし
      return null;
    }
  }
  
  // タイムカード表示
  var response = TimecardDsp(token,channel);
  
  // メッセージ削除
  // だめ、Userトークンが必要かな？
  //var response = slack_ChatDelete(token,channel,ts)
  
  return response;
}

function TimecardStamp(token,event_type,channel,text,user) {

  //Timesheetsはシート名に応じて変更
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('attendance');

  //先ほど控えたOutgoing Webhookのトークン
  //var token = 'Webhookのトークン'

  //送られてきたトークンが正しければ勤怠を記録する。正しくない場合、returnで処理終了
  //if (token != e.parameter.token){
  //  return
  //}
  
  //在宅・出社・退勤・未出
  if (event_type == 'message' && text.match(/在宅/)){
    var trigger_word = '出勤';
    var type         = ':zaitakuJ:';
  }else if (event_type == 'message' && text.match(/出社|出勤/)){
    var trigger_word = '出勤';
    var type         = ':syusyaJ:';
  }else if (event_type == 'message' && text.match(/勤務終了|退勤|退社/)){
    var trigger_word = '退勤';
    var type         = ':taikinJ:';
  }else if (event_type == 'message' && text.match(/勤務場所変更|ロケ変/)){
    var trigger_word = '切替';
  }else{
    return null;
  }
  
  //parameterは必要に応じて変更してください
  var datetime     = new Date();
  var date         = Utilities.formatDate(datetime,'JST', 'yyyy-MM-dd');
  //var date         = (datetime.getFullYear() + '-' + ('0' + (datetime.getMonth() + 1)).slice(-2) + '-' + ('0' + datetime.getDate()).slice(-2))

  if(trigger_word == '出勤'){
    var stime        = (('0' + datetime.getHours()).slice(-2) + ':' + ('0' + datetime.getMinutes()).slice(-2) + ':' + ('0' + datetime.getSeconds()).slice(-2));
    var etime        = ' -- : -- :-- ';
  }else{
    var etime        = (('0' + datetime.getHours()).slice(-2) + ':' + ('0' + datetime.getMinutes()).slice(-2) + ':' + ('0' + datetime.getSeconds()).slice(-2));  
  }
  var user_name      = slack_UsersInfo(token,user)  //IDからユーザ名を取得
  var text           = text;
  var comment        = '';

  //ユーザID(user)で記述済み判定
  var textFinder = sheet.createTextFinder(user);
  var cells = textFinder.findAll();

  Logger.log('ヒット数 ： ' + cells.length);

  //退勤の場合、開始時刻を取得する
  if(trigger_word == '退勤' && cells.length > 0){
    //行番号取得
    var row = cells[0].getRow();
  
    stime =sheet.getRange(row, 2).getDisplayValue();
  }
  //切替の場合、開始時刻、終了時刻を取得し絵文字を入れ替える
  if(trigger_word == '切替' && cells.length > 0){
    //行番号取得
    var row = cells[0].getRow();
  
    stime =sheet.getRange(row, 2).getDisplayValue();
    etime =sheet.getRange(row, 3).getDisplayValue();
    
    if (sheet.getRange(row, 4).getDisplayValue().match(/zaitakuJ/)){
      var trigger_word = '切替1';
      var type         = ':syusyaJ:';
    }else if (sheet.getRange(row, 4).getDisplayValue().match(/syusyaJ/)){
      var trigger_word = '切替2';
      var type         = ':zaitakuJ:';
    }
  }

  //記述済みの場合、行番号で行を削除する。
  if(cells.length > 0){
    //行番号取得
    var row = cells[0].getRow();
    //記述済みコメント取得
    var comment = sheet.getRange(row, 8).getDisplayValue();
      
    //行番号で記述済み行を削除
    sheet.deleteRows(row);
  }

  //追加する配列を作成
  array = [date,stime,etime,type,user_name,trigger_word,text,comment,user];
  //シートの最下行に配列を記述
  sheet.appendRow(array);
  
  //名前(user_name)でソート
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  sheet.getRange(1, 1, lastRow, lastCol).sort(5);

  //打刻メッセージ
  var response = StampMessage(token,channel,user_name,trigger_word)

  return response;
}

function CommentStamp(token,channel,text,user) {
  
  //Timesheetsはシート名に応じて変更
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('attendance');

  //コメント入力の場合
  if(text.match(/コメント入力/)){
    //
    var trigger_word = 'コメント入力';

    var datetime     = new Date();                         //本日を取得
    var user_name    = slack_UsersInfo(token,user)         //IDからユーザ名を取得

    //コメント部分を取得
    if(text.match(/#/)){
      var comment = text.substring(text.search('：'),text.search('#'));
    }else{
      var comment = text.substring(text.search('：'));  
    }
    
    //ユーザID(user)で記述済み判定
    var textFinder = sheet.createTextFinder(user);
    var cells = textFinder.findAll();
    
    Logger.log('ヒット数 ： ' + cells.length);

    if(cells.length > 0){
      //起票済みユーザの場合更新
      //行番号取得
      var row = cells[0].getRow();
      
      sheet.getRange(row, 8).setValue(comment);

    }else{
      //起票なしユーザの場合追加
      var date         = Utilities.formatDate(datetime,'JST', 'yyyy-MM-dd');
      var stime        = ' -- : -- :-- ';
      var etime        = ' -- : -- :-- ';
      var type         = ':misyutsuJ:';
      
      //追加する配列を作成
      array = [date,stime,etime,type,user_name,trigger_word,text,comment,user];
      //シートの最下行に配列を記述
      sheet.appendRow(array);
      
      //名前(user_name)でソート
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      sheet.getRange(1, 1, lastRow, lastCol).sort(5);
    }
  }

  //コメントクリアの場合
  if(text.match(/コメントクリア/)){
    //
    var trigger_word = 'コメントクリア';

    var user_name    = slack_UsersInfo(token,user)            //IDからユーザ名を取得
    
    //ユーザID(user)で記述済み判定
    var textFinder = sheet.createTextFinder(user);
    var cells = textFinder.findAll();
    
    Logger.log('ヒット数 ： ' + cells.length);

    if(cells.length > 0){
      //行番号取得
      var row = cells[0].getRow();
      
      var comment = sheet.getRange(row, 8).getDisplayValue();

      sheet.getRange(row, 8).setValue('');
    }
  }
  //打刻メッセージ
  var response = StampMessageComment(token,channel,user_name,trigger_word,comment)

  return response;
}

function StampMessage(token,channel,user_name,trigger_word) {

  //const emoji = ['始業', '終業', '在宅', '出社'];
  const emoji = [':shigyoJ:', ':syugyoJ:', ':zaitakuJ:', ':syusyaJ:'];

  if(trigger_word == '出勤'){
    //業務開始メッセージを送信
    var message = '[' + emoji[0] + '] *'+ user_name + 'さんが業務を開始しました* ';

  }else if(trigger_word == '退勤'){
    //業務終了メッセージを送信
    var message = '[' + emoji[1] + '] *'+ user_name + 'さんが業務を終了しました* ';

  }else if(trigger_word == '切替1'){
    //勤務形態切替（在宅→出社）メッセージを送信
    var message = '[' + emoji[2] + ' → ' + emoji[3] + '] *'+ user_name + 'さんが勤務形態を変更しました* ';

  }else if(trigger_word == '切替2'){
    //勤務形態切替（出社→在宅）メッセージを送信
    var message = '[' + emoji[3] + ' → ' + emoji[2] + '] *'+ user_name + 'さんが勤務形態を変更しました* ';

  }else{
    return
  }

  // メッセージ送信(api/chat.postMessage)
  var response = slack_postMessage(token,channel,message);

  return response;
}

function StampMessageComment(token,channel,user_name,trigger_word,comment) {
  
  //const emoji = ['コメント', 'クリア'];
  const emoji = [':komentoJ:', ':kuriaJ:'];

  if(comment.match(/：/)){
    var dspcomment = comment.substring(comment.search('：')+1);
  }else{
    var dspcomment = comment
  }

  if(trigger_word == 'コメント入力'){
    //コメント入力メッセージを送信
    var message = '[' + emoji[0] + '] *'+ user_name + 'さんがステータスを更新しました* ：' + dspcomment;

  }else if(trigger_word == 'コメントクリア'){
    //コメントクリアメッセージを送信
    var message = '[' + emoji[1] + '] *'+ user_name + 'さんがステータスをクリアしました* ： ~' + dspcomment + '~';

  }else{
    return
  }
  
  // メッセージ送信(api/chat.postMessage)
  var response = slack_postMessage(token,channel,message);

  return response;
}

function TimecardDsp(token,channel) {

  //既存のメッセージを削除する
  DspMessageDelete(token,channel)

  //Timesheetsはシート名に応じて変更
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('attendance');

  //日付取得
  var datetime     = new Date();
  var date         = Utilities.formatDate(datetime,'JST', 'yyyy-MM-dd');
  //var date         = (datetime.getFullYear() + '-' + ('0' + (datetime.getMonth() + 1)).slice(-2) + '-' + ('0' + datetime.getDate()).slice(-2));

  //日付設定
  var timecard = '>>>' + date + '\n';

  //タイムカード作成
  var lastRow = sheet.getLastRow();

  for(let i = 1; i <= lastRow; i++) {
    //日付が当日のタイムカードを取得し表示する
    //コメントが設定されている（日付が一致しなくても）タイムカードも取得し表示する
    if (date == sheet.getRange(i, 1).getDisplayValue() || sheet.getRange(i, 8).isBlank() != true){

      //開始時間の前ZERO編集
      if(Object.prototype.toString.call(sheet.getRange(i, 2).getValue()) == '[object Date]'){
        var stime = Utilities.formatDate(sheet.getRange(i, 2).getValue(),'JST', 'HH:mm:ss');
      }else{
        var stime = sheet.getRange(i, 2).getDisplayValue();
      }
      Logger.log('開始 ： ' + stime);

      //終了時間の前ZERO編集
      if(Object.prototype.toString.call(sheet.getRange(i, 3).getValue()) == '[object Date]'){
        var etime = Utilities.formatDate(sheet.getRange(i, 3).getValue(),'JST', 'HH:mm:ss');
      }else{
        var etime = sheet.getRange(i, 3).getDisplayValue();
      }
      Logger.log('終了 ： ' + etime);

      //絵文字の編集
      //日付が一致しないコメントは絵文字編集して表示する
      if (date != sheet.getRange(i, 1).getDisplayValue() && sheet.getRange(i, 8).isBlank() != true){
        sheet.getRange(i, 2).setValue(' -- : -- :-- ');
        sheet.getRange(i, 3).setValue(' -- : -- :-- ');
        sheet.getRange(i, 4).setValue(':misyutsuJ:');
      }

      var timecard_text = '[ ' + stime + ' - ' + etime + ' ]  ' + sheet.getRange(i, 4).getDisplayValue() + '  ' + sheet.getRange(i, 5).getDisplayValue() + sheet.getRange(i, 8).getDisplayValue();
      
      //var timecard_text = '[ ' + sheet.getRange(i, 2).getDisplayValue() + ' - ' + sheet.getRange(i, 3).getDisplayValue() + ' ]  ' + sheet.getRange(i, 4).getDisplayValue() + '  ' + sheet.getRange(i, 5).getDisplayValue() ;
      Logger.log('timecard_text ： ' + timecard_text);

      var timecard = timecard + timecard_text + '\n';
      //if (i==1) {
      //  var timecard = timecard_text + '\n';
      //}
      //else if (i<=lastRow) {
      //  var timecard = timecard + timecard_text + '\n';
      //}
    }
  }

  // メッセージ送信(api/chat.postMessage)
  var response = slack_postMessage(token,channel,timecard);

  //Timesheetsはシート名に応じて変更
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ts');

  //チャンネル(resjson.channel)で記述済み判定
  var textFinder = sheet.createTextFinder(resjson.channel);
  var cells = textFinder.findAll();
    
  Logger.log('ヒット数 ： ' + cells.length);

  if(cells.length > 0){
    //起票済みチャンネルの場合更新
    //行番号取得
    var row = cells[0].getRow();

    //シートにtsを記述
    sheet.getRange(row, 1).setValue(resjson.ok);
    sheet.getRange(row, 2).setValue(resjson.channel);
    sheet.getRange(row, 3).setValue(resjson.ts);
  }else{
    //起票なしチャンネルの場合追加
    //追加する配列を作成
    array = [resjson.ok,resjson.channel,resjson.ts];
    //シートの最下行に配列を記述
    sheet.appendRow(array);
  }
  var range = sheet.getRange("C:C");
  range.setNumberFormat('0.000000');

  return response;
}

function DspMessageDelete(token,channel) {
  
  //tsシートからタイムスタンプを取得
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ts');

  //チャンネル(channel)で記述済み判定
  var textFinder = sheet.createTextFinder(channel);
  var cells = textFinder.findAll();
    
  Logger.log('ヒット数 ： ' + cells.length);

  if(cells.length == 0){
    return
  }

  //最後に表示したタイムカードのtsを取得する
  //行番号取得
  var row = cells[0].getRow();

  //シートからtsを取得
  var ts = sheet.getRange(row, 3).getDisplayValue();
  
  //メッセージ削除
  var response = slack_ChatDelete(token,channel,ts)
  
  var resjson = JSON.parse(response.getContentText());
  sheet.getRange(row, 4).setValue(resjson.ok);

  return response;

}
