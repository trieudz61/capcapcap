import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, '../workers/turnstile_worker.py');
const WORKER_PORT = 9090;

// ============================================
// Worker process management
// ============================================
let workerProcess = null;
let workerReady = false;
let workerStarting = false;

const stats = {
    totalSolves: 0,
    successSolves: 0,
    failedSolves: 0,
    avgSolveTime: 0,
};

async function ensureWorkerRunning() {
    if (workerReady) return;
    if (workerStarting) {
        // Wait for worker to be ready
        for (let i = 0; i < 60; i++) {
            if (workerReady) return;
            await new Promise(r => setTimeout(r, 500));
        }
        throw new Error('Worker startup timeout');
    }

    workerStarting = true;
    logger.info('[Turnstile] Starting persistent worker...');

    return new Promise((resolve, reject) => {
        workerProcess = spawn('python3', [WORKER_PATH, String(WORKER_PORT)], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let resolved = false;

        workerProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();
            try {
                const msg = JSON.parse(line);
                if (msg.status === 'ready' && !resolved) {
                    resolved = true;
                    workerReady = true;
                    workerStarting = false;
                    logger.info(`[Turnstile] ✅ Worker ready on port ${WORKER_PORT}`);
                    resolve();
                }
            } catch (e) {
                // Not JSON, ignore
            }
        });

        workerProcess.stderr.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    logger.info(`[Turnstile Worker] ${line.trim()}`);
                }
            }
        });

        workerProcess.on('exit', (code) => {
            logger.warn(`[Turnstile] Worker exited with code ${code}`);
            workerReady = false;
            workerStarting = false;
            workerProcess = null;
            if (!resolved) {
                resolved = true;
                reject(new Error(`Worker exited with code ${code}`));
            }
        });

        workerProcess.on('error', (err) => {
            workerReady = false;
            workerStarting = false;
            if (!resolved) {
                resolved = true;
                reject(err);
            }
        });

        // Timeout for startup
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                workerStarting = false;
                reject(new Error('Worker startup timeout (30s)'));
            }
        }, 30000);
    });
}

// ============================================
// HTTP call to worker
// ============================================
function callWorker(siteKey, domain) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ siteKey, domain });

        const req = http.request({
            hostname: '127.0.0.1',
            port: WORKER_PORT,
            path: '/solve',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
            timeout: 60000,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ status: 'error', message: `Invalid response: ${data.substring(0, 100)}` });
                }
            });
        });

        req.on('error', (err) => {
            resolve({ status: 'error', message: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'error', message: 'Request timeout' });
        });

        req.write(body);
        req.end();
    });
}

// ============================================
// Public API
// ============================================
export async function solveTurnstile(siteKey, websiteURL) {
    const startTime = Date.now();
    stats.totalSolves++;

    const domain = new URL(websiteURL).hostname;
    logger.info(`[Turnstile] Solving for ${domain}, siteKey: ${siteKey.substring(0, 12)}...`);

    try {
        await ensureWorkerRunning();
        const result = await callWorker(siteKey, domain);

        if (result.status === 'ok' && result.token) {
            const solveTime = Date.now() - startTime;
            stats.successSolves++;
            const total = stats.successSolves;
            stats.avgSolveTime = Math.round((stats.avgSolveTime * (total - 1) + solveTime) / total);
            logger.info(`[Turnstile] ✅ Solved in ${solveTime}ms for ${domain}`);
            return result.token;
        } else {
            stats.failedSolves++;
            logger.warn(`[Turnstile] ❌ Failed for ${domain}: ${result.message || 'unknown'}`);
            return null;
        }
    } catch (err) {
        stats.failedSolves++;
        logger.error(`[Turnstile] Error: ${err.message}`);
        return null;
    }
}

export function getTurnstileStats() {
    return {
        ...stats,
        workerReady,
    };
}

export async function initTurnstilePool() {
    // Lazy init — worker starts on first request
    logger.info('[Turnstile] Persistent worker mode (lazy init)');
}

export async function shutdownTurnstilePool() {
    if (workerProcess) {
        logger.info('[Turnstile] Shutting down worker...');
        workerProcess.kill('SIGTERM');
        workerProcess = null;
        workerReady = false;
    }
}

export default { solveTurnstile, getTurnstileStats, initTurnstilePool, shutdownTurnstilePool };
