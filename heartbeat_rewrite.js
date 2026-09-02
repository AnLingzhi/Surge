/**
 * Surge/QuanX response handler for heartbeatMeList.
 *
 * Fetches the unlocked avatar for every user with a bounded request pool, then
 * updates the response returned to the app. Surge allows at most 20 concurrent
 * $httpClient requests per script run, so this script deliberately stays below
 * that limit.
 */

const MAX_CONCURRENT = 10;
const REQUEST_TIMEOUT = 5;
const chavy = init();

run();

function run() {
  if (typeof $response === "undefined" || !$response.body) {
    return chavy.done({});
  }

  let body;
  try {
    body = JSON.parse($response.body);
  } catch (error) {
    chavy.log(`[heartbeat_rewrite] invalid response JSON: ${error}`);
    return chavy.done({});
  }

  const users = [];
  if (body.data && Array.isArray(body.data.records)) {
    body.data.records.forEach((record) => {
      if (record && Array.isArray(record.userInfos)) {
        record.userInfos.forEach((user) => {
          if (user && user.uid) users.push(user);
        });
      }
    });
  }

  if (users.length === 0) {
    return chavy.done({ body: JSON.stringify(body) });
  }

  let nextIndex = 0;
  let running = 0;
  let finished = 0;
  let updated = 0;
  let didFinish = false;

  const finishUser = (wasUpdated) => {
    running--;
    finished++;
    if (wasUpdated) updated++;

    if (finished === users.length && !didFinish) {
      didFinish = true;
      chavy.log(
        `[heartbeat_rewrite] finished: total=${users.length}, updated=${updated}, failed=${users.length - updated}`
      );
      return chavy.done({ body: JSON.stringify(body) });
    }

    pump();
  };

  const pump = () => {
    while (running < MAX_CONCURRENT && nextIndex < users.length) {
      const user = users[nextIndex++];
      running++;
      updateUser(user, finishUser);
    }
  };

  pump();
}

function updateUser(user, callback) {
  const uid = user && user.uid;
  if (!uid) return callback(false);

  const url =
    "https://mini.tuodan.tech/jstd-doger/app/heartbeat/v2/preUnlockCheck" +
    `?toUid=${encodeURIComponent(uid)}&version=2`;

  const request = {
    url,
    method: "GET",
    headers: buildRequestHeaders($request.headers || {}),
    timeout: REQUEST_TIMEOUT
  };

  chavy.fetch(request, (error, response, data) => {
    let wasUpdated = false;

    try {
      const status = response && (response.statusCode || response.status);
      if (error || status !== 200) {
        chavy.log(
          `[heartbeat_rewrite] preUnlockCheck failed: status=${status || 0}, error=${error || "none"}`
        );
        return;
      }

      const result = JSON.parse(data);
      const unlockedUrl =
        result &&
        result.success &&
        result.data &&
        result.data.avatarInfo &&
        result.data.avatarInfo.thumb &&
        result.data.avatarInfo.thumb.url;

      if (!unlockedUrl) {
        chavy.log("[heartbeat_rewrite] preUnlockCheck returned no avatar URL");
        return;
      }

      user.avatarInfo = user.avatarInfo || {};
      user.avatarInfo.thumb = user.avatarInfo.thumb || {};
      user.avatarInfo.thumb.url = replaceUrlSuffix(unlockedUrl);
      user.userStatus = 1;
      user.mutualHeartbeat = true;
      user.unlocked = true;

      const extractedUid = extractUid(user.avatarInfo.thumb.url);
      if (extractedUid) user.uid = extractedUid;

      wasUpdated = true;
    } catch (error) {
      chavy.log(`[heartbeat_rewrite] response processing failed: ${error}`);
    } finally {
      callback(wasUpdated);
    }
  });
}

function replaceUrlSuffix(url) {
  return url.replace(/-img\w*/g, "-commwater");
}

function extractUid(url) {
  const match = url.match(/\/(\d{19,})\//);
  return match ? match[1].slice(-11) : null;
}

function getHeader(headers, name) {
  const expected = name.toLowerCase();
  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === expected
  );
  return key ? headers[key] : undefined;
}

function buildRequestHeaders(sourceHeaders) {
  const names = [
    "Host",
    "Connection",
    "d-sign",
    "content-type",
    "d-uuid",
    "d-mini-os",
    "d-appVersion",
    "d-appid",
    "d-v",
    "token",
    "Accept-Encoding",
    "User-Agent",
    "Referer"
  ];

  const headers = {};
  names.forEach((name) => {
    const value = getHeader(sourceHeaders, name);
    if (value !== undefined && value !== null && value !== "") {
      headers[name] = value;
    }
  });
  headers["d-timestamp"] = Date.now().toString();
  return headers;
}

function init() {
  const isSurge = () => typeof $httpClient !== "undefined";
  const isQuanX = () => typeof $task !== "undefined";

  const log = (message) => console.log(message);

  const fetch = (request, callback) => {
    if (isSurge()) {
      $httpClient.get(request, callback);
    } else if (isQuanX()) {
      request.method = request.method || "GET";
      $task.fetch(request).then(
        (response) =>
          callback(
            null,
            { statusCode: response.statusCode || response.status },
            response.body
          ),
        (error) => callback(error.error || String(error), null, null)
      );
    }
  };

  const done = (value = {}) => {
    if (isSurge() || isQuanX()) $done(value);
  };

  return { log, fetch, done };
}
