require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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
    return {};
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

const activityRecommendations = {
    '焦虑': [
        '试试 🌿 4-7-8 呼吸法：吸气4秒，屏息7秒，呼气8秒，重复几次。',
        '去 🚶 散散步，感受脚下的地面和周围的空气。',
        '播放一首你喜欢的轻音乐，闭上眼睛专注听3分钟。',
        '给一位朋友发条消息，随便聊聊日常。'
    ],
    '疲惫': [
        '站起来 🧘 伸个懒腰，转动一下脖子和手腕。',
        '喝一杯温水，离开屏幕休息5分钟。',
        '听一首舒缓的白噪音（试试混音台吧）。',
        '做一次简单的肩颈放松：耸肩→后旋→放下，重复5次。'
    ],
    '忧伤': [
        '抱抱你身边的抱枕或毛绒玩具，给自己一点温暖。',
        '写下一件今天让你觉得温暖的小事。',
        '看一段搞笑视频或萌宠合集，让笑容回来。',
        '给过去的自己写一句话：你已经做得很好了。'
    ]
};
const defaultRecommendations = [
    '今天有没有什么小事让你觉得开心？可以跟我分享一下。',
    '保持现在的节奏，你已经很棒了。',
    '需要的时候，记得我在这里陪着你。'
];
function getRecommendation(emotion) {
    let list = activityRecommendations[emotion] || defaultRecommendations;
    return list[Math.floor(Math.random() * list.length)];
}

function analyzeEmotion(text) {
    const negations = ['不', '没', '无', '别', '莫', '勿', '不是', '没有', '并非'];
    const hasNegation = negations.some(neg => text.includes(neg));

    const keywords = {
        '焦虑': ['焦虑', '担心', '害怕', '紧张', '不安', '压力', '烦', '慌', '心慌', '喘不过气'],
        '疲惫': ['累', '疲惫', '无力', '困', '没精神', '疲劳', '困倦', '身体被掏空'],
        '愉悦': ['开心', '快乐', '好', '棒', '高兴', '爽', '幸福', '喜悦', '愉快'],
        '忧伤': ['难过', '伤心', '失落', '哭', '悲伤', '痛苦', '绝望', '委屈', '不开心', '不高兴', '难受'],
        '平静': ['平静', '放松', '安宁', '舒服', '宁静', '平和', '自在']
    };

    const negativeOrder = ['焦虑', '疲惫', '忧伤'];
    for (let emotion of negativeOrder) {
        if (keywords[emotion].some(kw => text.includes(kw))) {
            return emotion;
        }
    }

    for (let emotion of ['愉悦', '平静']) {
        if (keywords[emotion].some(kw => text.includes(kw))) {
            if (hasNegation) {
                if (emotion === '愉悦') return '忧伤';
                if (emotion === '平静') return '焦虑';
            }
            return emotion;
        }
    }

    return '觉察';
}

function getReply(emotion) {
    let list = replyTemplates[emotion] || defaultReplies;
    return list[Math.floor(Math.random() * list.length)];
}

const axios = require('axios');
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;

// ------------------------------
// 首页路由（修复 Cannot GET /）
// ------------------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landc.html'));
});

app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    console.log(`收到用户 ${userId || '匿名'} 的消息: ${message}`);
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: '消息不能为空' });
    }

    try {
        const response = await axios({
            method: 'post',
            url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            headers: {
                'Authorization': `Bearer ${ZHIPU_API_KEY}`,
                'Content-Type': 'application/json'
            },
            data: {
                model: 'glm-4-flash',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个温暖、善解人意的情绪疗愈助手，名叫“栖心岛”。你的任务是与用户进行共情对话，帮助ta释放压力、获得平静。回复应简短、自然、有温度，一般不超过两句话。'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.8,
                max_tokens: 150
            }
        });

        const aiReply = response.data.choices[0].message.content;
        const emotion = analyzeEmotion(message);
        let recommendation = null;
        if (['焦虑', '疲惫', '忧伤'].includes(emotion)) {
            recommendation = getRecommendation(emotion);
        }

        res.json({ reply: aiReply, emotion, recommendation });
    } catch (error) {
        console.error('智谱API调用失败:', error.response?.data || error.message);
        const emotion = analyzeEmotion(message);
        const reply = getReply(emotion);
        let recommendation = null;
        if (['焦虑', '疲惫', '忧伤'].includes(emotion)) {
            recommendation = getRecommendation(emotion);
        }
        res.json({ reply, emotion });
    }
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
    res.json({ success: true });
});

// ==================== 启动服务器（Vercel 兼容版） ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ 服务已启动`);
});