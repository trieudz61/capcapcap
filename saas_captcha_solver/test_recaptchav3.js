/**
 * Test ReCaptcha V3 Solver
 * Usage: node test_recaptchav3.js
 * 
 * Test with Pokemon Center Online:
 * - siteKey: 6Le9HlYqAAAAAJQtQcq3V_tdd73twiM4Rm2wUvn9
 * - URL: https://www.pokemoncenter-online.com/login
 */

const API_URL = 'https://api.recap1s.com';

// ⚠️ Thay bằng API key thật của bạn
const CLIENT_KEY = process.argv[2] || 'YOUR_API_KEY_HERE';

const TASK = {
    type: 'ReCaptchaV3TaskProxyless',
    websiteURL: 'https://www.pokemoncenter-online.com/login',
    websiteKey: '6Le9HlYqAAAAAJQtQcq3V_tdd73twiM4Rm2wUvn9',
    pageAction: 'login',
    minScore: 0.7
};

async function test() {
    console.log('🚀 Testing ReCaptcha V3 Solver...');
    console.log(`   Site: ${TASK.websiteURL}`);
    console.log(`   Key:  ${TASK.websiteKey.substring(0, 20)}...`);
    console.log(`   Action: ${TASK.pageAction}`);
    console.log('');

    // Step 1: Create task
    const startTime = Date.now();
    const createResp = await fetch(`${API_URL}/captcha/createTask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: CLIENT_KEY, task: TASK })
    });
    const createResult = await createResp.json();

    if (createResult.errorId !== 0) {
        console.log('❌ Create task failed:', createResult);
        return;
    }

    console.log(`✅ Task created: ${createResult.taskId}`);

    // Step 2: Poll for result
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));

        const resultResp = await fetch(`${API_URL}/captcha/getTaskResult`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: createResult.taskId })
        });
        const result = await resultResp.json();

        if (result.status === 'ready') {
            const totalTime = Date.now() - startTime;
            console.log(`\n✅ SOLVED in ${totalTime}ms!`);
            console.log(`   Token: ${result.solution.gRecaptchaResponse.substring(0, 60)}...`);
            console.log(`   Token length: ${result.solution.gRecaptchaResponse.length}`);
            if (result.solution.action) {
                console.log(`   Action: ${result.solution.action}`);
            }
            return;
        }

        if (result.status === 'failed') {
            console.log('❌ Solve failed:', result);
            return;
        }

        process.stdout.write(`\r⏳ Polling... attempt ${attempts}/${maxAttempts}`);
    }

    console.log('\n❌ Timeout - task not completed');
}

test().catch(console.error);
