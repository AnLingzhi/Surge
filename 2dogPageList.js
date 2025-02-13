const chavy = init();
const KEY_USERS = '2dog_users';

function processResponse() {
    let body = $response.body;
    try {
        const userListFromBoxJS = JSON.parse(chavy.getdata(KEY_USERS) || '[]');
        let pageListBody = JSON.parse(body);

        if (pageListBody.success && pageListBody.data && pageListBody.data.records) {
            pageListBody.data.records = pageListBody.data.records.map(record => {
                const matchedUser = userListFromBoxJS.find(user => user.uid !== null);
                if (matchedUser) {
                    return {
                        ...record,
                        ...matchedUser,
                    };
                }
                return record; // 如果 BoxJS 中没有匹配的用户信息，则返回原始 record
            });
            body = JSON.stringify(pageListBody);
        }
    } catch (e) {
        console.log('处理 pagelist 响应出错:', e);
    }
    return body;
}


function init() {
    isSurge = () => {
        return undefined === this.$httpClient ? false : true;
    };
    isQuanX = () => {
        return undefined === this.$task ? false : true;
    };
    getdata = (key) => {
        if (isSurge()) return $persistentStore.read(key);
        if (isQuanX()) return $prefs.valueForKey(key);
    };
    setdata = (key, val) => {
        if (isSurge()) return $persistentStore.write(val, key);
        if (isQuanX()) return $prefs.setValueForKey(val, key);
    };
    msg = (title, subtitle, body) => {
        if (isSurge()) $notification.post(title, subtitle, body);
        if (isQuanX()) $notify(title, subtitle, body);
    };
    log = (message) => console.log(message);
    done = (value = {}) => {
        $done(value);
    };
    return { isSurge, isQuanX, msg, log, getdata, setdata, done };
}

// 处理响应并返回
$done({ body: processResponse() }); 