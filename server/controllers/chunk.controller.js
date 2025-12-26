import Transcript from "../modals/transcript.modal.js";
import Chunk from "../modals/chunk.modal.js";
import { generateEmbeddingsBatch } from "../lib/embeddings.js";

const TOPIC_PHRASES = [
  "now let's",
  "moving on",
  "next we",
  "next we will",
  "so basically",
  "in summary",
  "let's talk about",
  "to conclude"
];

const MIN_WORDS = 80;
const MAX_WORDS = 140;
const PAUSE_THRESHOLD = 2.0; // seconds

const containsTopicShift = (text) => {
  const lower = text.toLowerCase();
  return TOPIC_PHRASES.some(phrase => lower.includes(phrase));
};

/**
 * Chunk transcript segments into semantic chunks.
 * 
 * @param {Array} segments - Array of transcript segments with { start, end, text }
 * @returns {Array} Array of chunks with { start, end, text, wordCount }
 */
export const chunkTranscript = (segments) => {
  const chunks = [];
  let bufferText = [];
  let bufferStart = null;
  let bufferEnd = null;
  let wordCount = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const words = seg.text.trim().split(/\s+/).length;

    if (bufferStart === null) {
      bufferStart = seg.start;
    }

    bufferText.push(seg.text.trim());
    bufferEnd = seg.end;
    wordCount += words;

    const nextSeg = segments[i + 1];
    const longPause =
      nextSeg && nextSeg.start - seg.end > PAUSE_THRESHOLD;

    const sentenceEnd =
      /[.!?]$/.test(seg.text.trim());

    const topicShift =
      containsTopicShift(seg.text);

    const shouldSplit =
      wordCount >= MAX_WORDS ||
      (wordCount >= MIN_WORDS && (longPause || topicShift || sentenceEnd));

    if (shouldSplit) {
      chunks.push({
        start: bufferStart,
        end: bufferEnd,
        text: bufferText.join(" "),
        wordCount
      });

      // reset
      bufferText = [];
      bufferStart = null;
      bufferEnd = null;
      wordCount = 0;
    }
  }

  // Flush remaining buffer
  if (bufferText.length > 0) {
    chunks.push({
      start: bufferStart,
      end: bufferEnd,
      text: bufferText.join(" "),
      wordCount
    });
  }

  return chunks;
};

/**
 * Internal function: generateChunks
 *
 * - Fetches Transcript segments for videoId (sorted by start time)
 * - Performs semantic chunking using chunkTranscript:
 *   - 80–140 words per chunk
 *   - Splits on pauses > 2 seconds
 *   - Splits on topic-change phrases
 *   - Splits on sentence endings
 * - Persists chunks into Chunk collection
 */
export const generateChunks = async (videoId) => {
  if (!videoId) {
    throw new Error("videoId is required to generate chunks");
  }

  const segments = await Transcript.find({ videoId }).sort({ start: 1 }).lean();

  if (!segments.length) {
    throw new Error("No transcript segments found for chunking");
  }

  const chunked = chunkTranscript(segments);

  if (!chunked.length) {
    throw new Error("Chunking produced no chunks");
  }

  const chunks = chunked.map((chunk) => ({
    videoId,
    start: chunk.start,
    end: chunk.end,
    text: chunk.text.trim()
  }));

  // Generate embeddings for all chunks
  console.log(`Generating embeddings for ${chunks.length} chunks...`);
  const texts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddingsBatch(texts);

  // Add embeddings to chunks
  const chunksWithEmbeddings = chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index]
  }));

  await Chunk.deleteMany({ videoId });
  const created = await Chunk.insertMany(chunksWithEmbeddings);
  
  console.log(`Successfully created ${created.length} chunks with embeddings`);
  return created;
};

export default {
  generateChunks
};



