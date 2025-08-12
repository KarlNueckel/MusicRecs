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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug Page</h1>
      
      <div className="space-y-4">
        <div>
          <button 
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            Test Weaviate Connection
          </button>
        </div>
        
        <div>
          <button 
            onClick={testRecommendations}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            Test Recommendations API
          </button>
        </div>
        
        {loading && (
          <div className="text-blue-600">Testing...</div>
        )}
        
        {testResults && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">
              Test Results: {testResults.type}
            </h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
