import mongoose from "mongoose";

const summarySchema = new mongoose.Schema(
  {
    chunkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chunk",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["short", "medium", "detailed"],
      required: true
    },
    summaryText: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate summaries
summarySchema.index({ chunkId: 1, type: 1 }, { unique: true });

export default mongoose.model("Summary", summarySchema);
