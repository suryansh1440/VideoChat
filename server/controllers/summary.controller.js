import { config } from "dotenv";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import Chunk from "../modals/chunk.modal.js";
import Summary from "../modals/summery.modal.js";
import Transcript from "../modals/transcript.modal.js";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GOOGLE_GENERATIVE_AI_API_KEY not set in environment variables");
}

const google = createGoogleGenerativeAI({
  apiKey: apiKey
});


/**
 * Generate summary using Google Gemini AI.
 *
 * @param {string} chunkText - The chunk text to summarize
 * @param {string} transcriptText - The exact transcript text at the timestamp
 * @param {string} type - Summary type: "short" | "medium" | "detailed"
 * @returns {Promise<string>} The generated summary text
 */
async function callAI(chunkText, transcriptText, type) {
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }

  if (!chunkText || typeof chunkText !== "string" || chunkText.trim().length === 0) {
    throw new Error("Text input is required for summarization");
  }

  // Build context about the chunk
  const chunkContext = transcriptText 
    ? `This is a section from a video transcript. The exact words spoken at this moment are:\n\n"${transcriptText}"\n\nThis section is part of a larger chunk of the video that includes:\n\n`
    : `This is a section from a video transcript:\n\n`;

  const prompts = {
    short: `${chunkContext}${chunkText}\n\nPlease provide a simple, easy-to-understand summary in 2-3 short sentences. Use everyday language that anyone can understand. Explain what is being said in the simplest way possible.`,
    
    medium: `${chunkContext}${chunkText}\n\nPlease provide a clear, easy-to-understand summary in 1-2 paragraphs. Use simple words and explain the main points in a way that anyone can understand. Break down any complex ideas into simple explanations.`,
    
    detailed: `${chunkContext}${chunkText}\n\nPlease provide a comprehensive, easy-to-understand summary in 2-3 paragraphs. Use simple, everyday language. Explain all the key points clearly and break down any technical terms or complex concepts into simple explanations that anyone can understand.`
  };

  const prompt = prompts[type] || prompts.medium;

  try {
    const { text: summaryText } = await generateText({
      model: google("gemini-3-flash-preview"),
      prompt
    });

    const cleanText = summaryText.replace(/```json\n?|\n?```/g, "").trim();
    return cleanText;
  } catch (error) {
    console.error("Google Gemini API error:", error);
    throw new Error(`AI summarization failed: ${error.message}`);
  }
}

/**
 * Controller: summarizeAtTimestamp
 *
 * - Input: videoId, timestamp, type ("short" | "medium" | "detailed")
 * - Finds chunk covering the given timestamp
 * - Checks Summary cache
 * - If not found, calls callAI(text, type), stores result, and returns it
 */
export const summarizeAtTimestamp = async (req, res) => {
  try {
    const { videoId, timestamp, type } = req.body || {};

    if (!videoId) {
      return res.status(400).json({ message: "videoId is required" });
    }

    const numericTimestamp = Number(timestamp);
    if (
      Number.isNaN(numericTimestamp) ||
      numericTimestamp < 0
    ) {
      return res
        .status(400)
        .json({ message: "A valid timestamp (in seconds) is required" });
    }

    const allowedTypes = ["short", "medium", "detailed"];
    if (!type || !allowedTypes.includes(type)) {
      return res
        .status(400)
        .json({ message: `type must be one of: ${allowedTypes.join(", ")}` });
    }

    const mongoose = (await import("mongoose")).default;
    let queryVideoId = videoId;
    if (typeof videoId === "string" && mongoose.Types.ObjectId.isValid(videoId)) {
      queryVideoId = new mongoose.Types.ObjectId(videoId);
    }

    const chunk = await Chunk.findOne({
      videoId: queryVideoId,
      start: { $lte: numericTimestamp },
      end: { $gte: numericTimestamp }
    });

    if (!chunk) {
      const chunkCount = await Chunk.countDocuments({ videoId: queryVideoId });
      return res
        .status(404)
        .json({ 
          message: "No chunk found for the given timestamp",
          details: `No chunk found at ${numericTimestamp}s. Video has ${chunkCount} chunks total.`
        });
    }

    // Get the exact transcript segment(s) at the current timestamp
    const transcriptSegments = await Transcript.find({
      videoId: queryVideoId,
      start: { $lte: numericTimestamp },
      end: { $gte: numericTimestamp }
    })
    .sort({ start: 1 })
    .lean();

    // Combine transcript segments into a single text
    const transcriptText = transcriptSegments
      .map(seg => seg.text)
      .join(" ")
      .trim();

    let summary = await Summary.findOne({
      chunkId: chunk._id,
      type
    });

    if (!summary) {
      let summaryText;
      try {
        summaryText = await callAI(chunk.text, transcriptText, type);
      } catch (err) {
        console.error("AI generation failed:", err);
        return res.status(500).json({
          message: "Failed to generate summary",
          error: err.message
        });
      }

      try {
        summary = await Summary.create({
          chunkId: chunk._id,
          type,
          summaryText
        });
      } catch (dbErr) {
        console.error("Failed to save summary to database:", dbErr);
        return res.status(500).json({
          message: "Failed to save summary",
          error: dbErr.message
        });
      }
    }

    return res.status(200).json({
      message: "Summary generated successfully",
      data: {
        chunkId: summary.chunkId,
        type: summary.type,
        summary: summary.summaryText
      }
    });
  } catch (error) {
    console.error("Error in summarizeAtTimestamp:", error);
    return res.status(500).json({
      message: "Failed to generate summary",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

export default {
  summarizeAtTimestamp
};



