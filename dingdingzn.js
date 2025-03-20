// Surge 模块 - 捕获 Authorization
/*
[Script]
http-response ^https:\/\/api\.dingdingzn\.com\/uapp\/ev\/charging\/order\/equipment requires-body=1,max-size=0,script-path=https://your-server.com/surge_auth.js

[MITM]
hostname = api.dingdingzn.com
*/

const chavy = init();

if ($request && $request.headers) {
    const authHeader = $request.headers['Authorization'];
    if (authHeader) {
        chavy.write(authHeader, 'DingDingZN_Authorization');
        chavy.msg('🔋 授权信息已捕获', 'Authorization Token 已存储', '');
    }
}

chavy.done();

function init() {
    const isSurge = typeof $httpClient !== 'undefined';
    const isQuanX = typeof $task !== 'undefined';
    const getdata = (key) => (isSurge ? $persistentStore.read(key) : $prefs.valueForKey(key));
    const setdata = (key, val) => (isSurge ? $persistentStore.write(val, key) : $prefs.setValueForKey(val, key));
    const msg = (title, subtitle, body) => {
        if (isSurge) $notification.post(title, subtitle, body);
        if (isQuanX) $notify(title, subtitle, body);
    };
    const log = (message) => console.log(message);

    return { isSurge, isQuanX, getdata, setdata, msg, log, done: () => $done({}) };
}