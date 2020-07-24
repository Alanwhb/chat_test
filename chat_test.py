from sanic import Sanic
from sanic.response import json, text, redirect, html
from sanic_cors import CORS
import uuid

app = Sanic(__name__)
CORS(app)

# 聊天室类
class Chat:
    def __init__(self, name, cuuid, members):
        self.name = name    # 会议名称
        self.uuid = cuuid   # 会议uuid
        self.members = members  # 会议成员，dict{sessionid: name}

chatList = []   # 聊天室记录

# 新消息类
class Msg:
    def __init__(self, cuuid, sessionId, senderName, content, memToRec):
        self.cuuid = cuuid      # 会议uuid
        self.sessionID = sessionId  # 发送者id
        self.senderName = senderName    # 发送者名
        self.content = content  # 消息内容
        self.memToRec = memToRec    # 未接收此消息的人

msgList = []    # 新消息列表

'''访问首页'''
@app.get('/')
async def index(req):
    htmlf = open('chat.html', 'r', encoding='utf-8')
    htmlcontent = htmlf.read()
    return html(htmlcontent)


'''新建会议'''
@app.route("/", methods=["POST"])
async def create(req):
    chatName = req.json['chatName']
    memberName = req.json['memberName']
    print(chatName, memberName)
    UUID = str(uuid.uuid1())    # 会议uuid
    print(UUID)
    sessionID = str(uuid.uuid4())  # 会议者sessionId,使用不同的uuid函数生成
    print(sessionID)
    # 存储会议
    members = dict()
    members[sessionID] = memberName
    chat = Chat(chatName, UUID, members)
    chatList.append(chat)
    return json({ 'UUID': UUID, 'sessionID': sessionID })


'''判定定向至加入会议界面还是会议界面'''
@app.route("/direct", methods=["POST"])
async def direct(req):
    response = dict()
    print(req.json['UUID'], req.json['sessionID'])
    # 判断uuid是否有效
    for c in chatList:
        # 若uuid有效，返回会议名,并判断sessionID是否已存在
        if req.json['UUID'] == c.uuid:
            response['chatName'] = c.name
            # 若sessionID不存在，应定向至join界面
            if not req.json['sessionID']:
                response['flag'] = 1
            # 若都存在，应定向至chat界面
            else:
                response['flag'] = 2
            break
    else:
        response['flag'] = 0
    print(response)
    return json(response)

'''新用户加入会议'''
@app.route('/join', methods=["POST"])
async def join(req):
    # 分配个新sessionID，保存相关数据并返回
    UUID = req.json['UUID']
    sessionID = str(uuid.uuid4())  # 会议者sessionId,使用不同的uuid函数生成
    chatName = ""
    for c in chatList:
        if UUID == c.uuid:
            chatName = c.name
            c.members[sessionID] = req.json['memberName']
            break
    return json({'chatName': chatName, 'sessionID': sessionID})


'''前端轮询成员列表'''
@app.route('/getMembers', methods=["POST"])
async def getMembers(req):
    response = json({})
    for c in chatList:
        if c.uuid == req.json['UUID']:
            response = json({'members': c.members})
    return response


'''成员发送消息'''
@app.route('/sendmsg', methods=['POST'])
async def sendMsg(req):
    cuuid = req.json["UUID"]
    sessionID = req.json['sessionID']
    senderName = req.json['memberName']
    content = req.json["message"]
    memToRec = []
    for c in chatList:
        if c.uuid == cuuid:
            memToRec = list(c.members.keys())
            break
    msg = Msg(cuuid, sessionID, senderName, content, memToRec)
    print(sessionID, senderName, content)
    msgList.append(msg)
    return text("Success~")


'''客户端轮询新消息列表'''
@app.route('/getmsg', methods=["POST"])
async def getMsgs(req):
    response = []
    uuid = req.json['UUID']
    sessionID = req.json['sessionID']
    # 遍历所有消息列表，判断该消息是否需要接收
    for m in msgList:
        if m.cuuid == uuid:
            if sessionID in m.memToRec:
                newMsg = dict()
                newMsg['sessionID'] = m.sessionID
                newMsg['senderName'] = m.senderName
                newMsg['content'] = m.content
                response.append(newMsg)
                m.memToRec.remove(sessionID)
    return json({'newMsgs': response})


'''离开会议'''
@app.route("/leave", methods=["POST"])
async def leave(req):
    flag = 1
    for c in chatList:
        if c.uuid == req.json['UUID']:
            c.members.pop(req.json['sessionID'])
            if not len(c.members):
                chatList.remove(c)
                flag = 0
            break
    for m in msgList:
        if m.cuuid == req.json['UUID']:
            if not flag:
                msgList.remove(m)
            else:
                if req.json['sessionID'] in m.memToRec:
                    m.memToRec.remove(req.json['sessionID'])

    return text("Success")


app.static('chat.html', 'chat.html')
app.static('chat.js', 'chat.js')
app.static('chat.css', 'chat.css')

if __name__ == '__main__':
    app.run(host="127.0.0.1", port=8000)