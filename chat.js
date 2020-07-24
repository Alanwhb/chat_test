let url = 'http://127.0.0.1:8000';


// 获取cookie
function getCookie(name){
    var cookieName = encodeURIComponent(name) + "=",
        cookieStart = document.cookie.indexOf(cookieName),
        cookieValue = null;
    if (cookieStart > -1) {
        var cookieEnd = document.cookie.indexOf(";",cookieStart);
        if (cookieEnd == -1) {
            cookieEnd = document.cookie.length;
        }
        cookieValue = decodeURIComponent(document.cookie.substring(cookieStart + cookieName.length,cookieEnd));
    }
    return cookieValue;
}
// 设置cookie
function setCookie(name,value,times){
    var cookieText = encodeURIComponent(name) + "=" + encodeURIComponent(value);
    var exp = new Date();
    if (times > 0){
        exp.setTime(exp.getTime() + 30*60*1000);
    }
    else {
        exp.setTime(exp.getTime() + 1);
    }
    cookieText += ";expires=" + exp.toGMTString();    //设置存活时间
    document.cookie = cookieText;
}
// 清除cookie
function clearCookie(name){
    setCookie(name, "", -1);
}


// 创建会议界面
const createchat = {
    methods:{
        async newChat(){
            let chatname = document.getElementById("chat-name").value;
            let membername = document.getElementById("member-name").value;

            console.log(chatname);
            console.log(membername);

            await axios({
                method:'post',
                url: url,
                data:{
                    'chatName': chatname,
                    'memberName': membername,
                },
                headers:{
                    'Content-Type':'application/x-www-form-urlencoded',
                }
            }).then(function (response) {
                UUID = response.data.UUID;
                alert("会议号：" + UUID);
                setCookie(UUID, response.data.sessionID, 1);
                setCookie(response.data.sessionID, membername,1);
            }).catch(function (error) {
                console.log(error);
            });
            // 重定向
            this.$router.push('/' + UUID);
        }
    },

    template: '#create'
};

// 加入会议界面
const joinchat = {
    mounted(){
        this.direct();
    },

    methods: {
        // 根据后台判断决定定向那个界面
        async direct(){
            let flag;   // 标记
            // 利用url获取会议uuid
            let thisUrl = window.location.href;
            let index = thisUrl.lastIndexOf("\/");
            let uuid = thisUrl.substring(index + 1, thisUrl.length);
            // 利用uuid获取sessionid
            let sessionID = getCookie(uuid);

            await axios({
                method:'post',
                url: 'http://127.0.0.1:8000/direct',
                data: {
                    'UUID': uuid,
                    'sessionID': sessionID
                },
                headers: {
                    'Content-Type':'application/x-www-form-urlencoded',
                }
            }).then(function (response) {
                if (response.data.flag === 0){
                    style="display: none;"
                    document.getElementById("chat-interface").style.display = "none";
                    alert("该会议号无效！");
                }
                else if (response.data.flag === 1) { // 进入join界面
                    flag = 1;
                    document.getElementById("joinName").innerHTML = "会议名：" + response.data.chatName;
                }
                else if (response.data.flag === 2) { // 进入chat界面
                    flag = 2;
                    document.getElementById("chatName").innerHTML = response.data.chatName;
                }
            }).catch(function (error) {
                console.log(error);
            });

            if (flag === 1){
                document.getElementById('join-interface').style.display = "";
                document.getElementById('chat-interface').style.display = "none";
            }
            else if (flag === 2){
                document.getElementById('join-interface').style.display = "none";
                document.getElementById('chat-interface').style.display = "";
            }
        },

        async join(){
            // 利用url获取会议uuid
            let thisUrl = window.location.href;
            let index = thisUrl.lastIndexOf("\/");
            let uuid = thisUrl.substring(index + 1, thisUrl.length);

            let memberName = document.getElementById("member-join").value;
            await axios({
                method: 'post',
                url: 'http://127.0.0.1:8000/join',
                data:{
                    'UUID': uuid,
                    'memberName': memberName
                },
                headers:{
                    'Content-Type':'application/x-www-form-urlencoded',
                }
            }).then(function (response) {
                document.getElementById("chatName").innerHTML = response.data.chatName;
                setCookie(uuid, response.data.sessionID, 1);
                setCookie(response.data.sessionID, memberName, 1);
            }).catch(function (error) {
                console.log(error);
            });
            // 转换界面
            document.getElementById('join-interface').style.display = "none";
            document.getElementById('chat-interface').style.display = "";
        }
    },

    template: '#join'
};

var timerId1 = 0;
var timerId2 = 0
// 会议界面
const chat = {
    mounted(){  // 加载本界面时开始轮询
        // 轮询：每秒查询会议成员
        timerId1 =  window.setInterval(this.getMembers, 1000);
        // 轮询：查询新消息
        timerId2 = window.setInterval(this.getMessage, 500);
    },

    beforeDestroy() { // 离开界面时关掉轮询
        window.clearInterval(timerId1);
        window.clearInterval(timerId2);
        // alert("before destory!");
    },

    methods: {
        // 发送消息
        sendMsg(){
            // 利用url获取会议uuid
            let thisUrl = window.location.href;
            let index = thisUrl.lastIndexOf("\/");
            let uuid = thisUrl.substring(index + 1, thisUrl.length);
            let message = document.getElementById("message-send").value;
            document.getElementById("message-send").value = "";
            // 判断消息是否为空
            if (message !== ""){
                let sessionID = getCookie(uuid);
                axios({
                    method: 'post',
                    url: 'http://127.0.0.1:8000/sendmsg',
                    data: {
                        'UUID': uuid,
                        'sessionID': sessionID,
                        'memberName': getCookie(sessionID),
                        'message': message
                    }
                }).then(function (response) {
                    console.log(response)
                }).catch(function (error) {
                    console.log(error);
                })
            }
        },

        // 退出会议
        async leave(){
            let thisUrl = window.location.href;
            let index = thisUrl.lastIndexOf("\/");
            let uuid = thisUrl.substring(index + 1, thisUrl.length);
            let sessionID = getCookie(uuid)
            await axios({
                method: 'post',
                url: 'http://127.0.0.1:8000/leave',
                data: {
                    'UUID': uuid,
                    'sessionID': sessionID
                }
            }).then(function (response) {
                clearCookie(uuid);
                clearCookie(sessionID);
                document.getElementById('join-interface').style.display = "";
                document.getElementById('chat-interface').style.display = "none";
            }).catch(function (error) {
                console.log(error);
            })

            this.$router.push('/');
        },

        // 向后台请求会议成员列表
        async getMembers() {
            // 利用url获取会议uuid
            let thisUrl = window.location.href;
            let index = thisUrl.lastIndexOf("\/");
            let uuid = thisUrl.substring(index + 1, thisUrl.length);
            let members = "";
            axios({
                method: 'post',
                url: 'http://127.0.0.1:8000/getMembers',
                data: {
                    'UUID': uuid
                }
            }).then(function (response) {
                for (m in response.data.members) {
                    members += "<li style='font-size:x-large'>" + response.data.members[m] + "</li>";
                }
                document.getElementById("member-list").innerHTML = members;
            }).catch(function (error) {
                console.log(error);
            })
        },

        // 向后台获取聊天信息
        async getMessage() {
            let thisUrl = window.location.href;
            let index = thisUrl.lastIndexOf("\/");
            let uuid = thisUrl.substring(index + 1, thisUrl.length);
            let sessionID = getCookie(uuid);
            let newMsgs = "";
            axios({
                method: 'post',
                url: 'http://127.0.0.1:8000/getmsg',
                data: {
                    'UUID': uuid,
                    'sessionID': sessionID
                }
            }).then(function (response) {
                // console.log(response.data.newMsgs)
                // 返回的json格式为字典列表，[{'id': id, 'name': name, 'content': content},
                //                          {'id': id, 'name': name, 'content': content}, ...]
                for(newMsg in response.data.newMsgs){
                    let tempMsg = response.data.newMsgs[newMsg];
                    // 若该消息是本人发的，使用不同格式
                    if (sessionID === tempMsg['sessionID']) {
                        newMsgs += "<h5 style='text-align:right;color: aquamarine; font-weight:bold'>" + tempMsg['senderName'] + "</h5>";
                        newMsgs += "<h4 style='text-align:right'>" + tempMsg['content'] + "</h4>";
                    }
                    else {
                        newMsgs += "<h5 style='text-align:left;color: aqua; font-weight:bold'>" + tempMsg['senderName'] + "</h5>";
                        newMsgs += "<h4 style='text-align:left'>" + tempMsg['content'] + "</h4>";
                    }
                }
                document.getElementById('chat-window').innerHTML += newMsgs;
            }).catch(function (error) {
                console.log(error);
            })
        }

    },

    template: '#chat'
};

// 设置界面模板路由
const router = new VueRouter({
    routes:[
        {   path:'/',
            component: createchat
        },
        {
            path:'/:id',
            components: {
                before: joinchat,
                after: chat
            }
        }
    ]
});

new Vue({
    el:'#app',
    router,
});
