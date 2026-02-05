import axios from 'axios';
import https from 'https';
import logger from '../utils/logger.js';

// HTTP Keep-Alive agent for connection reuse
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    timeout: 30000
});

let cachedV = "7lBY_Ws6HF63jGwdMt3ysk4c";
let lastVUpdate = 0;

// Pre-fetch Google V on module load
(async () => {
    try {
        const res = await axios.get('https://www.google.com/recaptcha/api.js', { httpsAgent });
        const match = res.data.match(/releases\/(.*?)\//);
        if (match) {
            cachedV = match[1];
            lastVUpdate = Date.now();
            logger.info(`[Startup] Pre-fetched Google ReCaptcha version: ${cachedV}`);
        }
    } catch (e) {
        logger.warn(`[Startup] Failed to pre-fetch Google V: ${e.message}`);
    }
})();

export async function updateGoogleV() {
    const now = Date.now();
    if (now - lastVUpdate > 3600000) { // 1 hour
        try {
            const res = await axios.get('https://www.google.com/recaptcha/api.js', { httpsAgent });
            const match = res.data.match(/releases\/(.*?)\//);
            if (match) {
                cachedV = match[1];
                lastVUpdate = now;
                logger.info(`Updated Google ReCaptcha version: ${cachedV}`);
            }
        } catch (e) {
            logger.error(`Failed to update Google ReCaptcha version: ${e.message}`);
        }
    }
    return cachedV;
}

export async function solveReCaptchaV2(siteKey, websiteURL) {
    try {
        const v = await updateGoogleV();
        const domain = new URL(websiteURL).hostname;
        const coB64 = Buffer.from(`https://${domain}:443`).toString('base64').replace(/=/g, '') + '.';

        const url = `https://www.google.com/recaptcha/api2/anchor?k=${siteKey}&co=${coB64}&hl=vi&v=${v}&size=normal&cb=tc`;

        const response = await axios.get(url, {
            httpsAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const match = response.data.match(/id="recaptcha-token" value="(.*?)"/);
        return match ? match[1] : null;
    } catch (e) {
        logger.error(`ReCaptcha Solver Error: ${e.message}`);
        return null;
    }
}
