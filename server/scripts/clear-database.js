import { config } from 'dotenv';
import { connectDB } from '../lib/db.js';
import Video from '../modals/video.modal.js';
import Transcript from '../modals/transcript.modal.js';
import Chunk from '../modals/chunk.modal.js';
import Summary from '../modals/summery.modal.js';
import Chat from '../modals/chat.modal.js';
import readline from 'readline';

config();

/**
 * Script to clear all data from the database
 * 
 * Usage:
 *   node server/scripts/clear-database.js           # Interactive mode with confirmation
 *   node server/scripts/clear-database.js --force   # Skip confirmation prompt
 */

const collections = [
  { name: 'Videos', model: Video },
  { name: 'Transcripts', model: Transcript },
  { name: 'Chunks', model: Chunk },
  { name: 'Summaries', model: Summary },
  { name: 'Chats', model: Chat }
];

const getCollectionStats = async () => {
  const stats = {};
  for (const collection of collections) {
    try {
      const count = await collection.model.countDocuments();
      stats[collection.name] = count;
    } catch (error) {
      console.error(`Error counting ${collection.name}:`, error.message);
      stats[collection.name] = 0;
    }
  }
  return stats;
};

const clearDatabase = async () => {
  const results = {};
  
  for (const collection of collections) {
    try {
      const deleteResult = await collection.model.deleteMany({});
      results[collection.name] = {
        deleted: deleteResult.deletedCount,
        success: true
      };
    } catch (error) {
      console.error(`Error clearing ${collection.name}:`, error.message);
      results[collection.name] = {
        deleted: 0,
        success: false,
        error: error.message
      };
    }
  }
  
  return results;
};

const askConfirmation = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
};

const main = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Get current statistics
    console.log('📊 Current Database Statistics:');
    console.log('─'.repeat(50));
    const stats = await getCollectionStats();
    const totalDocs = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    for (const [name, count] of Object.entries(stats)) {
      console.log(`  ${name.padEnd(20)} : ${count.toLocaleString()} documents`);
    }
    console.log('─'.repeat(50));
    console.log(`  ${'TOTAL'.padEnd(20)} : ${totalDocs.toLocaleString()} documents\n`);

    if (totalDocs === 0) {
      console.log('✅ Database is already empty. Nothing to clear.');
      process.exit(0);
    }

    // Check for --force flag
    const forceFlag = process.argv.includes('--force') || process.argv.includes('-f');
    
    if (!forceFlag) {
      console.log('⚠️  WARNING: This will delete ALL data from the database!');
      console.log('   This action cannot be undone.\n');
      
      const confirmed = await askConfirmation('Are you sure you want to continue? (yes/no): ');
      
      if (!confirmed) {
        console.log('\n❌ Operation cancelled. Database remains unchanged.');
        process.exit(0);
      }
      
      // Double confirmation
      const doubleConfirmed = await askConfirmation('\n⚠️  Final confirmation - type "yes" to proceed: ');
      
      if (!doubleConfirmed) {
        console.log('\n❌ Operation cancelled. Database remains unchanged.');
        process.exit(0);
      }
    } else {
      console.log('⚡ Force flag detected. Skipping confirmation prompts.\n');
    }

    // Clear database
    console.log('\n🗑️  Clearing database...');
    console.log('─'.repeat(50));
    const results = await clearDatabase();
    
    let totalDeleted = 0;
    let successCount = 0;
    
    for (const [name, result] of Object.entries(results)) {
      if (result.success) {
        console.log(`  ✅ ${name.padEnd(20)} : ${result.deleted.toLocaleString()} documents deleted`);
        totalDeleted += result.deleted;
        successCount++;
      } else {
        console.log(`  ❌ ${name.padEnd(20)} : Failed - ${result.error}`);
      }
    }
    
    console.log('─'.repeat(50));
    console.log(`  ${'TOTAL DELETED'.padEnd(20)} : ${totalDeleted.toLocaleString()} documents\n`);

    // Verify deletion
    console.log('🔍 Verifying deletion...');
    const finalStats = await getCollectionStats();
    const remainingDocs = Object.values(finalStats).reduce((sum, count) => sum + count, 0);
    
    if (remainingDocs === 0) {
      console.log('✅ Database cleared successfully! All collections are now empty.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingDocs} documents still remain in the database.\n`);
      for (const [name, count] of Object.entries(finalStats)) {
        if (count > 0) {
          console.log(`  ${name.padEnd(20)} : ${count} documents remaining`);
        }
      }
      console.log();
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

main();

