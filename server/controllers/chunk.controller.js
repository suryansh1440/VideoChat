import Transcript from "../modals/transcript.modal.js";
import Chunk from "../modals/chunk.modal.js";

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
  console.log(`\n📦 [CHUNKS] Starting chunk generation for videoId: ${videoId}`);
  
  if (!videoId) {
    throw new Error("videoId is required to generate chunks");
  }

  console.log(`🔍 [CHUNKS] Fetching transcript segments from database...`);
  const segments = await Transcript.find({ videoId }).sort({ start: 1 }).lean();

  if (!segments.length) {
    throw new Error("No transcript segments found for chunking");
  }

  console.log(`📊 [CHUNKS] Found ${segments.length} transcript segments`);
  const totalWords = segments.reduce((sum, seg) => {
    return sum + (seg.text?.trim().split(/\s+/).length || 0);
  }, 0);
  console.log(`📝 [CHUNKS] Total words in transcript: ${totalWords}`);

  // Use chunkTranscript to create chunks
  console.log(`🔄 [CHUNKS] Processing chunks (MIN: ${MIN_WORDS} words, MAX: ${MAX_WORDS} words)...`);
  const chunked = chunkTranscript(segments);

  if (!chunked.length) {
    throw new Error("Chunking produced no chunks");
  }

  console.log(`✅ [CHUNKS] Created ${chunked.length} chunks`);
  chunked.forEach((chunk, index) => {
    console.log(`   📄 Chunk ${index + 1}: ${chunk.wordCount} words (${chunk.start.toFixed(2)}s - ${chunk.end.toFixed(2)}s)`);
  });

  // Format chunks for database (remove wordCount, add videoId)
  const chunks = chunked.map((chunk) => ({
    videoId,
    start: chunk.start,
    end: chunk.end,
    text: chunk.text.trim()
  }));

  console.log(`💾 [CHUNKS] Saving chunks to database...`);
  await Chunk.deleteMany({ videoId });
  const created = await Chunk.insertMany(chunks);
  console.log(`✅ [CHUNKS] Successfully saved ${created.length} chunks to database\n`);
  
  return created;
};

export default {
  generateChunks
};



