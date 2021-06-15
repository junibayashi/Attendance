function slack_postMessage(token,channel,text) {

  const url = 'https://slack.com/api/chat.postMessage';
  
  // メッセージ送信
  var payload = {
    'token' : token,
    'channel' : channel,
    'text' : text,
    'username' : 'Attendance',
    'icon_emoji' : ':mito:'
  };
  var params = {
    'method' : 'post',
    'payload' : payload
  };
  
  // Slackに投稿する
  var response = UrlFetchApp.fetch(url, params);
  // レスポンス取得
  var resjson = JSON.parse(response.getContentText());
  // 
  Logger.log('ok ： ' + resjson.ok);
  //Logger.log('error ： ' + resjson.error);

  return response;
}

function slack_ChatDelete(token,channel,ts) {
  
  const url = 'https://slack.com/api/chat.delete';

  // メッセージ削除
  var payload = {
    'token' : token,
    'channel' : channel,
    'ts' : ts
  };
  var params = {
    'method' : 'post',
    'payload' : payload
  };
  
  // Slackメッセージを削除する
  var response = UrlFetchApp.fetch(url, params);
  // レスポンス取得
  var resjson = JSON.parse(response.getContentText());
  Logger.log('ok ： ' + resjson.ok);

  return response;
}

function slack_UsersInfo(token,user) {

  //投稿したユーザー名をSlackAPIを用いて取得
  const url = 'https://slack.com/api/users.info';

  // ユーザ名取得
  var payload = {
    'token' : token,
    'user' : user
  };
  var params = {
    'method' : 'post',
    'payload' : payload
  };
  
  // Slackユーザー名を取得する
  var response = UrlFetchApp.fetch(url, params);
  // レスポンス取得
  var resjson = JSON.parse(response.getContentText());
  Logger.log('ok ： ' + resjson.ok);
  Logger.log('ok ： ' + resjson.user.real_name);

  return resjson.user.real_name;

}
