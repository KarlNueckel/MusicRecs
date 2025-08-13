import { useState } from 'react';

export default function Debug() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-connection');
      const result = await response.json();
      setTestResults({ type: 'connection', data: result });
    } catch (error) {
      setTestResults({ type: 'connection', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'fiction',
          userInterests: '',
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setTestResults({ type: 'recommendations', error: errorData });
      } else {
        const result = await response.json();
        setTestResults({ type: 'recommendations', data: result });
      }
    } catch (error) {
      setTestResults({ type: 'recommendations', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Debug Page</h1>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Main Page
          </button>
        </div>
      
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="space-y-6">
          <div>
            <button 
              onClick={testConnection}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Test Weaviate Connection
            </button>
          </div>
          
          <div>
            <button 
              onClick={testRecommendations}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Test Recommendations API
            </button>
          </div>
          
          {loading && (
            <div className="text-purple-300 text-lg font-medium">Testing...</div>
          )}
          
          {testResults && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Test Results: {testResults.type}
              </h2>
              <pre className="bg-white/10 backdrop-blur-lg border border-white/20 text-white p-6 rounded-xl overflow-auto max-h-96 text-sm">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
