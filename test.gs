function test(){
  
  const token = prop.getProperty('bot_token'); // Bot User OAuth Access Token （xoxbから始まるもの）を取得
 




  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('attendance');

  Logger.log('A ： ' + sheet.getRange(1, 8).isBlank() );
  Logger.log('A ： ' + sheet.getRange(2, 8).isBlank() );
  

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

  //C022Q6ZNKL5 itm_timecard_host
  //C024KCU93LG itm_timecard_test

  //チャンネルIDを取得する＜ST＞
  var text ='勤務開始（在宅）<@ABCDEFGHTJ>：#itm_timecard_test';
  if(text.match(/#/)){
    var channel = text.substring(text.search('#')+1);
  }

  var url = 'https://slack.com/api/chat.postMessage';
  
  // メッセージ送信
  var payload = {
    'token' : token,
    'channel' : 'ABCDEFGHIJK',
    //'icon_url' : 'http://path/to/image',
    'username' : 'ロボ',
    'icon_emoji' : ':robot_face:',
    'text' : '>>>あいうえお\n[:mito:] *Slackに投稿するメッセージ* '
  };
  var params = {
    'method' : 'post',
    'payload' : payload
  };
  
  // Slackに投稿する
  var response = UrlFetchApp.fetch(url, params);
  var resjson = JSON.parse(response.getContentText());
  Logger.log('user ： ' + resjson.ok);
  Logger.log('user ： ' + resjson.error);

  //return


  var ts = '1622715270.014700';

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('posthistory');

  var range = sheet.getRange("J:J");
  range.setNumberFormat('General');

  var cell = sheet.getRange("J13");
  Logger.log(cell.getNumberFormat());

  var range = sheet.getRange("J:J");
  range.setNumberFormat('0.000000');

  var cell = sheet.getRange("J13");
  Logger.log(cell.getNumberFormat());


  //チャンネル(ts)で再送判定
  var textFinder = sheet.createTextFinder(ts);
  var cells = textFinder.findAll();
    
  Logger.log('ヒット数 ： ' + cells.length);

  if(cells.length == 0){
  //  return
  }

  //投稿したユーザー名をSlackAPIを用いて取得
  var url = 'https://slack.com/api/users.info';

  var slackId = 'ABCDEFGHTJ';

  // メッセージ送信
  var payload = {
    'token' : token,
    'user' : slackId
  };
  var params = {
    'method' : 'post',
    'payload' : payload
  };
  
  // Slackメッセージを削除する
  //var response = UrlFetchApp.fetch(url, params);
  //var resjson = JSON.parse(response.getContentText());
  //Logger.log('ok ： ' + resjson.ok);
  //Logger.log('ok ： ' + resjson.user.real_name);


  //var slack_team  = 'mit-o';
  //
  //var listurl = 'https://' + slack_team + '.slack.com/api/users.info?token=' + token +'&user='+slackId;
  //var listres = UrlFetchApp.fetch(listurl);
  //var listjson = JSON.parse(listres.getContentText());
  //return listjson.user.name;
  //Logger.log('user ： ' + listjson.ok);
  //Logger.log('user ： ' + listjson.error);
  //Logger.log('user ： ' + listjson.user.name);

  //文字列検索、文字取得
  var tuser = '';
  var text = '在宅　：<@ABCDEFGHTJ>';

  if(tuser == '' && text.match(/@/)){
    var user = text.substring(text.search('@')+1,text.search('>'));
  }
  Logger.log('user ： ' + user);
 


  //日付取り扱い
  var datetime     = new Date();

  //Logger.log('日付 ： ' + Utilities.formatDate(datetime,'JST', 'yyyy/MM/dd'));
  //Logger.log('日付 ： ' + Utilities.formatDate(datetime,'JST', 'HH:mm:ss'));

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('attendance');
  var lastRow = sheet.getLastRow();

  for(let i = 1; i <= lastRow; i++) {
    //Logger.log('日付1 ： ' + sheet.getRange(i, 1).getValue());
    //Logger.log('日付2 ： ' + Utilities.formatDate(sheet.getRange(i, 1).getValue(),'JST', 'yyyy/MM/dd'));
    //Logger.log('日付3 ： ' + sheet.getRange(i, 1).getDisplayValue());
  
    //日付日付か判定
    if(Object.prototype.toString.call(sheet.getRange(i, 2).getValue()) == '[object Date]'){
      Logger.log('時間1.1 ： ' + Utilities.formatDate(sheet.getRange(i, 2).getValue(),'JST', 'HH:mm:ss'));
    }else{
      Logger.log('時間1.2 ： HH:mm:ss');
    }
    if(Object.prototype.toString.call(sheet.getRange(i, 3).getValue()) == '[object Date]'){
      Logger.log('時間2.1 ： ' + Utilities.formatDate(sheet.getRange(i, 3).getValue(),'JST', 'HH:mm:ss'));
    }else{
      Logger.log('時間2.2 ： HH:mm:ss');
    }
  }

}
