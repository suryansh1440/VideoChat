import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Extract video duration using ffprobe
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} Duration in seconds
 */
export const getVideoDuration = async (videoPath) => {
  try {
    // Use ffprobe to get video duration
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath
    ]);

    const duration = parseFloat(stdout.trim());
    
    if (isNaN(duration) || duration <= 0) {
      throw new Error("Invalid duration extracted from video");
    }

    return Math.round(duration); // Round to nearest second
  } catch (error) {
    console.error("Error extracting video duration:", error);
    throw new Error(`Failed to extract video duration: ${error.message}`);
  }
};
