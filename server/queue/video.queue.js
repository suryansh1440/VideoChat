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

// Queue event listeners for logging
videoQueue.on("error", (error) => {
  console.error("❌ [QUEUE ERROR]:", error);
});

videoQueue.on("waiting", (jobId) => {
  console.log(`⏳ [QUEUE] Job ${jobId} is waiting to be processed`);
});

videoQueue.on("active", (job) => {
  console.log(`🟢 [QUEUE] Job ${job.id} is now active (videoId: ${job.data?.videoId})`);
});

videoQueue.on("stalled", (jobId) => {
  console.warn(`⚠️  [QUEUE] Job ${jobId} has stalled`);
});

videoQueue.on("progress", (job, progress) => {
  console.log(`📊 [QUEUE] Job ${job.id} progress: ${progress}%`);
});

videoQueue.on("completed", (job) => {
  console.log(`✅ [QUEUE] Job ${job.id} completed successfully (videoId: ${job.data?.videoId})`);
});

videoQueue.on("failed", (job, err) => {
  console.error(`❌ [QUEUE] Job ${job?.id} failed (videoId: ${job?.data?.videoId}):`, err.message);
});

console.log("📦 [QUEUE] Video processing queue initialized");

/**
 * Clean/reset the queue - removes all jobs
 * @param {boolean} removeFailed - Also remove failed jobs
 * @param {boolean} removeCompleted - Also remove completed jobs
 */
export const cleanQueue = async (removeFailed = true, removeCompleted = true) => {
  try {
    console.log("🧹 [QUEUE] Cleaning queue...");
    
    // Get counts before cleaning
    const waiting = await videoQueue.getWaitingCount();
    const active = await videoQueue.getActiveCount();
    const completed = await videoQueue.getCompletedCount();
    const failed = await videoQueue.getFailedCount();
    
    console.log(`📊 [QUEUE] Current status:`);
    console.log(`   - Waiting: ${waiting}`);
    console.log(`   - Active: ${active}`);
    console.log(`   - Completed: ${completed}`);
    console.log(`   - Failed: ${failed}`);
    
    // Clean waiting and active jobs
    await videoQueue.obliterate({ force: true });
    
    // Clean completed jobs if requested
    if (removeCompleted) {
      await videoQueue.clean(0, 1000, 'completed');
    }
    
    // Clean failed jobs if requested
    if (removeFailed) {
      await videoQueue.clean(0, 1000, 'failed');
    }
    
    console.log("✅ [QUEUE] Queue cleaned successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ [QUEUE] Failed to clean queue:", error);
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


