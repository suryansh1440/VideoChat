import { useState } from 'react';
import UploadPage from './pages/UploadPage';
import SummaryPage from './pages/SummaryPage';

const App = () => {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">VideoChat</h1>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Upload Video
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'summary'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Generate Summary
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main>
        {activeTab === 'upload' && <UploadPage />}
        {activeTab === 'summary' && <SummaryPage />}
      </main>
    </div>
  );
};

export default App;
