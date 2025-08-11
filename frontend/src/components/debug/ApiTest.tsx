import React, { useState } from 'react';
import axios from 'axios';

const ApiTest: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testEndpoints = async () => {
    setLoading(true);
    const tests = {
      health: '/health',
      loans: '/loans',
      loansSummary: '/loans/summary'
    };

    const results: any = {};

    for (const [name, endpoint] of Object.entries(tests)) {
      try {
        console.log(`Testing ${name}: ${axios.defaults.baseURL}${endpoint}`);
        const response = await axios.get(endpoint);
        results[name] = {
          status: 'success',
          data: response.data,
          statusCode: response.status
        };
      } catch (error: any) {
        results[name] = {
          status: 'error',
          error: error.message,
          statusCode: error.response?.status,
          data: error.response?.data
        };
      }
    }

    setResults(results);
    setLoading(false);
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">API Connection Test</h3>
      <p className="mb-2">Base URL: {axios.defaults.baseURL}</p>
      
      <button
        onClick={testEndpoints}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Endpoints'}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Results:</h4>
          {Object.entries(results).map(([name, result]: [string, any]) => (
            <div key={name} className="mb-3 p-3 border rounded">
              <h5 className="font-medium">{name}</h5>
              <p className={`text-sm ${result.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                Status: {result.status} ({result.statusCode})
              </p>
              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(result.status === 'success' ? result.data : result.error, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiTest;