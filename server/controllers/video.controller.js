import fs from "fs";
import cloudinary from "../lib/cloudinary.js";
import Video from "../modals/video.modal.js";
import videoQueue from "../queue/video.queue.js";
import { getVideoDuration } from "../lib/videoMetadata.js";

/**
 * Controller: uploadVideo
 *
 * - Accepts video file via multer (req.file)
 * - Extracts video duration automatically using ffprobe
 * - Uploads video to Cloudinary (resource_type: "video")
 * - Persists Video document with metadata
 * - Enqueues BullMQ job "process-video" on "video-processing" queue
 */
export const uploadVideo = async (req, res) => {
  const videoFile = req.file;
  let filePath = videoFile?.path;

  try {
    const { title, description = "" } = req.body;

    if (!videoFile) {
      return res.status(400).json({ message: "Video file is required" });
    }

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Extract video duration automatically
    let duration;
    try {
      duration = await getVideoDuration(videoFile.path);
    } catch (error) {
      console.error("Failed to extract duration:", error.message);
      return res.status(500).json({
        message: "Failed to extract video duration. Please ensure ffmpeg/ffprobe is installed.",
        error: error.message
      });
    }

    // Upload video to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(videoFile.path, {
      resource_type: "video"
    });

    const video = await Video.create({
      title,
      description,
      videoUrl: uploadResult.secure_url,
      duration: duration,
      status: "processing"
    });

    // Enqueue background processing job
    const job = await videoQueue.add("process-video", { 
      videoId: video._id.toString() 
    });

    return res.status(201).json({
      message: "Video uploaded successfully. Processing has started.",
      data: video
    });
  } catch (error) {
    console.error("Error in uploadVideo:", error);
    return res.status(500).json({
      message: "Failed to upload video",
      error: error.message
    });
  } finally {
    // Clean up temporary file after upload
    if (filePath) {
      try {
        await fs.promises.unlink(filePath);
      } catch (cleanupError) {
        console.error("Failed to delete temporary file:", cleanupError.message);
      }
    }
  }
};

/**
 * Controller: getAllVideos
 *
 * - Fetches all videos
 * - Returns list of videos sorted by creation date (newest first)
 */
export const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    return res.status(200).json({
      message: "Videos retrieved successfully",
      data: videos
    });
  } catch (error) {
    console.error("Error in getAllVideos:", error);
    return res.status(500).json({
      message: "Failed to retrieve videos",
      error: error.message
    });
  }
};

/**
 * Controller: getVideoById
 *
 * - Fetches Video by ID
 * - Returns video metadata including status
 */
export const getVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({ message: "Video ID is required" });
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    return res.status(200).json({
      message: "Video retrieved successfully",
      data: video
    });
  } catch (error) {
    console.error("Error in getVideoById:", error);
    return res.status(500).json({
      message: "Failed to retrieve video",
      error: error.message
    });
  }
};