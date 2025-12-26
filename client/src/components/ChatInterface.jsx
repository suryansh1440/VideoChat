import { useState, useEffect, useRef } from 'react';
import { chatWithVideo, getChatHistory, deleteChatHistory } from '../api/videoApi';

// Audio Player Component
const AudioPlayer = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = () => {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };
      
      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Audio play error:', error);
          setIsLoading(false);
        });
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className="shrink-0 p-2 bg-gray-600 hover:bg-gray-500 rounded-full transition-colors disabled:opacity-50"
      title={isPlaying ? "Pause audio" : "Play audio"}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : isPlaying ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
};

const ChatInterface = ({ video, onJumpToTime }) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history when component mounts
  useEffect(() => {
    if (video?._id) {
      loadChatHistory();
    }
  }, [video?._id]);

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
              audioUrl: response.data.audioUrl,
              chunks: response.data.chunks,
              timestamps: response.data.timestamps,
              createdAt: new Date()
            }
          : msg
      ));
    } catch (error) {
      console.error('Chat error:', error);
      
      // Extract error message from response
      let errorMessage = 'Failed to get answer. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        
        // Add helpful hints if available
        if (error.response.data.hint) {
          errorMessage += `\n\n💡 ${error.response.data.hint}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700 shrink-0">
        <h3 className="text-lg font-semibold text-white">Chat with Video</h3>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            title="Clear chat history"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages - Fixed Height Scrollable Box */}
      <div 
        className="overflow-y-auto space-y-4 mb-4 pr-2 chat-messages shrink-0 bg-gray-900 rounded-lg p-4 border border-gray-700" 
        style={{ 
          height: '400px',
          maxHeight: '400px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937'
        }}
      >
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-400 text-sm">Ask a question about this video to get started</p>
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
                <div className="bg-gray-700 text-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] relative">
                  <div className="flex items-start gap-2">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed flex-1">{message.answer}</p>
                    {/* Audio Play Button */}
                    {message.audioUrl && (
                      <AudioPlayer audioUrl={message.audioUrl} />
                    )}
                  </div>
                  
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
        <div className="mb-4 shrink-0">
          <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-lg p-3">
            <p className="text-red-200 text-sm whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 pt-4 shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this video..."
            disabled={isLoading || video?.status !== 'ready'}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading || video?.status !== 'ready'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
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
  );
};

export default ChatInterface;

