import mongoose from "mongoose";
import Chunk from "../modals/chunk.modal.js";
import Chat from "../modals/chat.modal.js";
import { generateEmbedding } from "../lib/embeddings.js";
import OpenAI from "openai";
import cloudinary from "../lib/cloudinary.js";
import { Readable } from "stream";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const chatWithVideo = async (req, res) => {
  try {
    const { videoId, question } = req.body;

    if (!videoId || !question?.trim()) {
      return res.status(400).json({ message: "videoId and question are required" });
    }

    const videoObjectId = new mongoose.Types.ObjectId(videoId);

    // Check if video has chunks with embeddings
    const chunksWithEmbeddings = await Chunk.countDocuments({ 
      videoId: videoObjectId,
      embedding: { $exists: true, $ne: null }
    });

    if (chunksWithEmbeddings === 0) {
      return res.status(400).json({ 
        message: "This video is not ready for chat. Please wait for processing to complete."
      });
    }

    // Generate embedding for question
    const questionEmbedding = await generateEmbedding(question.trim());

    // Vector search for relevant chunks
    let chunks = [];
    try {
      const vectorResults = await Chunk.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: questionEmbedding,
            numCandidates: 50,
            limit: 5,
            filter: {
              videoId: videoObjectId
            }
          }
        },
        {
          $project: {
            _id: 1,
            start: 1,
            end: 1,
            text: 1
          }
        }
      ]);
      chunks = vectorResults || [];
    } catch (error) {
      console.error("[Chat] Vector search error:", error.message);
      return res.status(500).json({
        message: "Vector search failed. Please try again later.",
        error: error.message
      });
    }

    if (chunks.length === 0) {
      return res.status(400).json({ 
        message: "No relevant content found. Try rephrasing your question."
      });
    }

    // Build context and get LLM response
    const context = chunks.map(c => c.text).join("\n\n");
    
    const prompt = `You are an educational AI assistant for a video-based learning platform.

You must answer questions using ONLY the provided video context.
Do NOT use outside knowledge.
Do NOT guess, infer, or hallucinate.

If the topic or answer is NOT clearly present in the context, respond EXACTLY with:
"This video does not cover that topic."

If the topic IS present in the context:
- Explain it in simple, student-friendly language
- Improve the explanation to make it easier to understand
- Give at least one clear example (real-world or conceptual)
- Do NOT add concepts that are not mentioned or implied in the context

Be clear, helpful, and concise. Use plain text formatting only - avoid markdown symbols like *, _, -, #, etc.

Context from video:
${context}

Question: ${question}

Answer:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an educational AI assistant. Answer questions clearly using only the provided context. Use plain text only - no markdown formatting." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const answer = completion.choices[0].message.content;

    // Generate text-to-speech audio (skip if answer is the default "no topic" message)
    let audioUrl = null;
    const defaultNoTopicMessage = "This video does not cover that topic.";
    const defaultAudioUrl = "http://res.cloudinary.com/dn4ifybir/video/upload/v1766769592/chat-audio/chat_audio_1766769589164.mp3";
    
    if (answer.trim() === defaultNoTopicMessage) {
      // Use default audio URL for the "no topic" message
      audioUrl = defaultAudioUrl;
    } else {
      // Generate TTS for other answers
      try {
        const ttsResponse = await openai.audio.speech.create({
          model: "gpt-4o-mini-tts",
          voice: "alloy",
          input: answer
        });

        // Convert response to buffer
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        
        // Upload directly to Cloudinary from buffer (no temp file needed)
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "video", // Cloudinary treats audio as video
              folder: "chat-audio",
              format: "mp3",
              public_id: `chat_audio_${Date.now()}`
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          // Convert buffer to stream and pipe to Cloudinary
          const bufferStream = new Readable();
          bufferStream.push(audioBuffer);
          bufferStream.push(null);
          bufferStream.pipe(uploadStream);
        });

        audioUrl = uploadResult.secure_url;
      } catch (ttsError) {
        console.error("[Chat] TTS error:", ttsError.message);
        // Continue without audio - don't fail the entire request
      }
    }

    // Store chat history
    await Chat.create({
      videoId,
      question: question.trim(),
      answer,
      audioUrl,
      chunks: chunks.map(c => ({
        chunkId: c._id,
        start: c.start,
        end: c.end,
        text: c.text
      }))
    });

    // Format response
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const timestamps = chunks.map(c => ({
      start: c.start,
      end: c.end,
      formatted: `${formatTime(c.start)} - ${formatTime(c.end)}`
    }));

    return res.status(200).json({
      message: "Chat response generated successfully",
      data: {
        answer,
        audioUrl,
        timestamps,
        chunks: chunks.map(c => ({
          start: c.start,
          end: c.end,
          text: c.text
        }))
      }
    });
  } catch (error) {
    console.error("[Chat] Error:", error.message);
    return res.status(500).json({
      message: "Failed to process chat request",
      error: error.message
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    if (!videoId) {
      return res.status(400).json({ message: "videoId is required" });
    }

    const chats = await Chat.find({ videoId })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    return res.status(200).json({
      message: "Chat history retrieved successfully",
      data: chats
    });
  } catch (error) {
    console.error("[Chat History] Error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve chat history",
      error: error.message
    });
  }
};

export const deleteChatHistory = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    if (!videoId) {
      return res.status(400).json({ message: "videoId is required" });
    }

    await Chat.deleteMany({ videoId });

    return res.status(200).json({
      message: "Chat history deleted successfully"
    });
  } catch (error) {
    console.error("[Chat History] Delete error:", error.message);
    return res.status(500).json({
      message: "Failed to delete chat history",
      error: error.message
    });
  }
};
