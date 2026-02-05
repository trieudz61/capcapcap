const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const tasks = new Map();
let cachedV = "7lBY_Ws6HF63jGwdMt3ysk4c"; // Fallback version
let lastVUpdate = 0;

// 1. Kỹ thuật Caching: Lấy phiên bản v của Google mỗi 1 tiếng 1 lần
async function updateGoogleV() {
    const now = Date.now();
    if (now - lastVUpdate > 3600000) { // 1 hour
        try {
            const res = await axios.get('https://www.google.com/recaptcha/api.js');
            const match = res.data.match(/releases\/(.*?)\//);
            if (match) {
                cachedV = match[1];
                lastVUpdate = now;
                console.log(`[Cache] Updated Google V: ${cachedV}`);
            }
        } catch (e) {
            console.error("Failed to update Google V");
        }
    }
    return cachedV;
}

// 2. Logic lấy token cực nhanh (Bất đồng bộ hoàn toàn)
async function fetchRecaptchaToken(siteKey, domain) {
    try {
        const v = await updateGoogleV();
        const cleanDomain = domain.replace(/https?:\/\//, "").split('/')[0];
        const coB64 = Buffer.from(`https://${cleanDomain}:443`).toString('base64').replace(/=/g, '') + '.';

        const url = `https://www.google.com/recaptcha/api2/anchor?k=${siteKey}&co=${coB64}&hl=vi&v=${v}&size=normal&cb=tc`;

        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            timeout: 5000
        });

        const match = response.data.match(/id="recaptcha-token" value="(.*?)"/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

// --- API Endpoints ---

app.post('/createTask', async (req, res) => {
    const { task } = req.body;
    if (!task) return res.status(400).json({ errorId: 1, errorCode: "INVALID_TASK" });

    const taskId = crypto.randomUUID();
    tasks.set(taskId, { status: "processing", createdAt: Date.now() });

    // Node.js xử lý nền cực nhẹ
    fetchRecaptchaToken(task.websiteKey, task.websiteURL).then(token => {
        if (token) {
            tasks.set(taskId, {
                status: "ready",
                solution: { gRecaptchaResponse: token }
            });
        } else {
            tasks.set(taskId, { status: "failed" });
        }
    });

    res.json({ errorId: 0, taskId });
});

app.post('/getTaskResult', (req, res) => {
    const { taskId } = req.body;
    const task = tasks.get(taskId);
    if (!task) return res.status(404).json({ errorId: 1, errorCode: "NOT_FOUND" });

    res.json({ errorId: 0, ...task });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`--- NODE.JS CAPTCHA SOLVER SIÊU TỐC ---`);
    console.log(`Endpoint: http://localhost:${PORT}`);
    updateGoogleV(); // Khởi tạo cache version
});
