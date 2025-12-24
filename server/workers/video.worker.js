import { Worker } from "bullmq";
import { config } from "dotenv";
import { connectDB } from "../lib/db.js";
import { cleanQueue } from "../queue/video.queue.js";
import Video from "../modals/video.modal.js";
import { generateTranscript } from "../controllers/transcript.controller.js";
import { generateChunks } from "../controllers/chunk.controller.js";

config();

// Check if we should clean queue on startup
const CLEAN_ON_STARTUP = process.env.CLEAN_QUEUE_ON_STARTUP === "true";

// Connect to MongoDB first
console.log("🔄 [WORKER] Connecting to MongoDB...");
connectDB()
  .then(async () => {
    console.log("✅ [WORKER] MongoDB connected successfully");
    
    // Clean queue on startup if enabled
    if (CLEAN_ON_STARTUP) {
      console.log("🧹 [WORKER] Cleaning queue on startup (CLEAN_QUEUE_ON_STARTUP=true)...");
      try {
        await cleanQueue(true, true);
      } catch (error) {
        console.warn("⚠️  [WORKER] Failed to clean queue on startup:", error.message);
      }
    }
    
    startWorker();
  })
  .catch((error) => {
    console.error("❌ [WORKER] Failed to connect to MongoDB:", error);
    process.exit(1);
  });

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {})
};

const QUEUE_NAME = "video-processing";

const processor = async (job) => {
  const { videoId } = job.data || {};
  const startTime = Date.now();

  console.log("\n" + "=".repeat(60));
  console.log(`🚀 [WORKER] Starting job ${job.id} for videoId: ${videoId}`);
  console.log(`⏰ [WORKER] Started at: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  if (!videoId) {
    throw new Error("Job data must include videoId");
  }

  try {
    // Fetch video info
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }
    console.log(`📹 [WORKER] Video found: "${video.title}" (${video.duration}s)`);
    console.log(`🔗 [WORKER] Video URL: ${video.videoUrl}`);

    // Step 1: Generate Transcript
    console.log("\n📝 [WORKER] Step 1/2: Generating transcript...");
    const transcriptStart = Date.now();
    await generateTranscript(videoId);
    const transcriptTime = ((Date.now() - transcriptStart) / 1000).toFixed(2);
    console.log(`✅ [WORKER] Transcript generated successfully (took ${transcriptTime}s)`);

    // Step 2: Generate Chunks
    console.log("\n📦 [WORKER] Step 2/2: Generating chunks...");
    const chunksStart = Date.now();
    await generateChunks(videoId);
    const chunksTime = ((Date.now() - chunksStart) / 1000).toFixed(2);
    console.log(`✅ [WORKER] Chunks generated successfully (took ${chunksTime}s)`);

    // Update video status
    await Video.findByIdAndUpdate(videoId, { status: "ready" });
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(60));
    console.log(`✅ [WORKER] Job ${job.id} completed successfully!`);
    console.log(`⏱️  [WORKER] Total processing time: ${totalTime}s`);
    console.log(`📊 [WORKER] Video status updated to: ready`);
    console.log("=".repeat(60) + "\n");
  } catch (err) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error("\n" + "=".repeat(60));
    console.error(`❌ [WORKER] Job ${job.id} failed after ${totalTime}s`);
    console.error(`💥 [WORKER] Error:`, err.message);
    console.error(`📋 [WORKER] Stack:`, err.stack);
    console.error("=".repeat(60) + "\n");
    
    try {
      await Video.findByIdAndUpdate(videoId, { status: "failed" });
      console.log(`🔄 [WORKER] Video status updated to: failed`);
    } catch (updateErr) {
      console.error(`⚠️  [WORKER] Failed to update video status:`, updateErr.message);
    }
    
    throw err;
  }
};

function startWorker() {
  const videoWorker = new Worker(QUEUE_NAME, processor, { connection });

  // Worker event listeners
  videoWorker.on("ready", () => {
    console.log("\n" + "🎯".repeat(30));
    console.log("✅ [WORKER] Video worker is ready and listening for jobs");
    console.log(`📡 [WORKER] Connected to Redis: ${connection.host}:${connection.port}`);
    console.log(`📋 [WORKER] Queue name: ${QUEUE_NAME}`);
    console.log("🎯".repeat(30) + "\n");
  });

  videoWorker.on("error", (error) => {
    console.error("❌ [WORKER ERROR]:", error);
  });

  videoWorker.on("failed", (job, err) => {
    console.error("\n" + "=".repeat(60));
    console.error(`❌ [WORKER] Job ${job?.id} failed (videoId: ${job?.data?.videoId})`);
    console.error(`💥 [WORKER] Error:`, err.message);
    console.error("=".repeat(60) + "\n");
  });

  videoWorker.on("completed", (job) => {
    console.log(`✅ [WORKER] Job ${job.id} marked as completed (videoId: ${job.data?.videoId})`);
  });

  videoWorker.on("stalled", (jobId) => {
    console.warn(`⚠️  [WORKER] Job ${jobId} has stalled`);
  });

  return videoWorker;
}

export default null; // Worker starts automatically when module loads


