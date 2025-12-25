import { config } from "dotenv";
import { cleanQueue, getQueueStats } from "../queue/video.queue.js";

config();

async function resetQueue() {
  try {
    const statsBefore = await getQueueStats();
    console.log(`Queue status: Waiting: ${statsBefore.waiting}, Active: ${statsBefore.active}, Completed: ${statsBefore.completed}, Failed: ${statsBefore.failed}`);

    if (statsBefore.total === 0) {
      console.log("Queue is already empty.");
      process.exit(0);
    }

    await cleanQueue(true, true);
    const statsAfter = await getQueueStats();
    console.log(`Queue reset complete. Status: Waiting: ${statsAfter.waiting}, Active: ${statsAfter.active}, Completed: ${statsAfter.completed}, Failed: ${statsAfter.failed}`);

    process.exit(0);
  } catch (error) {
    console.error("Failed to reset queue:", error);
    process.exit(1);
  }
}

resetQueue();

