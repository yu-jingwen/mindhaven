const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 提供静态文件（landc.html 等）

// ==================== 用户数据持久化 ====================
const USERS_FILE = path.join(__dirname, 'users.json');

// 读取用户数据
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('读取用户文件失败:', err);
    }
    return {}; // 格式：{ username: { password, userId } }
}

// 保存用户数据
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (err) {
        console.error('保存用户文件失败:', err);
    }
}

// 初始化用户存储
let users = loadUsers();
// 计算下一个 userId（基于现有最大 userId）
let nextUserId = 2;
for (const u of Object.values(users)) {
    const id = parseInt(u.userId, 10);
    if (!isNaN(id) && id >= nextUserId) nextUserId = id + 1;
}

// ==================== 原有的聊天 API ====================
const emotionKeywords = {
    '焦虑': ['焦虑', '担心', '害怕', '紧张', '不安'],
    '疲惫': ['累', '疲惫', '无力', '困', '没精神'],
    '愉悦': ['开心', '快乐', '好', '棒', '高兴'],
    '忧伤': ['难过', '伤心', '失落', '哭', '悲伤'],
    '平静': ['平静', '放松', '安宁', '舒服', '宁静']
};

const replyTemplates = {
    '焦虑': [
        '我感受到你有些焦虑，这种情绪在提醒你关注自己。要一起做个简短的呼吸练习吗？',
        '焦虑像一阵风，会来也会走。能具体说说是什么让你担心吗？'
    ],
    '疲惫': [
        '听起来你今天很疲惫。记得休息不是偷懒，而是为了重新积蓄力量。',
        '疲惫的时候，允许自己停下来。我这里有一些轻柔的白噪音，也许能帮你放松。'
    ],
    '愉悦': [
        '真为你感到开心！能分享这份喜悦，我也觉得温暖。',
        '愉悦的能量会感染周围的人，谢谢你让我也感受到快乐。'
    ],
    '忧伤': [
        '我在这里陪着你。忧伤也有它的意义，它让我们更懂得珍惜温柔的时刻。',
        '允许自己难过一会儿，我会一直在这里倾听。'
    ],
    '平静': [
        '平静是一种珍贵的内在力量。你此刻的觉察很棒。',
        '就像湖面倒映月光，平静能让我们看清更多东西。'
    ]
};
const defaultReplies = [
    '嗯，我听见了。能再多说一点吗？',
    '谢谢你信任我，把这里当作安全的空间。',
    '你并不孤单，很多情绪说出来就会轻一些。'
];

function analyzeEmotion(text) {
    for (let [emotion, keywords] of Object.entries(emotionKeywords)) {
        if (keywords.some(kw => text.includes(kw))) return emotion;
    }
    return '觉察';
}

function getReply(emotion) {
    let list = replyTemplates[emotion] || defaultReplies;
    return list[Math.floor(Math.random() * list.length)];
}

app.post('/api/chat', (req, res) => {
    const { message, userId } = req.body;
    console.log(`收到用户 ${userId || '匿名'} 的消息: ${message}`);
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: '消息不能为空' });
    }
    const emotion = analyzeEmotion(message);
    const reply = getReply(emotion);
    res.json({ reply, emotion });
});

// ==================== 认证 API（持久化） ====================
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (users[username]) {
        return res.status(409).json({ error: '用户名已存在' });
    }
    const userId = String(nextUserId++);
    users[username] = { password, userId };
    saveUsers(users);
    console.log(`✅ 新用户注册: ${username} (ID: ${userId})`);
    res.json({ success: true, userId, username });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    const user = users[username];
    if (!user || user.password !== password) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }
    console.log(`✅ 用户登录: ${username} (ID: ${user.userId})`);
    res.json({ success: true, userId: user.userId, username });
});

app.get('/api/check-auth', (req, res) => {
    // 仅用于前端检查（可忽略实际验证）
    res.json({ success: true });
});

// ==================== 启动服务器 ====================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ 后端服务已启动: http://localhost:${PORT}`);
    console.log(`📄 访问前端页面: http://localhost:${PORT}/landc.html`);
    console.log(`👥 用户数据已从 ${USERS_FILE} 加载（持久化存储）`);
});