import { config } from "dotenv";
import { cleanQueue, getQueueStats } from "../queue/video.queue.js";

config();

async function resetQueue() {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 [RESET] Starting queue reset...");
    console.log("=".repeat(60) + "\n");

    // Show current stats
    const statsBefore = await getQueueStats();
    console.log("📊 [RESET] Queue status before reset:");
    console.log(`   - Waiting: ${statsBefore.waiting}`);
    console.log(`   - Active: ${statsBefore.active}`);
    console.log(`   - Completed: ${statsBefore.completed}`);
    console.log(`   - Failed: ${statsBefore.failed}`);
    console.log(`   - Total: ${statsBefore.total}\n`);

    if (statsBefore.total === 0) {
      console.log("✅ [RESET] Queue is already empty. Nothing to reset.\n");
      process.exit(0);
    }

    // Clean the queue
    await cleanQueue(true, true);

    // Show stats after
    const statsAfter = await getQueueStats();
    console.log("\n📊 [RESET] Queue status after reset:");
    console.log(`   - Waiting: ${statsAfter.waiting}`);
    console.log(`   - Active: ${statsAfter.active}`);
    console.log(`   - Completed: ${statsAfter.completed}`);
    console.log(`   - Failed: ${statsAfter.failed}`);
    console.log(`   - Total: ${statsAfter.total}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ [RESET] Queue reset completed successfully!");
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ [RESET] Failed to reset queue:");
    console.error(error);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }
}

resetQueue();

