import { useState, useRef, useEffect } from 'react';
import { useVideoStore } from '../store/useVideoStore';

const VideoPlayerPage = ({ video, onBack }) => {
  const { generateSummary, summary, isGeneratingSummary, summaryError } = useVideoStore();
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [summaryType, setSummaryType] = useState('medium');
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateTime = () => {
      setCurrentTime(videoElement.currentTime);
    };

    videoElement.addEventListener('timeupdate', updateTime);
    return () => videoElement.removeEventListener('timeupdate', updateTime);
  }, []);

  const handleGetSummary = async () => {
    if (!video || video.status !== 'ready') {
      alert('Video is not ready yet. Please wait for processing to complete.');
      return;
    }

    setShowSummary(true);
    await generateSummary(video._id, currentTime, summaryType);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-white hover:text-gray-300 transition-colors"
          >
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Videos
          </button>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white mb-1">{video.title}</h1>
            {video.description && (
              <p className="text-gray-400 text-sm">{video.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
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

            {/* Current Time Display */}
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Current Time</p>
                  <p className="text-white text-2xl font-bold">{formatTime(currentTime)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Duration</p>
                  <p className="text-white text-2xl font-bold">{formatTime(video.duration)}</p>
                </div>
              </div>
            </div>

            {/* Summary Button */}
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isGeneratingSummary || video.status !== 'ready'}
                >
                  <option value="short">Short Summary</option>
                  <option value="medium">Medium Summary</option>
                  <option value="detailed">Detailed Summary</option>
                </select>
                <button
                  onClick={handleGetSummary}
                  disabled={isGeneratingSummary || video.status !== 'ready'}
                  className="flex-1 bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isGeneratingSummary ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Summary...
                    </>
                  ) : (
                    'Get Summary at Current Time'
                  )}
                </button>
              </div>
              {video.status !== 'ready' && (
                <p className="mt-2 text-sm text-yellow-400">
                  ⚠ Video must be in "ready" status to generate summaries. Current status: {video.status}
                </p>
              )}
            </div>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 sticky top-8">
              <h2 className="text-xl font-bold text-white mb-4">Summary</h2>
              
              {summaryError && (
                <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg">
                  <p className="text-red-200 text-sm">{summaryError}</p>
                </div>
              )}

              {summary && showSummary ? (
                <div>
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full capitalize">
                      {summary.type}
                    </span>
                    <p className="text-gray-400 text-xs mt-2">
                      At {formatTime(currentTime)} of {formatTime(video.duration)}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {summary.summary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm">
                    Click "Get Summary at Current Time" to generate a summary for the current timestamp
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

