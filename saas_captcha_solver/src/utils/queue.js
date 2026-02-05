import EventEmitter from 'events';
import logger from '../utils/logger.js';

class WorkerQueue extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.workers = 200; // Increased for high throughput
        this.activeWorkers = 0;
    }

    add(task) {
        this.queue.push(task);
        logger.debug(`Task added to queue. Queue size: ${this.queue.length}`);
        this.process();
    }

    async process() {
        if (this.activeWorkers >= this.workers || this.queue.length === 0) {
            return;
        }

        this.activeWorkers++;
        const task = this.queue.shift();

        try {
            logger.info(`Processing task ${task.id} (${task.type})`);
            const result = await task.solver();
            task.callback(null, result);
        } catch (err) {
            logger.error(`Task ${task.id} failed: ${err.message}`);
            task.callback(err);
        } finally {
            this.activeWorkers--;
            this.process();
        }
    }
}

export default new WorkerQueue();
