import React from 'react';

export const ErrorTest: React.FC = () => {
  const [shouldError, setShouldError] = React.useState(false);

  if (shouldError) {
    throw new Error('Test error to trigger error boundary');
  }

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Error Boundary Test</h1>
      <p className="mb-4">Click the button below to trigger the office-themed error boundary.</p>
      <button
        onClick={() => setShouldError(true)}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Trigger Error
      </button>
    </div>
  );
};