const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 发送消息（非流式，可后续升级为 SSE）
router.post('/chat', chatController.sendMessage);

// 获取用户情绪历史（需传入 userId，演示中固定为 1）
router.get('/emotions/:userId', chatController.getEmotions);

// 保存/获取音量偏好
router.get('/volumes/:userId', chatController.getVolumes);
router.post('/volumes/:userId', chatController.saveVolumes);

module.exports = router;