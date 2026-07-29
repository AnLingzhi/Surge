/*
 * TSXY resource viewer for Surge iOS.
 *
 * The script observes list responses and stores non-sensitive resource
 * metadata. When a detail request is rejected only because the subscription
 * is missing, it validates the public resource before returning the exact
 * success fields consumed by the mini-program player/document viewer.
 */

(function () {
  "use strict";

  var STORE_KEY = "tsxy_resource_catalog_v3";
  var FILE_ORIGIN = "https://file.tsxyapp.com";
  var ADMIN_REPORT_LIST = "http://admin.tsxyapp.com/api/report/list";
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

  function documentExtension(value) {
    var match = String(value || "").match(/\.(pdf|docx)(?:[?#].*)?$/i);
    return match ? match[1].toLowerCase() : "";
  }

  function recordForItem(item, kind, categoryFromRequest) {
    var id = String(item && item.id || "");
    if (!isSafeResourceId(id)) return null;

    var extension;
    if (kind === "course") extension = "mp4";
    else if (kind === "live") extension = liveExtension(item);
    else if (kind === "report") extension = documentExtension(item.title || item.blob || item.url);
    else return null;

    if (kind === "report") {
      if (extension !== "pdf" && extension !== "docx") return null;
      return {
        id: id,
        kind: kind,
        extension: extension,
        title: normalizeTitle(item.title, id + "." + extension),
        url: "",
        seenAt: Date.now()
      };
    }

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

  function requestHeader(wantedName) {
    return headerValue($request && $request.headers, wantedName);
  }

  function copyEnvelope(payload) {
    var rewritten = {};
    Object.keys(payload).forEach(function (key) {
      rewritten[key] = payload[key];
    });
    rewritten.hasError = false;
    rewritten.msg = "";
    rewritten.errorCode = 0;
    return rewritten;
  }

  function buildMediaSuccessBody(payload, record) {
    var rewritten = copyEnvelope(payload);
    rewritten.data = {
      id: record.id,
      title: record.title,
      blob: record.url,
      poster: record.poster || FILE_ORIGIN + "/" + record.kind + "/" + record.id + ".jpg",
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
          $done({ body: buildMediaSuccessBody(payload, record) });
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

  function isSafeReportBlob(value) {
    return new RegExp(
      "^" + FILE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "/report/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:pdf|docx)(?:[?#].*)?$",
      "i"
    ).test(String(value || ""));
  }

  function validateReportAndRewrite(record, blob, payload) {
    $httpClient.head(
      {
        url: blob,
        timeout: 6,
        "auto-cookie": false,
        "auto-redirect": true
      },
      function (error, response) {
        var status = response && Number(response.status);
        var contentType = headerValue(response && response.headers, "content-type");
        var isPdf = record.extension === "pdf" && /^application\/pdf(?:;|$)/i.test(contentType);
        var isDocx = record.extension === "docx" && (
          /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document(?:;|$)/i.test(contentType) ||
          /^application\/octet-stream(?:;|$)/i.test(contentType)
        );

        if (!error && status >= 200 && status < 300 && (isPdf || isDocx)) {
          console.log("[TSXY] rewrote report response with document: " + blob);
          $done({ body: buildReportSuccessBody(payload, record, blob) });
        } else {
          console.log(
            "[TSXY] document validation failed: " + blob +
            " status=" + String(status || 0) +
            " content-type=" + contentType +
            " error=" + String(error || "")
          );
          $done({});
        }
      }
    );
  }

  function fetchReportBlobAndRewrite(record, payload) {
    var authorization = requestHeader("authorization");
    if (!/^Bearer\s+\S+/i.test(authorization)) {
      console.log("[TSXY] no bearer token available for report lookup");
      $done({});
      return;
    }

    var lookupUrl = ADMIN_REPORT_LIST +
      "?title=" + encodeURIComponent(record.title) +
      "&page=1";

    $httpClient.get(
      {
        url: lookupUrl,
        headers: {
          Authorization: authorization,
          Accept: "application/json"
        },
        timeout: 6,
        "auto-cookie": false,
        "auto-redirect": false
      },
      function (error, response, body) {
        var status = response && Number(response.status);
        var adminPayload = parseJson(body || "");
        var items = adminPayload && adminPayload.data && Array.isArray(adminPayload.data.items)
          ? adminPayload.data.items
          : [];
        var match = null;

        items.some(function (item) {
          if (String(item && item.id || "") === record.id) {
            match = item;
            return true;
          }
          return false;
        });

        if (!match) {
          items.some(function (item) {
            if (String(item && item.title || "") === record.title) {
              match = item;
              return true;
            }
            return false;
          });
        }

        var blob = match && String(match.blob || "");
        var blobExtension = documentExtension(blob);
        if (
          error || status < 200 || status >= 300 ||
          !isSafeReportBlob(blob) || blobExtension !== record.extension
        ) {
          console.log(
            "[TSXY] report lookup failed: id=" + record.id +
            " status=" + String(status || 0) +
            " error=" + String(error || "")
          );
          $done({});
          return;
        }

        validateReportAndRewrite(record, blob, payload);
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

  if (isList) {
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
  // var isSubscriptionError = errorMessage.indexOf("未购买订阅") !== -1 || errorMessage.indexOf("无权查看研报") !== -1;
  // if (payload.hasError !== true || !isSubscriptionError) {
  //   $done({});
  //   return;
  // }

  var id = getQueryParameter(requestUrl, "id");
  if (!isSafeResourceId(id)) {
    $done({});
    return;
  }

  var saved = loadCatalog()[id];
  var candidate = saved;

  if (isReport) {
    if (!candidate || candidate.kind !== "report") {
      console.log("[TSXY] no cached report title for: " + id);
      $done({});
      return;
    }
    fetchReportBlobAndRewrite(candidate, payload);
    return;
  }

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
