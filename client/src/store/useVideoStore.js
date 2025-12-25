import { create } from 'zustand';
import { uploadVideo, getAllVideos, getVideoStatus, getSummary } from '../api/videoApi';

export const useVideoStore = create((set, get) => ({
  // State
  videos: [],
  currentVideo: null,
  summary: null,
  
  // Loading states
  isUploading: false,
  isFetchingVideos: false,
  isFetchingStatus: false,
  isGeneratingSummary: false,
  
  // Error states
  uploadError: null,
  fetchVideosError: null,
  statusError: null,
  summaryError: null,

  // Actions
  uploadVideo: async (formData) => {
    set({ isUploading: true, uploadError: null });
    try {
      const response = await uploadVideo(formData);
      const newVideo = response.data;
      set((state) => ({
        videos: [newVideo, ...state.videos],
        currentVideo: newVideo,
        isUploading: false,
        uploadError: null
      }));
      return { success: true, data: newVideo };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      set({ 
        isUploading: false, 
        uploadError: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  fetchAllVideos: async () => {
    set({ isFetchingVideos: true, fetchVideosError: null });
    try {
      const videos = await getAllVideos();
      set({ 
        videos: videos,
        isFetchingVideos: false, 
        fetchVideosError: null 
      });
      return { success: true, data: videos };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch videos';
      set({ 
        isFetchingVideos: false, 
        fetchVideosError: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  checkVideoStatus: async (videoId) => {
    set({ isFetchingStatus: true, statusError: null });
    try {
      const video = await getVideoStatus(videoId);
      set((state) => ({
        videos: state.videos.map(v => 
          v._id === videoId ? video : v
        ),
        currentVideo: state.currentVideo?._id === videoId ? video : state.currentVideo,
        isFetchingStatus: false,
        statusError: null
      }));
      return { success: true, data: video };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch status';
      set({ 
        isFetchingStatus: false, 
        statusError: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  generateSummary: async (videoId, timestamp, type = 'medium') => {
    set({ isGeneratingSummary: true, summaryError: null, summary: null });
    try {
      const response = await getSummary(videoId, timestamp, type);
      set({ 
        summary: response.data,
        isGeneratingSummary: false, 
        summaryError: null 
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Summary generation failed';
      set({ 
        isGeneratingSummary: false, 
        summaryError: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  setCurrentVideo: (video) => {
    set({ currentVideo: video });
  },

  clearSummary: () => {
    set({ summary: null, summaryError: null });
  },

  clearErrors: () => {
    set({ 
      uploadError: null,
      fetchVideosError: null,
      statusError: null, 
      summaryError: null 
    });
  }
}));
