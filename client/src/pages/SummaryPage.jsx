import { useState, useEffect } from 'react';
import { useVideoStore } from '../store/useVideoStore';

const SummaryPage = () => {
  const { 
    generateSummary, 
    isGeneratingSummary, 
    summary, 
    summaryError,
    checkVideoStatus,
    isFetchingStatus,
    currentVideo
  } = useVideoStore();

  const [videoId, setVideoId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [summaryType, setSummaryType] = useState('medium');
  const [videoStatus, setVideoStatus] = useState(null);

  useEffect(() => {
    if (currentVideo) {
      setVideoId(currentVideo._id);
      checkStatus(currentVideo._id);
    }
  }, [currentVideo]);

  const checkStatus = async (id) => {
    if (!id) return;
    const result = await checkVideoStatus(id);
    if (result.success) {
      setVideoStatus(result.data);
    }
  };

  const handleGenerateSummary = async (e) => {
    e.preventDefault();

    if (!videoId.trim()) {
      alert('Please enter a video ID');
      return;
    }

    const numericTimestamp = Number(timestamp);
    if (isNaN(numericTimestamp) || numericTimestamp < 0) {
      alert('Please enter a valid timestamp (in seconds)');
      return;
    }

    await generateSummary(videoId, numericTimestamp, summaryType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Generate Summary</h1>
          <p className="text-gray-600 mb-8">Get AI-generated summaries for specific timestamps in your video</p>

          {videoStatus && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Video Status</p>
                  <p className="text-sm text-blue-700">
                    Status: <span className={`font-semibold ${
                      videoStatus.status === 'ready' ? 'text-green-600' :
                      videoStatus.status === 'processing' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {videoStatus.status?.toUpperCase()}
                    </span>
                  </p>
                </div>
                {videoStatus.status === 'processing' && (
                  <button
                    onClick={() => checkStatus(videoId)}
                    disabled={isFetchingStatus}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isFetchingStatus ? 'Checking...' : 'Refresh'}
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleGenerateSummary} className="space-y-6">
            <div>
              <label htmlFor="videoId" className="block text-sm font-medium text-gray-700 mb-2">
                Video ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="videoId"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter video ID"
                disabled={isGeneratingSummary}
                required
              />
              {currentVideo && (
                <p className="mt-1 text-sm text-gray-500">Current video: {currentVideo.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-2">
                  Timestamp (seconds) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="timestamp"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., 45"
                  min="0"
                  step="0.1"
                  disabled={isGeneratingSummary}
                  required
                />
              </div>

              <div>
                <label htmlFor="summaryType" className="block text-sm font-medium text-gray-700 mb-2">
                  Summary Type
                </label>
                <select
                  id="summaryType"
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isGeneratingSummary}
                >
                  <option value="short">Short (2-3 sentences)</option>
                  <option value="medium">Medium (1-2 paragraphs)</option>
                  <option value="detailed">Detailed (2-3 paragraphs)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGeneratingSummary || (videoStatus?.status !== 'ready')}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingSummary ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Summary...
                </span>
              ) : (
                'Generate Summary'
              )}
            </button>

            {videoStatus?.status !== 'ready' && videoStatus?.status !== undefined && (
              <p className="text-sm text-yellow-600 text-center">
                ⚠ Video must be in "ready" status to generate summaries. Current status: {videoStatus.status}
              </p>
            )}
          </form>
        </div>

        {summaryError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error: {summaryError}</p>
          </div>
        )}

        {summary && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Type</p>
                <p className="text-sm text-gray-600 capitalize">{summary.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Content</p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{summary.summary}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPage;

