import { useState, useRef, useEffect } from 'react';
import { useVideoStore } from '../store/useVideoStore';
import ChatInterface from '../components/ChatInterface';

const VideoPlayerPage = ({ video, onBack }) => {
  const { generateSummary, summary, isGeneratingSummary, summaryError } = useVideoStore();
  const videoRef = useRef(null);
  const activeViewRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [summaryType, setSummaryType] = useState('medium');
  const [activeView, setActiveView] = useState(null); // 'summary' or 'chat' or null

  // Keep ref in sync with state
  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let hasGeneratedSummaryForPause = false;

    const updateTime = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handleVideoEnd = async () => {
      // Automatically generate summary when video ends
      if (video && video.status === 'ready' && !isGeneratingSummary) {
        setActiveView('summary');
        await generateSummary(video._id, video.duration, summaryType);
      }
    };

    const handleVideoPause = () => {
      // Clear any existing timeout
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }

      // Only generate if video is paused and not at the end, and chat interface is NOT open
      if (video && video.status === 'ready' && !isGeneratingSummary && activeViewRef.current !== 'chat') {
        const pausedTime = videoElement.currentTime;
        const videoDuration = video.duration;
        
        // Don't generate if paused at the very end (let 'ended' event handle it)
        if (pausedTime < videoDuration - 1) {
          // Wait 2 seconds after pause before generating summary
          pauseTimeoutRef.current = setTimeout(async () => {
            // Check if video is still paused and chat interface is still not open
            if (videoElement.paused && !videoElement.ended && activeViewRef.current !== 'chat') {
              setActiveView('summary');
              await generateSummary(video._id, pausedTime, summaryType);
              hasGeneratedSummaryForPause = true;
            }
            pauseTimeoutRef.current = null;
          }, 2000); // 2 second delay
        }
      }
    };

    const handleVideoPlay = () => {
      // Clear timeout if user resumes playing
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      hasGeneratedSummaryForPause = false;
    };

    videoElement.addEventListener('timeupdate', updateTime);
    videoElement.addEventListener('ended', handleVideoEnd);
    videoElement.addEventListener('pause', handleVideoPause);
    videoElement.addEventListener('play', handleVideoPlay);
    
    return () => {
      videoElement.removeEventListener('timeupdate', updateTime);
      videoElement.removeEventListener('ended', handleVideoEnd);
      videoElement.removeEventListener('pause', handleVideoPause);
      videoElement.removeEventListener('play', handleVideoPlay);
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    };
  }, [video, isGeneratingSummary, summaryType, generateSummary]);

  const handleGetSummary = async () => {
    if (!video || video.status !== 'ready') {
      alert('Video is not ready yet. Please wait for processing to complete.');
      return;
    }

    setActiveView('summary');
    await generateSummary(video._id, currentTime, summaryType);
  };

  const handleChatClick = () => {
    setActiveView('chat');
    // Clear any pending summary generation timeout when opening chat
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleJumpToTime = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - Back Button Only */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-white hover:text-gray-300 transition-colors"
          >
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Videos
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Video Player */}
          <div>
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl ring-2 ring-gray-700/50">
              <video
                ref={videoRef}
                src={video.videoUrl}
                controls
                className="w-full h-auto"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
              />
            </div>
            
            {/* Title and Description Below Video */}
            <div className="mt-4">
              <h1 className="text-2xl font-bold text-white mb-2">{video.title}</h1>
              {video.description && (
                <p className="text-gray-400 text-sm leading-relaxed">{video.description}</p>
              )}
            </div>
          </div>

          {/* Right Side - Buttons and Content Box */}
          <div className="flex flex-col">
            {/* Action Buttons */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-xl border border-gray-700/50">
              <div className="flex gap-2">
                <button
                  onClick={handleGetSummary}
                  disabled={isGeneratingSummary || video.status !== 'ready'}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
                    activeView === 'summary'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 scale-105'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {isGeneratingSummary ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Summary
                    </>
                  )}
                </button>
                <button
                  onClick={handleChatClick}
                  disabled={video.status !== 'ready'}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
                    activeView === 'chat'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50 scale-105'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat
                </button>
              </div>
            </div>

            {/* Summary Type Selector (only show when summary view is active) */}
            {activeView === 'summary' && (
              <div className="mb-4 bg-gray-800/80 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 text-white rounded-lg border border-gray-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  disabled={isGeneratingSummary || video.status !== 'ready'}
                >
                  <option value="short">Short Summary</option>
                  <option value="medium">Medium Summary</option>
                  <option value="detailed">Detailed Summary</option>
                </select>
              </div>
            )}

            {/* Content Box */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 flex-1 min-h-[500px] flex flex-col border border-gray-700/50">
              {activeView === 'summary' && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700/50">
                    <h2 className="text-xl font-bold text-white">Summary</h2>
                    {summary && (
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-semibold rounded-full capitalize shadow-lg">
                        {summary.type}
                      </span>
                    )}
                  </div>
                  
                  {summaryError && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg backdrop-blur-sm">
                      <p className="text-red-200 text-sm">{summaryError}</p>
                    </div>
                  )}

                  {summary ? (
                    <div className="flex-1 overflow-y-auto pr-2">
                      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl p-5 border border-gray-700/50 shadow-inner">
                        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
                          {summary.summary}
                        </p>
                      </div>
                      {summary.timestamp && (
                        <p className="text-gray-500 text-xs mt-3 text-center">
                          Generated at {formatTime(summary.timestamp)} of {formatTime(video.duration)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="mb-4 p-4 bg-gray-900/50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                          <svg className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {isGeneratingSummary ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Generating summary...
                            </span>
                          ) : (
                            'Click "Summary" to generate or wait for video to finish'
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeView === 'chat' && (
                <ChatInterface video={video} onJumpToTime={handleJumpToTime} />
              )}

              {!activeView && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-6 p-6 bg-gray-900/50 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">Select an option above to get started</p>
                    <p className="text-gray-500 text-xs mt-2">Summary will auto-generate when video ends</p>
                  </div>
                </div>
              )}

              {video.status !== 'ready' && (
                <div className="mt-4 p-3 bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    ⚠ Video must be in "ready" status. Current status: {video.status}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerPage;

