/**
 * Surge/QuanX 响应处理脚本：heartbeatMeList
 *
 * 作用：
 * 1. 从请求头中提取 token
 * 2. 遍历响应数据中的所有用户 uid
 * 3. 针对每个 uid 请求 preUnlockCheck 接口获取解锁后的图片 URL
 * 4. 替换原响应中对应的 avatarInfo.thumb.url 后返回修改后的响应体
 */


const chavy = init();

// 如果响应为空，则直接返回
if (!$response.body) {
  chavy.done({});
}

let body = {};
try {
  body = JSON.parse($response.body);
} catch (e) {
  // JSON 解析失败，直接返回原数据
  chavy.done({});
}

if (body.data) {
    if (body.data.userInfo) {
        body.data.userInfo.friendStatusV2 = 3;
    }
}
console.log(body.data.userInfo);

chavy.done({ body: JSON.stringify(body) });

function init() {
  const isSurge = () => typeof $httpClient !== "undefined";
  const isQuanX = () => typeof $task !== "undefined";
  const getdata = (key) => {
    if (isSurge()) return $persistentStore.read(key);
    if (isQuanX()) return $prefs.valueForKey(key);
  };
  const setdata = (key, val) => {
    if (isSurge()) return $persistentStore.write(val, key);
    if (isQuanX()) return $prefs.setValueForKey(val, key);
  };
  const msg = (title, subtitle, body) => {
    if (isSurge()) $notification.post(title, subtitle, body);
    if (isQuanX()) $notify(title, subtitle, body);
  };
  const log = (message) => console.log(message);
  const fetch = (request, callback) => {
    if (isSurge()) {
      $httpClient.get(request, callback);
    } else if (isQuanX()) {
      request.method = request.method || "GET";
      $task.fetch(request).then(
        (resp) => callback(null, { statusCode: resp.statusCode }, resp.body),
        (err) => callback(err.error, null, null)
      );
    }
  };
  const done = (value = {}) => {
    if (isSurge()) $done(value);
    if (isQuanX()) $done(value);
  };
  return { isSurge, isQuanX, getdata, setdata, msg, log, fetch, done };
}