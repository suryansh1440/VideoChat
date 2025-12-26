import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1/video';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Upload a video file
 * @param {FormData} formData - FormData containing file, title, description, duration
 * @returns {Promise} API response
 */
export const uploadVideo = async (formData) => {
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get all videos
 * @returns {Promise} Array of videos
 */
export const getAllVideos = async () => {
  const response = await api.get('/all');
  return response.data.data;
};

/**
 * Get video status by ID
 * @param {string} videoId - Video ID
 * @returns {Promise} Video object
 */
export const getVideoStatus = async (videoId) => {
  const response = await api.get(`/${videoId}`);
  return response.data.data;
};

/**
 * Generate summary at timestamp
 * @param {string} videoId - Video ID
 * @param {number} timestamp - Timestamp in seconds
 * @param {string} type - Summary type: 'short' | 'medium' | 'detailed'
 * @returns {Promise} Summary response
 */
export const getSummary = async (videoId, timestamp, type = 'medium') => {
  const response = await api.post('/summary', {
    videoId,
    timestamp,
    type,
  });
  return response.data;
};

/**
 * Chat with video using vector search
 * @param {string} videoId - Video ID
 * @param {string} question - User question
 * @returns {Promise} Chat response with answer and timestamps
 */
export const chatWithVideo = async (videoId, question) => {
  const response = await api.post('/chat', {
    videoId,
    question,
  });
  return response.data;
};

/**
 * Get chat history for a video
 * @param {string} videoId - Video ID
 * @returns {Promise} Array of chat messages
 */
export const getChatHistory = async (videoId) => {
  const response = await api.get(`/${videoId}/chat`);
  return response.data.data;
};

/**
 * Delete chat history for a video
 * @param {string} videoId - Video ID
 * @returns {Promise} Success response
 */
export const deleteChatHistory = async (videoId) => {
  const response = await api.delete(`/${videoId}/chat`);
  return response.data;
};

export default api;

