import { solveReCaptchaV2 } from '../services/recaptcha.js';
import { solveTurnstile } from '../services/turnstile.js';
import { validateApiKey, validateTrialKey, deductBalance, deductTrialBalance } from '../services/billing.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import workerQueue from '../utils/queue.js';

const tasks = new Map();

// Memory cleanup: Remove completed tasks older than 5 minutes
const TASK_TTL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [taskId, task] of tasks) {
        if ((task.status === 'ready' || task.status === 'failed') &&
            task.completedAt && (now - task.completedAt > TASK_TTL)) {
            tasks.delete(taskId);
        }
    }
}, 60 * 1000); // Run every minute

async function captchaRoutes(fastify, options) {
    // POST /createTask
    fastify.post('/createTask', async (request, reply) => {
        const { clientKey, task } = request.body || {};

        if (!clientKey) {
            return reply.status(401).send({ errorId: 1, errorCode: 'ERROR_KEY_DOES_NOT_EXIST' });
        }

        if (!task || !task.type || !task.websiteURL || !task.websiteKey) {
            return reply.status(400).send({ errorId: 1, errorCode: 'ERROR_MISSING_PARAMETERS' });
        }

        const { valid, user, message } = await validateApiKey(clientKey);
        if (!valid) {
            return reply.status(403).send({ errorId: 1, errorCode: 'ERROR_ACCESS_DENIED', errorDescription: message });
        }

        const taskId = uuidv4();
        tasks.set(taskId, {
            status: 'processing',
            type: task.type,
            userId: user.id,
            createdAt: Date.now()
        });

        // Add to Worker Queue instead of starting immediately
        workerQueue.add({
            id: taskId,
            type: task.type,
            solver: () => {
                if (task.type === 'ReCaptchaV2TaskProxyless') {
                    return solveReCaptchaV2(task.websiteKey, task.websiteURL);
                }
                if (task.type === 'TurnstileTaskProxyless') {
                    return solveTurnstile(task.websiteKey, task.websiteURL);
                }
                throw new Error('Unsupported task type');
            },
            callback: async (err, token) => {
                if (err || !token) {
                    tasks.set(taskId, { status: 'failed', error: err?.message || 'Solver returned null' });
                } else {
                    await deductBalance(user.id, task.type, taskId, clientKey);
                    const solution = task.type === 'TurnstileTaskProxyless'
                        ? { token }
                        : { gRecaptchaResponse: token };
                    tasks.set(taskId, {
                        status: 'ready',
                        solution,
                        completedAt: Date.now()
                    });
                }
            }
        });

        return { errorId: 0, taskId };
    });

    // POST /createTrialTask
    fastify.post('/createTrialTask', async (request, reply) => {
        const { clientKey, task } = request.body || {};

        if (!clientKey) return reply.status(401).send({ errorId: 1, errorCode: 'ERROR_KEY_DOES_NOT_EXIST' });
        if (!task || !task.type || !task.websiteURL || !task.websiteKey) return reply.status(400).send({ errorId: 1, errorCode: 'ERROR_MISSING_PARAMETERS' });

        const { valid, user, message } = await validateTrialKey(clientKey);
        if (!valid) return reply.status(403).send({ errorId: 1, errorCode: 'ERROR_ACCESS_DENIED', errorDescription: message });

        const taskId = uuidv4();
        tasks.set(taskId, { status: 'processing', type: task.type, userId: user.id, createdAt: Date.now() });

        workerQueue.add({
            id: taskId,
            type: task.type,
            solver: () => {
                if (task.type === 'TurnstileTaskProxyless') {
                    return solveTurnstile(task.websiteKey, task.websiteURL);
                }
                return solveReCaptchaV2(task.websiteKey, task.websiteURL);
            },
            callback: async (err, token) => {
                if (err || !token) {
                    tasks.set(taskId, { status: 'failed', error: err?.message || 'Solver returned null' });
                } else {
                    await deductTrialBalance(user.id, task.type, taskId, clientKey);
                    const solution = task.type === 'TurnstileTaskProxyless'
                        ? { token }
                        : { gRecaptchaResponse: token };
                    tasks.set(taskId, { status: 'ready', solution, completedAt: Date.now() });
                }
            }
        });

        return { errorId: 0, taskId };
    });

    // POST /getTaskResult
    fastify.post('/getTaskResult', async (request, reply) => {
        const { taskId } = request.body || {};
        if (!taskId) return reply.status(400).send({ errorId: 1, errorCode: 'ERROR_EMPTY_TASK_ID' });

        const task = tasks.get(taskId);
        if (!task) return reply.status(404).send({ errorId: 1, errorCode: 'ERROR_TASK_NOT_FOUND' });

        const response = { errorId: 0, status: task.status };
        if (task.status === 'ready') response.solution = task.solution;
        else if (task.status === 'failed') response.errorId = 1, response.errorCode = 'ERROR_CAPTCHA_UNSOLVABLE';

        return response;
    });
}

export default captchaRoutes;
