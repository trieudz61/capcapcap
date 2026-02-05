import axios from 'axios';
import logger from './src/utils/logger.js';
import pkg from './package.json' assert { type: 'json' };

const API_BASE = 'http://127.0.0.1:5000';

async function testHealth() {
    try {
        const res = await axios.get(`${API_BASE}/health`);
        logger.info(`Health check: ${JSON.stringify(res.data)}`);
    } catch (err) {
        logger.error(`Health check failed: ${err.message}`);
    }
}

async function testSolveReCaptcha() {
    logger.info('--- Testing ReCaptcha Solve ---');
    try {
        const createRes = await axios.post(`${API_BASE}/createTask`, {
            clientKey: 'test-api-key',
            task: {
                type: 'ReCaptchaV2TaskProxyless',
                websiteURL: 'https://wechoice.vn',
                websiteKey: '6Lcy6lQsAAAAAOaJyWL_M4hptj4sqWyVzvBmSUio'
            }
        });

        const taskId = createRes.data.taskId;
        logger.info(`Created task: ${taskId}`);

        let attempts = 0;
        while (attempts < 10) {
            const resultRes = await axios.post(`${API_BASE}/getTaskResult`, { taskId });
            const status = resultRes.data.status;
            logger.info(`Status: ${status}`);

            if (status === 'ready') {
                logger.info(`Token received: ${resultRes.data.solution.gRecaptchaResponse.substring(0, 50)}...`);
                return;
            } else if (status === 'failed') {
                logger.error(`Solve failed: ${resultRes.data.errorDescription}`);
                return;
            }

            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }
        logger.warn('Timeout waiting for solve');
    } catch (err) {
        logger.error(`Test failed: ${err.message}`);
    }
}

async function runTests() {
    await testHealth();
    await testSolveReCaptcha();
}

runTests();
