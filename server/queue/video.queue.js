import { Queue } from "bullmq";
import { config } from "dotenv";

config();

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {})
};

const videoQueue = new Queue("video-processing", {
  connection
});

videoQueue.on("error", (error) => {
  console.error("Queue error:", error);
});

videoQueue.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

/**
 * Clean/reset the queue - removes all jobs
 * @param {boolean} removeFailed - Also remove failed jobs
 * @param {boolean} removeCompleted - Also remove completed jobs
 */
export const cleanQueue = async (removeFailed = true, removeCompleted = true) => {
  try {
    await videoQueue.obliterate({ force: true });
    
    if (removeCompleted) {
      await videoQueue.clean(0, 1000, 'completed');
    }
    
    if (removeFailed) {
      await videoQueue.clean(0, 1000, 'failed');
    }
    
    return { success: true };
  } catch (error) {
    console.error("Failed to clean queue:", error);
    throw error;
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async () => {
  try {
    const waiting = await videoQueue.getWaitingCount();
    const active = await videoQueue.getActiveCount();
    const completed = await videoQueue.getCompletedCount();
    const failed = await videoQueue.getFailedCount();
    
    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed
    };
  } catch (error) {
    console.error("❌ [QUEUE] Failed to get queue stats:", error);
    throw error;
  }
};

export default videoQueue;


