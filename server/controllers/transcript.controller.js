import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import { execFile } from "child_process";
import axios from "axios";
import OpenAI from "openai";
import Video from "../modals/video.modal.js";
import Transcript from "../modals/transcript.modal.js";
import { config } from "dotenv";

config();

const streamPipeline = promisify(pipeline);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Download the Cloudinary video URL to a temp file.
 */
async function downloadToTempFile(url, extension = "mp4") {
  const tmpDir = os.tmpdir();
  const filePath = path.join(
    tmpDir,
    `videochat-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  );

  const response = await axios({
    url,
    method: "GET",
    responseType: "stream"
  });

  await streamPipeline(response.data, fs.createWriteStream(filePath));
  return filePath;
}

/**
 * Extract audio from the video using ffmpeg.
 * Requires ffmpeg installed and available on PATH.
 */
async function extractAudio(inputVideoPath, outputAudioPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y", // overwrite output
      "-i",
      inputVideoPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      outputAudioPath
    ];

    execFile("ffmpeg", args, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

/**
 * Call OpenAI Whisper on the audio file and get segment-level timestamps.
 */
async function transcribeAudioFile(audioPath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"]
  });

  return transcription.segments || [];
}

/**
 * Process segments from Whisper API response.
 * Whisper already provides segments, so we just need to validate and format them.
 */
function processSegments(whisperSegments) {
  if (!Array.isArray(whisperSegments) || whisperSegments.length === 0) return [];

  return whisperSegments
    .filter(
      (seg) =>
        seg &&
        typeof seg.start === "number" &&
        typeof seg.end === "number" &&
        typeof seg.text === "string" &&
        seg.text.trim().length > 0
    )
    .map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim()
    }));
}

/**
 * Cloudinary video URL
 *  → download video
 *  → extract audio (ffmpeg)
 *  → send audio to Whisper
 *  → receive timestamped segments
 *  → return segments
 */
async function transcribeVideo(videoUrl) {
  if (!videoUrl) {
    throw new Error("videoUrl is required for transcription");
  }

  let videoPath;
  let audioPath;
  const startTime = Date.now();

  try {
    // 1) Download video from Cloudinary
    console.log(`⬇️  [TRANSCRIPT] Step 1/4: Downloading video from Cloudinary...`);
    const downloadStart = Date.now();
    videoPath = await downloadToTempFile(videoUrl, "mp4");
    const downloadTime = ((Date.now() - downloadStart) / 1000).toFixed(2);
    console.log(`✅ [TRANSCRIPT] Video downloaded to: ${videoPath} (${downloadTime}s)`);

    // 2) Extract audio
    console.log(`🎵 [TRANSCRIPT] Step 2/4: Extracting audio using ffmpeg...`);
    audioPath = path.join(
      os.tmpdir(),
      `videochat-audio-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
    );
    const extractStart = Date.now();
    await extractAudio(videoPath, audioPath);
    const extractTime = ((Date.now() - extractStart) / 1000).toFixed(2);
    console.log(`✅ [TRANSCRIPT] Audio extracted to: ${audioPath} (${extractTime}s)`);

    // 3) Send audio to Whisper (returns segments directly)
    console.log(`🤖 [TRANSCRIPT] Step 3/4: Sending audio to OpenAI Whisper API...`);
    const whisperStart = Date.now();
    const whisperSegments = await transcribeAudioFile(audioPath);
    const whisperTime = ((Date.now() - whisperStart) / 1000).toFixed(2);
    console.log(`✅ [TRANSCRIPT] Whisper API returned ${whisperSegments?.length || 0} segments (${whisperTime}s)`);

    // 4) Process and format segments
    console.log(`🔄 [TRANSCRIPT] Step 4/4: Processing segments...`);
    const segments = processSegments(whisperSegments);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [TRANSCRIPT] Transcription complete! ${segments.length} segments processed (Total: ${totalTime}s)`);
    
    return segments;
  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ [TRANSCRIPT] Transcription failed after ${totalTime}s:`, error.message);
    throw error;
  } finally {
    // 5) Cleanup temp files (best-effort)
    console.log(`🧹 [TRANSCRIPT] Cleaning up temporary files...`);
    const toDelete = [videoPath, audioPath].filter(Boolean);
    await Promise.all(
      toDelete.map(async (p) => {
        try {
          await fs.promises.unlink(p);
          console.log(`🗑️  [TRANSCRIPT] Deleted: ${p}`);
        } catch (err) {
          console.warn(`⚠️  [TRANSCRIPT] Failed to delete ${p}:`, err.message);
        }
      })
    );
  }
}

/**
 * Internal function: generateTranscript
 *
 * - Fetches Video by ID
 * - Calls transcribeVideo(video.videoUrl)
 * - Persists segments into Transcript collection
 */
export const generateTranscript = async (videoId) => {
  console.log(`\n📝 [TRANSCRIPT] Starting transcript generation for videoId: ${videoId}`);
  
  if (!videoId) {
    throw new Error("videoId is required to generate transcript");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new Error("Video not found");
  }

  console.log(`📹 [TRANSCRIPT] Video found: "${video.title}"`);
  console.log(`🔗 [TRANSCRIPT] Downloading video from: ${video.videoUrl}`);

  let segments;
  try {
    console.log(`🎤 [TRANSCRIPT] Calling transcription service...`);
    segments = await transcribeVideo(video.videoUrl);
    console.log(`✅ [TRANSCRIPT] Received ${segments?.length || 0} segments from transcription service`);
  } catch (err) {
    console.error(`❌ [TRANSCRIPT] Transcription service error:`, err.message);
    throw new Error(`Transcription failed: ${err.message}`);
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Transcription provider returned no segments");
  }

  console.log(`🔍 [TRANSCRIPT] Processing ${segments.length} segments...`);
  const docs = segments
    .filter(
      (seg) =>
        seg &&
        typeof seg.start === "number" &&
        typeof seg.end === "number" &&
        typeof seg.text === "string" &&
        seg.text.trim().length > 0
    )
    .map((seg) => ({
      videoId: video._id,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim()
    }));

  if (!docs.length) {
    throw new Error("No valid transcript segments to store");
  }

  console.log(`💾 [TRANSCRIPT] Saving ${docs.length} valid segments to database...`);
  await Transcript.deleteMany({ videoId: video._id });
  const created = await Transcript.insertMany(docs);
  console.log(`✅ [TRANSCRIPT] Successfully saved ${created.length} transcript segments`);
  
  return created;
};

export default {
  generateTranscript
};