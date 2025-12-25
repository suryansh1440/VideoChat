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

connectDB()
  .then(async () => {
    if (CLEAN_ON_STARTUP) {
      try {
        await cleanQueue(true, true);
      } catch (error) {
        console.warn("Failed to clean queue on startup:", error.message);
      }
    }
    startWorker();
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
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

  if (!videoId) {
    throw new Error("Job data must include videoId");
  }

  try {
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    await generateTranscript(videoId);
    await generateChunks(videoId);
    await Video.findByIdAndUpdate(videoId, { status: "ready" });
  } catch (err) {
    console.error(`Job ${job.id} failed:`, err.message);
    try {
      await Video.findByIdAndUpdate(videoId, { status: "failed" });
    } catch (updateErr) {
      console.error("Failed to update video status:", updateErr.message);
    }
    throw err;
  }
};

function startWorker() {
  const videoWorker = new Worker(QUEUE_NAME, processor, { connection });

  videoWorker.on("ready", () => {
    console.log("Video worker ready");
  });

  videoWorker.on("error", (error) => {
    console.error("Worker error:", error);
  });

  videoWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  return videoWorker;
}

export default null; // Worker starts automatically when module loads


