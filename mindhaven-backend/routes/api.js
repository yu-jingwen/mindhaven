const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 发送消息
router.post('/chat', chatController.sendMessage);

// 获取用户情绪历史
router.get('/emotions/:userId', chatController.getEmotions);

// 保存/获取音量偏好
router.get('/volumes/:userId', chatController.getVolumes);
router.post('/volumes/:userId', chatController.saveVolumes);

module.exports = router;