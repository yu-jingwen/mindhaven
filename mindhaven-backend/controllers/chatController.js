const fs = require('fs').promises;
const path = require('path');
const { getAIResponse } = require('../utils/aiClient');

const EMOTIONS_FILE = path.join(__dirname, '../data/emotions.json');
const VOLUMES_FILE = path.join(__dirname, '../data/volumes.json');

// 情绪分析
function analyzeEmotion(text) {
    const keywords = {
        '焦虑': ['焦虑', '担心', '害怕'],
        '疲惫': ['累', '疲惫', '无力'],
        '愉悦': ['开心', '快乐', '好'],
        '忧伤': ['难过', '伤心'],
        '平静': ['平静', '放松']
    };
    for (let [emotion, words] of Object.entries(keywords)) {
        if (words.some(w => text.includes(w))) return emotion;
    }
    return '觉察';
}

// 读取情绪数据
async function getEmotionsData() {
    try {
        const data = await fs.readFile(EMOTIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// 保存情绪数据
async function saveEmotionsData(data) {
    await fs.writeFile(EMOTIONS_FILE, JSON.stringify(data, null, 2));
}

// 读取音量数据
async function getVolumesData() {
    try {
        const data = await fs.readFile(VOLUMES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

// 保存音量数据
async function saveVolumesData(data) {
    await fs.writeFile(VOLUMES_FILE, JSON.stringify(data, null, 2));
}

// 发送消息（调用 AI 并记录情绪）
exports.sendMessage = async (req, res) => {
    const { message, userId = '1' } = req.body;
    if (!message) return res.status(400).json({ error: '消息不能为空' });

    try {
        const aiReply = await getAIResponse(message);
        const emotion = analyzeEmotion(message);
        const emotions = await getEmotionsData();
        emotions.push({
            user_id: userId,
            emotion,
            message: message.slice(0, 100),
            date: new Date().toISOString().split('T')[0]
        });
        await saveEmotionsData(emotions);

        res.json({
            reply: aiReply,
            emotion: emotion
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '服务器错误' });
    }
};

// 获取用户最近情绪记录
exports.getEmotions = async (req, res) => {
    const userId = req.params.userId;
    const emotions = await getEmotionsData();
    const userEmotions = emotions.filter(e => e.user_id === userId).slice(-7);
    res.json(userEmotions);
};

// 获取用户音量偏好
exports.getVolumes = async (req, res) => {
    const userId = req.params.userId;
    const volumes = await getVolumesData();
    const defaultVolumes = { rain: 45, fire: 30, birds: 20, waves: 35 };
    res.json(volumes[userId] || defaultVolumes);
};

// 保存用户音量偏好
exports.saveVolumes = async (req, res) => {
    const userId = req.params.userId;
    const { rain, fire, birds, waves } = req.body;
    const volumes = await getVolumesData();
    volumes[userId] = { rain, fire, birds, waves };
    await saveVolumesData(volumes);
    res.json({ success: true });
};