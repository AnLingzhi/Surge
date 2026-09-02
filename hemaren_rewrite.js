

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
    body.data.Rule.drag = 1;

}

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