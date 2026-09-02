const chavy = init();

// 从请求头中提取 token
let token = $request.headers["token"] || "";

// 如果请求体为空，则直接返回
if (!$request.body) {
  chavy.done({});
}

let body = {};
try {
  body = JSON.parse($request.body);
} catch (e) {
  // JSON 解析失败，直接返回原数据
  chavy.done({});
}

// 提取 userUuid
let userUuid = "";
if (body.shareContentUrl) {
  const urlParams = new URLSearchParams(body.shareContentUrl.split('?')[1]);
  userUuid = urlParams.get("userUuid");
}

// 如果没有提取到 userUuid，则直接返回
if (!userUuid) {
  chavy.done({});
}

let reqHeaders = {
  "Host": $request.headers["Host"],
  "Connection": $request.headers["Connection"],
  "d-sign": $request.headers["d-sign"],
  "content-type": "application/json; charset=UTF-8",  // 确保 Content-Type 为 application/json
  "d-uuid": $request.headers["d-uuid"],
  "d-mini-os": $request.headers["d-mini-os"],
  "d-appVersion": $request.headers["d-appVersion"],
  "d-appid": $request.headers["d-appid"],
  "d-v": $request.headers["d-v"],
  "token": token,
  "Accept-Encoding": $request.headers["Accept-Encoding"],
  "User-Agent": $request.headers["User-Agent"],
  "Referer": $request.headers["Referer"],
  "d-timestamp": Date.now().toString()
};

// 构建第二个请求数据
let secondRequest = {
  url: "https://mini.tuodan.tech/jstd-doger/app/heartbeat/v3/buildRelation",
  method: "POST", // 确保发送 POST 请求
  headers: reqHeaders,
  body: JSON.stringify({
    status: 1,
    toUid: userUuid, // 使用提取到的 userUuid 作为 toUid
    scene: 10
  })
};

// 发出第二个 POST 请求
chavy.fetch(secondRequest, (err, response, data) => {
  if (!err && response.statusCode === 200) {
    try {
      let json = JSON.parse(data);
      // 如果第二个请求成功，处理返回的数据（如果需要）
			chavy.msg('🐶', '🐶❤️成功', 'a');
    } catch (e) {
      // 如果解析失败，保持原数据不变
			chavy.msg('🐶', '🐶❤️成功', 'a');
    }
  }

});

secondRequest.url = "https://mini.tuodan.tech/jstd-doger/app/sns/v1/follow";
secondRequest.body = JSON.stringify({
    type: 1,
    uid: userUuid
  })

chavy.fetch(secondRequest, (err, response, data) => {
  if (!err && response.statusCode === 200) {
    try {
      let json = JSON.parse(data);
      // 如果第二个请求成功，处理返回的数据（如果需要）
			chavy.msg('🐶', '🐶❤️成功', 'a');
    } catch (e) {
      // 如果解析失败，保持原数据不变
			chavy.msg('🐶', '🐶❤️成功', 'a');
    }
  }

});

  // 返回原始响应体
	chavy.done({});

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
      $httpClient.post(request, callback);  // 使用 post 请求
    } else if (isQuanX()) {
      request.method = "POST";  // 强制设置为 POST 请求
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
