import { config } from 'dotenv';
import { connectDB } from '../lib/db.js';
import Chunk from '../modals/chunk.modal.js';
import { generateEmbeddingsBatch } from '../lib/embeddings.js';

config();

/**
 * Script to generate embeddings for existing chunks that don't have embeddings
 * Usage: node server/scripts/generate-embeddings.js [videoId]
 * 
 * If videoId is provided, only process chunks for that video
 * Otherwise, process all chunks without embeddings
 */
const generateEmbeddingsForChunks = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const videoId = process.argv[2];

    // Find chunks without embeddings
    const query = { 
      $or: [
        { embedding: { $exists: false } },
        { embedding: null },
        { embedding: { $size: 0 } }
      ]
    };

    if (videoId) {
      query.videoId = videoId;
      console.log(`Processing chunks for video: ${videoId}`);
    } else {
      console.log('Processing all chunks without embeddings');
    }

    const chunks = await Chunk.find(query).lean();
    
    if (chunks.length === 0) {
      console.log('No chunks found without embeddings');
      process.exit(0);
    }

    console.log(`Found ${chunks.length} chunks without embeddings`);

    // Process in batches of 100 to avoid rate limits
    const BATCH_SIZE = 100;
    let processed = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => c.text);
      
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`);
      
      try {
        const embeddings = await generateEmbeddingsBatch(texts);
        
        // Update chunks with embeddings
        for (let j = 0; j < batch.length; j++) {
          await Chunk.updateOne(
            { _id: batch[j]._id },
            { $set: { embedding: embeddings[j] } }
          );
        }
        
        processed += batch.length;
        console.log(`✓ Processed ${processed}/${chunks.length} chunks`);
        
        // Small delay to avoid rate limits
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing batch:`, error.message);
        throw error;
      }
    }

    console.log(`\n✅ Successfully generated embeddings for ${processed} chunks`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

generateEmbeddingsForChunks();

