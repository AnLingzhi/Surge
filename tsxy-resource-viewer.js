/*
 * TSXY resource viewer for Surge iOS.
 *
 * The script observes list responses and stores non-sensitive resource
 * metadata. When a detail request is rejected only because the subscription
 * is missing, it validates the predictable public media URL and returns the
 * exact success fields consumed by the mini-program player.
 */

(function () {
  "use strict";

  var STORE_KEY = "tsxy_resource_catalog_v2";
  var FILE_ORIGIN = "https://file.tsxyapp.com";
  var MAX_RECORDS = 200;
  var requestUrl = ($request && $request.url) || "";
  var responseBody = ($response && $response.body) || "";

  function parseJson(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  function getPath(url) {
    var match = url.match(/^https?:\/\/[^/]+([^?]*)/i);
    return match ? match[1] : "";
  }

  function getQueryParameter(url, name) {
    var pattern = new RegExp("[?&]" + name + "=([^&#]*)", "i");
    var match = url.match(pattern);
    if (!match) return "";
    try {
      return decodeURIComponent(match[1].replace(/\+/g, " "));
    } catch (error) {
      return match[1];
    }
  }

  function isSafeResourceId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  function normalizeTitle(value, fallback) {
    if (typeof value !== "string" || !value.trim()) return fallback;
    return value.trim().slice(0, 100);
  }

  function normalizeCourseCategory(value) {
    var category = Number(value);
    return Number.isFinite(category) ? category : 0;
  }

  function loadCatalog() {
    var raw = $persistentStore.read(STORE_KEY);
    var parsed = raw ? parseJson(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function saveCatalog(catalog) {
    var records = Object.keys(catalog).map(function (key) {
      return catalog[key];
    });

    records.sort(function (left, right) {
      return (right.seenAt || 0) - (left.seenAt || 0);
    });

    var compact = {};
    records.slice(0, MAX_RECORDS).forEach(function (record) {
      compact[record.id] = record;
    });
    $persistentStore.write(JSON.stringify(compact), STORE_KEY);
  }

  function listItems(payload) {
    if (!payload || !payload.data) return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    return [];
  }

  function liveExtension(item) {
    var type = typeof item.type === "string" ? item.type.toLowerCase() : "";
    if (type === "mp3" || type === "mp4") return type;
    var titleMatch = String(item.title || "").match(/\.(mp3|mp4)$/i);
    return titleMatch ? titleMatch[1].toLowerCase() : "";
  }

  function recordForItem(item, kind, categoryFromRequest) {
    var id = String(item && item.id || "");
    if (!isSafeResourceId(id)) return null;

    var extension = kind === "course" ? "mp4" : liveExtension(item);
    if (extension !== "mp3" && extension !== "mp4") return null;

    return {
      id: id,
      kind: kind,
      extension: extension,
      title: normalizeTitle(item.title, id),
      poster: typeof item.poster === "string" ? item.poster : "",
      courseCategory: kind === "course"
        ? normalizeCourseCategory(item.courseCategory === undefined ? categoryFromRequest : item.courseCategory)
        : 0,
      url: FILE_ORIGIN + "/" + kind + "/" + id + "." + extension,
      seenAt: Date.now()
    };
  }

  function headerValue(headers, wantedName) {
    if (!headers) return "";
    var wanted = wantedName.toLowerCase();
    var keys = Object.keys(headers);
    for (var index = 0; index < keys.length; index += 1) {
      if (keys[index].toLowerCase() === wanted) return String(headers[keys[index]] || "");
    }
    return "";
  }

  function buildSuccessBody(payload, record) {
    var rewritten = {};
    Object.keys(payload).forEach(function (key) {
      rewritten[key] = payload[key];
    });
    rewritten.hasError = false;
    rewritten.msg = "";
    rewritten.errorCode = 0;
    rewritten.data = {
      id: record.id,
      title: record.title,
      blob: record.url,
      poster: record.poster || FILE_ORIGIN + "/" + record.kind + "/" + record.id + ".jpg",
      courseCategory: normalizeCourseCategory(record.courseCategory)
    };
    return JSON.stringify(rewritten);
  }

  function validateAndRewrite(record, payload) {
    $httpClient.head(
      {
        url: record.url,
        timeout: 6,
        "auto-cookie": false,
        "auto-redirect": true
      },
      function (error, response) {
        var status = response && Number(response.status);
        var contentType = headerValue(response && response.headers, "content-type");
        var isMedia = /^(video|audio)\//i.test(contentType);

        if (!error && status >= 200 && status < 300 && isMedia) {
          console.log("[TSXY] rewrote detail response with media: " + record.url);
          $done({ body: buildSuccessBody(payload, record) });
        } else {
          console.log(
            "[TSXY] media validation failed: " + record.url +
            " status=" + String(status || 0) +
            " content-type=" + contentType +
            " error=" + String(error || "")
          );
          $done({});
        }
      }
    );
  }

  var payload = parseJson(responseBody);
  var path = getPath(requestUrl);
  var isCourse = path.indexOf("/api/course") === 0;
  var isLive = path.indexOf("/api/livefile") === 0;
  var isList = /\/list(?:\/latest)?$/.test(path) || /\/latest$/.test(path) || /\/month\/items$/.test(path);

  if (!payload || (!isCourse && !isLive)) {
    $done({});
    return;
  }

  if (isList) {
    var catalog = loadCatalog();
    var kind = isCourse ? "course" : "live";
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

  if (payload.hasError !== true || String(payload.msg || "").indexOf("未购买订阅") === -1) {
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

  // Course video paths are confirmed to use /course/{UUID}.mp4. For live
  // resources the extension comes from the preceding list response, so no
  // unsafe guess is made when the list has not been observed.
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
    console.log("[TSXY] no cached type for live resource: " + id);
    $done({});
    return;
  }

  validateAndRewrite(candidate, payload);
})();
