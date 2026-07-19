/*
 * TSXY resource viewer for Surge iOS.
 *
 * The script never rewrites the API response. It observes list responses,
 * stores non-sensitive resource metadata, and validates a predictable public
 * media URL when the corresponding detail endpoint is opened. A successful
 * validation produces a tappable Surge notification.
 */

(function () {
  "use strict";

  var STORE_KEY = "tsxy_resource_catalog_v1";
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

  function recordForItem(item, kind) {
    var id = String(item && item.id || "");
    if (!isSafeResourceId(id)) return null;

    var extension = kind === "course" ? "mp4" : liveExtension(item);
    if (extension !== "mp3" && extension !== "mp4") return null;

    return {
      id: id,
      kind: kind,
      extension: extension,
      title: normalizeTitle(item.title, id),
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

  function notifyAvailable(record, contentType) {
    var label = contentType.toLowerCase().indexOf("audio/") === 0 ? "音频" : "视频";
    $notification.post(
      "TSXY " + label + "可用",
      record.title,
      "点击直接播放或下载",
      {
        action: "open-url",
        url: record.url,
        "auto-dismiss": false,
        sound: true
      }
    );
  }

  function validateAndNotify(record) {
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
          notifyAvailable(record, contentType);
          console.log("[TSXY] media available: " + record.url);
        } else {
          console.log(
            "[TSXY] media validation failed: " + record.url +
            " status=" + String(status || 0) +
            " content-type=" + contentType +
            " error=" + String(error || "")
          );
        }
        $done({});
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
    var added = 0;

    listItems(payload).forEach(function (item) {
      var record = recordForItem(item, kind);
      if (!record) return;
      catalog[record.id] = record;
      added += 1;
    });

    if (added > 0) saveCatalog(catalog);
    console.log("[TSXY] cached " + String(added) + " resource(s) from " + path);
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
      url: FILE_ORIGIN + "/course/" + id + ".mp4",
      seenAt: Date.now()
    };
  }

  if (!candidate) {
    console.log("[TSXY] no cached type for live resource: " + id);
    $done({});
    return;
  }

  validateAndNotify(candidate);
})();
