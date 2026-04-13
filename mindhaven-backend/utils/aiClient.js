require('dotenv').config();

async function getAIResponse(userMessage) {
    if (!process.env.ZHIPU_API_KEY) {
        console.warn('⚠️ 未设置 ZHIPU_API_KEY，使用模拟回复');
        return "🌿 我听到了，能再多说一些吗？";
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`
        },
        body: JSON.stringify({
            model: 'glm-4.7-flash',
            messages: [
                {
                    role: 'system',
                    content: '你是一个温暖、共情的树洞，用诗意的语言倾听用户，每次回复不超过50字。'
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            temperature: 0.8,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API 错误:', errorText);
        throw new Error(`AI 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

module.exports = { getAIResponse };