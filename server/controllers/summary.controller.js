import { config } from "dotenv";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import Chunk from "../modals/chunk.modal.js";
import Summary from "../modals/summery.modal.js";

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
 * @param {string} text - The chunk text to summarize
 * @param {string} type - Summary type: "short" | "medium" | "detailed"
 * @returns {Promise<string>} The generated summary text
 */
async function callAI(text, type) {
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Text input is required for summarization");
  }

  // Define prompts based on summary type
  const prompts = {
    short: `Provide a brief, concise summary (2-3 sentences) of the following text:\n\n${text}`,
    medium: `Provide a medium-length summary (1-2 paragraphs) of the following text:\n\n${text}`,
    detailed: `Provide a detailed, comprehensive summary (2-3 paragraphs) of the following text:\n\n${text}`
  };

  const prompt = prompts[type] || prompts.medium;

  try {
    const { text: summaryText } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt
    });

    return summaryText;
  } catch (error) {
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

    const chunk = await Chunk.findOne({
      videoId,
      start: { $lte: numericTimestamp },
      end: { $gte: numericTimestamp }
    });

    if (!chunk) {
      return res
        .status(404)
        .json({ message: "No chunk found for the given timestamp" });
    }

    let summary = await Summary.findOne({
      chunkId: chunk._id,
      type
    });

    if (!summary) {
      let summaryText;
      try {
        summaryText = await callAI(chunk.text, type);
      } catch (err) {
        return res.status(500).json({
          message: "Failed to generate summary",
          error: err.message
        });
      }

      summary = await Summary.create({
        chunkId: chunk._id,
        type,
        summaryText
      });
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
      error: error.message
    });
  }
};

export default {
  summarizeAtTimestamp
};



