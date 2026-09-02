/**
 * Surge/QuanX 响应处理脚本：heartbeatMeList
 *
 * 作用：
 * 1. 从请求头中提取 token
 * 2. 遍历响应数据中的所有用户 uid
 * 3. 针对每个 uid 请求 preUnlockCheck 接口获取解锁后的图片 URL
 * 4. 替换原响应中对应的 avatarInfo.thumb.url 后返回修改后的响应体
 */

function replaceUrlSuffix(url) {
  return url.replace(/-img\w*/g, '-commwater');
}

function extractUid(url) {
  // 使用正则表达式匹配数字部分
  const match = url.match(/\/(\d{19})\//);
  if (match) {
    const number = match[1]; // 获取匹配到的19位数字
    return number.slice(-11); // 截取最后11位
  }
  return null; // 如果没有匹配到数字，返回 null
}

const chavy = init();

// 从请求头中提取 token
let token = $request.headers["token"] || "";

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

// 提取所有用户对象（数据结构：data.records -> 每条记录中有 userInfos 数组）
let users = [];
if (body.data && Array.isArray(body.data.userInfos)) {
  body.data.userInfos.forEach(user => {
    if (user.userInfos) {
			  user.userInfos.unlockProgress = 1;
        users.push(user.userInfos);
      }
  });
}

// 若无用户，则直接返回响应
if (users.length === 0) {
  chavy.done({ body: JSON.stringify(body) });
}

let finished = 0;

// 针对每个用户发起预解锁请求，更新图片 URL
users.forEach(user => {
  let uid = user.uid;
  let encodedUid = encodeURIComponent(uid);
  let url = `https://mini.tuodan.tech/jstd-doger/app/heartbeat/v2/preUnlockCheck?toUid=${encodedUid}&version=2`;

  // 手动复制需要的请求头，并添加当前时间戳
  let reqHeaders = {
    "Host": $request.headers["Host"],
    "Connection": $request.headers["Connection"],
    "d-sign": $request.headers["d-sign"],
    "content-type": $request.headers["content-type"],
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

  let myRequest = {
    url: url,
    method: "GET",
    headers: reqHeaders,
    body: ""
  };

  chavy.fetch(myRequest, (err, response, data) => {
    finished++;
    let status = response.statusCode || response.status;
    if (!err && status === 200) {
      try {
        let json = JSON.parse(data);
        // 若接口返回成功且存在 avatarInfo.thumb.url，则更新对应的图片地址
        if (
          json.success &&
          json.data &&
          json.data.avatarInfo &&
          json.data.avatarInfo.thumb &&
          json.data.avatarInfo.thumb.url
        ) {
					uid = extractUid(json.data.avatarInfo.thumb.url);

					user.uid = uid;

					user.nickname = json.data.nickname;
          user.avatarInfo.thumb.url = replaceUrlSuffix(json.data.avatarInfo.thumb.url);
					user.avatarInfo.origin.url = user.avatarInfo.thumb.url;
        }
      } catch (e) {
        // 解析或其他错误，保持原数据不变
      }
    }
    // 所有用户请求完成后返回修改后的响应体
    if (finished === users.length) {
      chavy.done({ body: JSON.stringify(body) });
    }
  });
});

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