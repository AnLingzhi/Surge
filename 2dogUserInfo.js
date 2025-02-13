const chavy = init();
const KEY_USERS = '2dog_users';

function processResponse() {
  try {
    const body = JSON.parse($response.body);
    if (body.success && body.data && body.data.data && body.data.data.userInfo) {
      const userInfo = body.data.data.userInfo;
      const user = {
        uid: userInfo.basicinfo.uid,
        userId: userInfo.userId,
        gender: userInfo.basicinfo.gender,
        nickname: userInfo.basicinfo.nickname,
        avatarInfo: {
          origin: {
            url: userInfo.basicinfo.avatarInfo.origin.url,
          },
          thumb: {
            url: userInfo.basicinfo.avatarInfo.thumb.url,
          }
        },
        tags: [
          userInfo.basicinfo.birthYear,
          userInfo.basicinfo.height,
          userInfo.basicinfo.weight,
        ],
        heartbeatStatus: userInfo.heartbeatStatus,
        visitedTime: new Date().getTime(),
      };
      
      // 获取现有用户列表
      let users = [];
      try {
        users = JSON.parse(chavy.getdata(KEY_USERS) || '[]');
      } catch (e) {
        users = [];
      }
      
      // 检查是否已存在该用户
      const index = users.findIndex(u => u.uid === user.uid);
      if (index === -1) {
        users.push(user);
      } else {
        users[index] = user;
      }
      
      // 保存更新后的列表
      chavy.setdata(KEY_USERS, JSON.stringify(users));
      
      // 发送通知
      chavy.msg('二狗用户信息', '保存成功', `已保存用户: ${user.nickname}`);
    }
  } catch (e) {
    console.log('处理响应出错:', e);
  }
  
  // 返回原始响应
  return $response.body;
}

function handleClearUserList() {
  chavy.setdata(KEY_USERS, '[]');
  chavy.msg("清空用户列表", "成功", "用户列表已清空。");
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
  // 检查是否点击了 "清空用户列表" 按钮
  if (getdata('clear_user_list') === '清空') {
    setdata('','clear_user_list'); // 重置按钮状态，防止重复触发
    handleClearUserList();
  }
  return { isSurge, isQuanX, msg, log, getdata, setdata, done };
}

// 处理响应并返回
$done({body: processResponse()}); 