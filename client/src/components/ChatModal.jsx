import { useState, useEffect, useRef } from 'react';
import { chatWithVideo, getChatHistory, deleteChatHistory } from '../api/videoApi';

const ChatModal = ({ video, isOpen, onClose, onJumpToTime }) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history when modal opens
  useEffect(() => {
    if (isOpen && video?._id) {
      loadChatHistory();
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, video?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(video._id);
      setMessages(history.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setMessages([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim() || isLoading) return;

    const userQuestion = question.trim();
    setQuestion('');
    setError(null);

    // Add user message to UI immediately
    const userMessage = {
      question: userQuestion,
      answer: '',
      chunks: [],
      createdAt: new Date(),
      isUser: true
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatWithVideo(video._id, userQuestion);
      
      // Update the message with the answer
      setMessages(prev => prev.map((msg, idx) => 
        idx === prev.length - 1 
          ? {
              ...msg,
              answer: response.data.answer,
              chunks: response.data.chunks,
              timestamps: response.data.timestamps,
              createdAt: new Date()
            }
          : msg
      ));
    } catch (error) {
      console.error('Chat error:', error);
      setError(error.response?.data?.message || 'Failed to get answer. Please try again.');
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history?')) return;

    try {
      await deleteChatHistory(video._id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      setError('Failed to clear chat history');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Chat with Video</h2>
            <p className="text-sm text-gray-400 mt-1">{video?.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                title="Clear chat history"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-400">Ask a question about this video to get started</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className="space-y-3">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]">
                  <p className="text-sm">{message.question}</p>
                </div>
              </div>

              {/* AI Answer */}
              {message.answer && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.answer}</p>
                    
                    {/* Timestamps */}
                    {message.timestamps && message.timestamps.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <p className="text-xs text-gray-400 mb-2">Answer from:</p>
                        <div className="flex flex-wrap gap-2">
                          {message.timestamps.map((ts, tsIdx) => (
                            <button
                              key={tsIdx}
                              onClick={() => onJumpToTime(ts.start)}
                              className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition-colors"
                            >
                              {ts.formatted}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {!message.answer && isLoading && index === messages.length - 1 && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-2">
            <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-6 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this video..."
              disabled={isLoading || video?.status !== 'ready'}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!question.trim() || isLoading || video?.status !== 'ready'}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          {video?.status !== 'ready' && (
            <p className="mt-2 text-xs text-yellow-400">
              ⚠ Video must be in "ready" status to chat. Current status: {video?.status}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatModal;

