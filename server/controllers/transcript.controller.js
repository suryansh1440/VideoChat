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
    videoPath = await downloadToTempFile(videoUrl, "mp4");
    audioPath = path.join(
      os.tmpdir(),
      `videochat-audio-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
    );
    await extractAudio(videoPath, audioPath);
    const whisperSegments = await transcribeAudioFile(audioPath);
    const segments = processSegments(whisperSegments);
    return segments;
  } catch (error) {
    console.error("Transcription failed:", error.message);
    throw error;
  } finally {
    const toDelete = [videoPath, audioPath].filter(Boolean);
    await Promise.all(
      toDelete.map(async (p) => {
        try {
          await fs.promises.unlink(p);
        } catch (err) {
          // Silent cleanup failure
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
  if (!videoId) {
    throw new Error("videoId is required to generate transcript");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new Error("Video not found");
  }

  let segments;
  try {
    segments = await transcribeVideo(video.videoUrl);
  } catch (err) {
    console.error("Transcription service error:", err.message);
    throw new Error(`Transcription failed: ${err.message}`);
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Transcription provider returned no segments");
  }

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

  await Transcript.deleteMany({ videoId: video._id });
  const created = await Transcript.insertMany(docs);
  
  return created;
};

export default {
  generateTranscript
};