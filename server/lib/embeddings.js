import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate embedding for text using OpenAI
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<number[]>} - Embedding vector
 */
export const generateEmbedding = async (text) => {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error("Text must be a non-empty string");
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.trim()
    });

    const embedding = response.data[0].embedding;
    
    // Validate embedding dimensions
    if (!embedding || embedding.length !== 1536) {
      throw new Error(`Invalid embedding dimensions: ${embedding?.length || 0} (expected 1536)`);
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export const generateEmbeddingsBatch = async (texts) => {
  try {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error("Texts must be a non-empty array");
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts.map(t => t.trim())
    });

    const embeddings = response.data.map(item => item.embedding);
    
    // Validate all embeddings have correct dimensions
    const invalidEmbeddings = embeddings.filter(emb => !emb || emb.length !== 1536);
    if (invalidEmbeddings.length > 0) {
      throw new Error(`Invalid embedding dimensions detected. Expected 1536 dimensions.`);
    }

    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings batch:", error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
};

