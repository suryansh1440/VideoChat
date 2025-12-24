import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    videoUrl: {
      type: String,
      required: true
    },
    duration: {
      type: Number, // seconds
      required: true
    },
    language: {
      type: String,
      default: "en"
    },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Video", videoSchema);
