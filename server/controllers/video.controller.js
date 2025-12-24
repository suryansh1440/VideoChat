import cloudinary from "../lib/cloudinary.js";
import Video from "../modals/video.modal.js";
import videoQueue from "../queue/video.queue.js";

/**
 * Controller: uploadVideo
 *
 * - Accepts video file via multer (req.file)
 * - Uploads video to Cloudinary (resource_type: "video")
 * - Persists Video document with metadata
 * - Enqueues BullMQ job "process-video" on "video-processing" queue
 */
export const uploadVideo = async (req, res) => {
  try {
    const videoFile = req.file;
    const { title, description = "", duration } = req.body;

    if (!videoFile) {
      return res.status(400).json({ message: "Video file is required" });
    }

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const numericDuration = Number(duration);
    if (!numericDuration || Number.isNaN(numericDuration) || numericDuration <= 0) {
      return res
        .status(400)
        .json({ message: "Valid video duration (in seconds) is required" });
    }

    // Upload video to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(videoFile.path, {
      resource_type: "video"
    });

    const video = await Video.create({
      title,
      description,
      videoUrl: uploadResult.secure_url,
      duration: numericDuration,
      status: "processing"
    });

    // Enqueue background processing job
    console.log("\n" + "📤".repeat(30));
    console.log(`📤 [CONTROLLER] Enqueuing video processing job`);
    console.log(`📹 [CONTROLLER] Video ID: ${video._id}`);
    console.log(`📝 [CONTROLLER] Title: ${video.title}`);
    console.log(`⏱️  [CONTROLLER] Duration: ${video.duration}s`);
    console.log(`🔗 [CONTROLLER] Cloudinary URL: ${video.videoUrl}`);
    
    const job = await videoQueue.add("process-video", { 
      videoId: video._id.toString() 
    });
    
    console.log(`✅ [CONTROLLER] Job ${job.id} added to queue successfully`);
    console.log("📤".repeat(30) + "\n");

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