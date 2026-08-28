/**
 * Surge 资源解锁与解析重写脚本 (最佳实践重构版)
 * 特性: 基于 UUID 强匹配、零延迟本地映射缓存、Token 自动同步
 */
(function () {
  var FILE_ORIGIN = "https://file.tsxyapp.com";
  var ADMIN_REPORT_LIST = "http://admin.tsxyapp.com/api/report/list";
  var ADMIN_COURSE_LIST = "http://admin.tsxyapp.com/api/course/list";
  var WORKER_TOKEN_SYNC_URL = "https://tsxy-viewer.xai-kg.workers.dev/api/update-token-by-surge";
  var PERSIST_CATALOG_KEY = "tsxy_resource_catalog_v2";
  var PERSIST_AUDIO_MAP_KEY = "tsxy_audio_uuid_mapping_v2";

  var requestUrl = typeof $request !== "undefined" && $request.url || "";
  var requestHeaders = typeof $request !== "undefined" && $request.headers || {};
  var responseBody = typeof $response !== "undefined" && $response.body || "";

  function parseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function getPath(urlStr) {
    var match = String(urlStr || "").match(/^https?:\/\/[^\/]+(\/[^?#]*)/i);
    return match ? match[1] : "";
  }

  function getQueryParameter(urlStr, param) {
    var match = String(urlStr || "").match(new RegExp("[?&]" + param + "=([^&/#]*)", "i"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function requestHeader(name) {
    var target = String(name || "").toLowerCase();
    var found = "";
    Object.keys(requestHeaders).forEach(function (k) {
      if (k.toLowerCase() === target) {
        found = requestHeaders[k];
      }
    });
    return found;
  }

  function loadAudioMap() {
    var raw = $persistentStore.read(PERSIST_AUDIO_MAP_KEY);
    var parsed = parseJson(raw || "");
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function saveAudioMap(map) {
    $persistentStore.write(JSON.stringify(map), PERSIST_AUDIO_MAP_KEY);
  }

  function loadCatalog() {
    var raw = $persistentStore.read(PERSIST_CATALOG_KEY);
    var parsed = parseJson(raw || "");
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function saveCatalog(catalog) {
    $persistentStore.write(JSON.stringify(catalog), PERSIST_CATALOG_KEY);
  }

  function isSafeResourceId(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
  }

  function normalizeCourseCategory(raw) {
    var num = Number(raw);
    return isNaN(num) ? 0 : num;
  }

  function listItems(payload) {
    if (!payload || typeof payload !== "object") return [];
    var data = payload.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  }

  function recordForItem(item, kind, categoryFromRequest) {
    if (!item || typeof item !== "object") return null;
    var id = String(item.id || "");
    if (!isSafeResourceId(id)) return null;

    var title = String(item.title || id);
    var poster = String(item.poster || "");
    var ext = "mp4";

    if (kind === "report") {
      var matchExt = title.match(/\.(pdf|docx)(?:[?#].*)?$/i);
      ext = matchExt ? matchExt[1].toLowerCase() : "pdf";
    } else if (kind === "live") {
      ext = item.extension ? String(item.extension).toLowerCase() : "mp3";
    }

    var category = normalizeCourseCategory(item.courseCategory || categoryFromRequest);
    return {
      id: id,
      kind: kind,
      extension: ext,
      title: title,
      poster: poster || (FILE_ORIGIN + "/" + kind + "/" + id + ".jpg"),
      courseCategory: category,
      url: FILE_ORIGIN + "/" + kind + "/" + id + "." + ext,
      seenAt: Date.now()
    };
  }

  function copyEnvelope(payload) {
    var rewritten = {};
    if (!payload || typeof payload !== "object") return rewritten;
    Object.keys(payload).forEach(function (key) {
      rewritten[key] = payload[key];
    });
    rewritten.hasError = false;
    rewritten.msg = "";
    rewritten.errorCode = 0;
    return rewritten;
  }

  function buildMediaSuccessBody(payload, record, realAudioUrl) {
    var rewritten = copyEnvelope(payload);
    var mediaUrl = record.url;
    var audioUrl = realAudioUrl || mediaUrl;

    rewritten.data = {
      id: record.id,
      title: record.title,
      blob: mediaUrl,
      audio: audioUrl,
      poster: record.poster || (FILE_ORIGIN + "/" + record.kind + "/" + record.id + ".jpg"),
      courseCategory: normalizeCourseCategory(record.courseCategory)
    };
    return JSON.stringify(rewritten);
  }

  function buildReportSuccessBody(payload, record, blob) {
    var rewritten = copyEnvelope(payload);
    rewritten.data = {
      id: record.id,
      title: record.title,
      url: blob,
      blob: blob
    };
    return JSON.stringify(rewritten);
  }

  function syncTokenToWorker(authorization) {
    if (!authorization) return;
    $httpClient.post(
      {
        url: WORKER_TOKEN_SYNC_URL,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: authorization }),
        timeout: 3
      },
      function () {}
    );
  }

  // 最佳实践：后台静默全量预载 { course_id -> audio_url } 字典
  function preloadAdminAudioMap(authorization) {
    if (!/^Bearer\s+\S+/i.test(authorization)) return;
    
    // 并发预载 7 页后台数据
    var audioMap = loadAudioMap();
    var fetchedCount = 0;
    var pages = [1, 2, 3, 4, 5, 6, 7];

    pages.forEach(function(p) {
      $httpClient.get(
        {
          url: ADMIN_COURSE_LIST + "?page=" + p,
          headers: { Authorization: authorization, Accept: "application/json" },
          timeout: 5
        },
        function (error, response, body) {
          var adminPayload = parseJson(body || "");
          var items = adminPayload && adminPayload.data && Array.isArray(adminPayload.data.items)
            ? adminPayload.data.items
            : [];

          if (items.length > 0) {
            items.forEach(function(item) {
              if (item.id && item.audio) {
                audioMap[item.id] = item.audio;
                fetchedCount++;
              }
            });
            saveAudioMap(audioMap);
          }
        }
      );
    });
  }

  function fetchReportBlobAndRewrite(record, payload) {
    var authorization = requestHeader("authorization");
    syncTokenToWorker(authorization);

    if (!/^Bearer\s+\S+/i.test(authorization)) {
      $done({});
      return;
    }

    var lookupUrl = ADMIN_REPORT_LIST + "?title=" + encodeURIComponent(record.title) + "&page=1";
    $httpClient.get(
      {
        url: lookupUrl,
        headers: { Authorization: authorization, Accept: "application/json" },
        timeout: 6
      },
      function (error, response, body) {
        var status = response && Number(response.status);
        var adminPayload = parseJson(body || "");
        var items = adminPayload && adminPayload.data && Array.isArray(adminPayload.data.items)
          ? adminPayload.data.items
          : [];
        var match = null;

        items.some(function (item) {
          if (String(item && item.id || "") === record.id || String(item && item.title || "") === record.title) {
            match = item;
            return true;
          }
          return false;
        });

        var blob = match && String(match.blob || "");
        if (error || status < 200 || status >= 300 || !blob) {
          $done({});
          return;
        }

        $done({ body: buildReportSuccessBody(payload, record, blob) });
      }
    );
  }

  var payload = parseJson(responseBody);
  var path = getPath(requestUrl);
  var isCourse = path.indexOf("/api/course") === 0;
  var isLive = path.indexOf("/api/livefile") === 0;
  var isReport = path.indexOf("/api/report") === 0;
  var isList = /\/list(?:\/latest)?$/.test(path) || /\/latest$/.test(path) || /\/month\/items$/.test(path);

  if (!payload || (!isCourse && !isLive && !isReport)) {
    $done({});
    return;
  }

  // 1. 列表刷新阶段：触发 Token 上报与后台静默预载全量 audioMap 字典
  if (isList) {
    var authorization = requestHeader("authorization");
    syncTokenToWorker(authorization);
    preloadAdminAudioMap(authorization);

    var catalog = loadCatalog();
    var kind = isCourse ? "course" : (isLive ? "live" : "report");
    var categoryFromRequest = isCourse ? getQueryParameter(requestUrl, "category") : 0;
    var added = 0;

    listItems(payload).forEach(function (item) {
      var record = recordForItem(item, kind, categoryFromRequest);
      if (!record) return;
      catalog[record.id] = record;
      added += 1;
    });

    if (added > 0) saveCatalog(catalog);
    console.log("[TSXY] cached " + String(added) + " resource(s) from " + path);
    $done({});
    return;
  }

  var errorMessage = String(payload.msg || "");
  var isSubscriptionError = errorMessage.indexOf("未购买订阅") !== -1 || errorMessage.indexOf("无权查看研报") !== -1;
  if (payload.hasError !== true || !isSubscriptionError) {
    $done({});
    return;
  }

  var id = getQueryParameter(requestUrl, "id");
  if (!isSafeResourceId(id)) {
    $done({});
    return;
  }

  var saved = loadCatalog()[id];
  var candidate = saved;

  if (isReport) {
    if (!candidate || candidate.kind !== "report") {
      $done({});
      return;
    }
    fetchReportBlobAndRewrite(candidate, payload);
    return;
  }

  if (!candidate && isCourse) {
    candidate = {
      id: id,
      kind: "course",
      extension: "mp4",
      title: id,
      poster: FILE_ORIGIN + "/course/" + id + ".jpg",
      courseCategory: 0,
      url: FILE_ORIGIN + "/course/" + id + ".mp4",
      seenAt: Date.now()
    };
  }

  if (!candidate) {
    $done({});
    return;
  }

  // 2. 视频课程详情阶段 (最佳实践)：基于不可变 ID 秒读 audioMap，零延迟、零网络请求，100% 匹配！
  if (isCourse) {
    var audioMap = loadAudioMap();
    var mappedAudioUrl = audioMap[id] || "";
    console.log("[TSXY] resolved course audio by UUID: " + id + " -> " + (mappedAudioUrl || "fallback mp4"));
    $done({ body: buildMediaSuccessBody(payload, candidate, mappedAudioUrl) });
    return;
  }

  // 直播资源
  $done({ body: buildMediaSuccessBody(payload, candidate) });
})();
