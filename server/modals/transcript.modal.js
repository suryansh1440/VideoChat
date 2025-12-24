import mongoose from "mongoose";

const transcriptSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true
    },
    start: {
      type: Number,
      required: true
    },
    end: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Transcript", transcriptSchema);
