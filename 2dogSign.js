/**
 * @fileoverview Template to compose HTTP reqeuest for Surge/QuanX.
 * 
 */

const signurlKey = 'chavy_signurl_2dog';
const signheaderKey = 'chavy_signheader_2dog';
const chavy = init();

const url = `https://mini.tuodan.tech/jstd-doger/app/sign/v3/signIn`;
const method = `GET`;
const headers = JSON.parse(chavy.getdata(signheaderKey));
const body = ``;

const myRequest = {
    url: url,
    method: method,
    headers: headers,
    body: body
};

chavy.fetch(myRequest, (err, response, body) => {
    if (err) {
        chavy.msg("签到异常", "网络或其他错误", err);
        chavy.done();
    } else {
        let result = JSON.parse(body);
        console.log(response + "\n\n" + body);
        // 直接判断 result.success 来判断是否签到成功
        if (result.success) {
            const title = "签到成功";
            const subtitle = `已签到${result.data.signCount}次`;
            const message = `获得狗粮: ${result.data.dogfood}, 心跳数: ${result.data.heartbeat}\n有效期至: ${result.data.expireTime}`;
            chavy.msg(title, subtitle, message);
        } else {
            chavy.msg("签到失败", "错误详情", result.msg);
        }
        chavy.done();
    }
});

function init() {
  isSurge = () => {
    return typeof $httpClient !== "undefined";
  };
  isQuanX = () => {
    return typeof $task !== "undefined";
  };
  getdata = (key) => {
    if (isSurge()) return $persistentStore.read(key);
    if (isQuanX()) return $prefs.valueForKey(key);
  };
  setdata = (key, val) => {
    if (isSurge()) return $persistentStore.write(key, val);
    if (isQuanX()) return $prefs.setValueForKey(key, val);
  };
  msg = (title, subtitle, body) => {
    if (isSurge()) $notification.post(title, subtitle, body);
    if (isQuanX()) $notify(title, subtitle, body);
  };
  log = (message) => console.log(message);
  fetch = (request, callback) => {
    if (isSurge()) {
      $httpClient.get(request, callback);
    }
    if (isQuanX()) {
      request.method = request.method || 'GET';
      $task.fetch(request).then((resp) => {
        callback(null, { statusCode: resp.statusCode }, resp.body);
      }, (err) => callback(err.error, null, null));
    }
  };
  done = (value = {}) => {
    if (isSurge()) $done(value);
    if (isQuanX()) $done(value);
  };
  return { isSurge, isQuanX, msg, log, getdata, setdata, fetch, done };
}