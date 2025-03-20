const chavy = init();

console.log('充电🔋:');
console.log(request);
 

if ($request && $request.headers) {
    const authHeader = $request.headers['Authorization'];
    if (authHeader) {
        chavy.setdata(authHeader, 'dingdingzn_authorization');
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