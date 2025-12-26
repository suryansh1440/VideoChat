import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true
    },
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    audioUrl: {
      type: String,
      default: null
    },
    chunks: [{
      chunkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chunk"
      },
      start: Number,
      end: Number,
      text: String
    }]
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);

