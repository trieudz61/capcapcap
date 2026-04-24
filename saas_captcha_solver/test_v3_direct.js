/**
 * Direct test - test solver function directly without API
 */
import { solveReCaptchaV3 } from './src/services/recaptchav3.js';

const siteKey = '6Le9HlYqAAAAAJQtQcq3V_tdd73twiM4Rm2wUvn9';
const url = 'https://www.pokemoncenter-online.com/login';
const action = 'login';

console.log('🧪 Direct test ReCaptcha V3 solver...');
console.log(`   Site: ${url}`);
console.log(`   Key:  ${siteKey}`);
console.log(`   Action: ${action}`);
console.log('');

const startTime = Date.now();

try {
    const token = await solveReCaptchaV3(siteKey, url, action);
    const elapsed = Date.now() - startTime;
    
    if (token) {
        console.log(`\n✅ SUCCESS in ${elapsed}ms!`);
        console.log(`   Token: ${token.substring(0, 80)}...`);
        console.log(`   Length: ${token.length} chars`);
    } else {
        console.log(`\n❌ FAILED after ${elapsed}ms - no token returned`);
    }
} catch (err) {
    console.log(`\n❌ ERROR: ${err.message}`);
}
