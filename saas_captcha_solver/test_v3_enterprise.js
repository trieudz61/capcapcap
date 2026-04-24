/**
 * Test ReCaptcha V3 Enterprise solver
 */
import { solveReCaptchaV3 } from './src/services/recaptchav3.js';

const siteKey = '6Le9HlYqAAAAAJQtQcq3V_tdd73twiM4Rm2wUvn9';
const url = 'https://www.pokemoncenter-online.com/login';
const action = 'login';

console.log('🧪 Test ReCaptcha V3 Enterprise solver...');
console.log(`   Site: ${url}`);
console.log(`   Key:  ${siteKey}`);
console.log(`   Action: ${action}`);
console.log('');

// Test 1: Auto-detect (isEnterprise = null)
console.log('--- Test 1: Auto-detect Enterprise ---');
const start1 = Date.now();
const token1 = await solveReCaptchaV3(siteKey, url, action, 0.7, null);
const time1 = Date.now() - start1;
if (token1) {
    console.log(`✅ Auto-detect: SUCCESS in ${time1}ms`);
    console.log(`   Token: ${token1.substring(0, 60)}...`);
    console.log(`   Length: ${token1.length} chars`);
} else {
    console.log(`❌ Auto-detect: FAILED after ${time1}ms`);
}

console.log('');

// Test 2: Force Enterprise (isEnterprise = true)
console.log('--- Test 2: Force Enterprise ---');
const start2 = Date.now();
const token2 = await solveReCaptchaV3(siteKey, url, action, 0.7, true);
const time2 = Date.now() - start2;
if (token2) {
    console.log(`✅ Enterprise: SUCCESS in ${time2}ms`);
    console.log(`   Token: ${token2.substring(0, 60)}...`);
    console.log(`   Length: ${token2.length} chars`);
} else {
    console.log(`❌ Enterprise: FAILED after ${time2}ms`);
}

console.log('');

// Test 3: Force Standard (isEnterprise = false)
console.log('--- Test 3: Force Standard (api2) ---');
const start3 = Date.now();
const token3 = await solveReCaptchaV3(siteKey, url, action, 0.7, false);
const time3 = Date.now() - start3;
if (token3) {
    console.log(`✅ Standard: SUCCESS in ${time3}ms`);
    console.log(`   Token: ${token3.substring(0, 60)}...`);
    console.log(`   Length: ${token3.length} chars`);
} else {
    console.log(`❌ Standard: FAILED after ${time3}ms`);
}

console.log('\n=== Summary ===');
console.log(`Auto-detect: ${token1 ? '✅' : '❌'} (${time1}ms)`);
console.log(`Enterprise:  ${token2 ? '✅' : '❌'} (${time2}ms)`);
console.log(`Standard:    ${token3 ? '✅' : '❌'} (${time3}ms)`);
