// Surge Script

const loginUrl = `https://api-cdn.feitu.im/ft/gateway/cn/passport/auth/login`;
const signUrl = `https://api-cdn.feitu.im/ft/gateway/cn/user/sign`;
const consumeUrlBase = `https://api-cdn.feitu.im/ft/gateway/cn/user/convertSign?convert_num=`;

const loginMethod = `POST`;
const signMethod = `GET`;
const consumeMethod = `GET`;

const defaultHeaders = {
    'Sec-Fetch-Dest' : `empty`,
    'Connection' : `keep-alive`,
    'Accept-Encoding' : `gzip, deflate, br`,
    'Sec-Fetch-Site' : `cross-site`,
    'Sec-Fetch-Mode' : `cors`,
    'Accept-Language' : `zh-CN,zh-Hans;q=0.9`,
    'Accept' : `*/*`
};

function login(email, password) {
    const loginHeaders = {
        ...defaultHeaders,
        'Content-Type' : `application/json`,
        'Origin' : `https://www.xn--9kq10e0y7h.site`,
        'User-Agent' : `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
        'Authorization' : `null`,
        'Host' : `api-cdn.feitu.im`,
        'Referer' : `https://www.xn--9kq10e0y7h.site/`
    };

    const loginBody = JSON.stringify({ email, password });

    const loginRequest = {
        url: loginUrl,
        method: loginMethod,
        headers: loginHeaders,
        body: loginBody
    };

    return $httpClient.post(loginRequest, (error, response, data) => {
        if (error) {
            console.log(error);
            $done();
        } else {
            const loginData = JSON.parse(data).data;
            sign(loginData.auth_data);
        }
    });
}

function sign(authData) {
    const signHeaders = {
        ...defaultHeaders,
        'Origin' : `https://www.xn--9kq10e0y7h.site`,
        'User-Agent' : `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
        'Authorization' : authData,
        'Host' : `api-cdn.feitu.im`,
        'Referer' : `https://www.xn--9kq10e0y7h.site/`
    };

    const signRequest = {
        url: signUrl,
        method: signMethod,
        headers: signHeaders
    };

    return $httpClient.get(signRequest, (error, response, data) => {
        if (error) {
            console.log(error);
            $done();
        } else {
            const signResult = unicodeToChar(data);
            console.log(response.status + "\n\n" + signResult);
            $notification.post("飞兔云", "签到结果", signResult); // 发送通知

            const signData = JSON.parse(data);
            const total = signData.total || '0.90';

            //consumeTraffic(authData, total);
        }
    });
}

function consumeTraffic(authData, total) {
    const consumeHeaders = {
        ...defaultHeaders,
        'Origin' : `https://feitu.im`,
        'User-Agent' : `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1`,
        'Authorization' : authData,
        'Host' : `api-cdn.feitu.im`,
        'Referer' : `https://feitu.im/`
    };

    const consumeRequest = {
        url: `${consumeUrlBase}${total || '0.90'}`,
        method: consumeMethod,
        headers: consumeHeaders
    };

    return $httpClient.get(consumeRequest, (error, response, data) => {
        if (error) {
            console.log(error);
            $done();
        } else {
            const consumeResult = unicodeToChar(data);
            console.log(response.status + "\n\n" + consumeResult);
            $notification.post("飞兔云", "签到抵消流量结果", consumeResult); // 发送通知
            $done();
        }
    });
}

function unicodeToChar(text) {
    return text.replace(/\\u[\dA-F]{4}/gi, 
           (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)));
}
let username = "x@live.com"
let password = "a"
if (typeof $argument != "undefined") {
    let arg = Object.fromEntries($argument.split("&").map((item) => item.split("=")));
    console.log(JSON.stringify(arg));
    //GeoCountryCode = arg.GeoCountryCode;
    //EnableAlberta = arg.EnableAlberta;
    //GEOAddressCorrectionEnabled = arg.GEOAddressCorrectionEnabled;
    //ShouldEnableLagunaBeach = arg.ShouldEnableLagunaBeach;
    //PedestrianAREnabled = arg.PedestrianAREnabled;
    username = arg.username
    password = arg.password
};

login(username, password);