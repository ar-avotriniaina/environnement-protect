
import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4" role="status" aria-live="polite" aria-label="Chargement des actualités">
    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-500" aria-hidden="true"></div>
    <p className="ml-4 text-lg text-green-700">Chargement des actualités...</p>
    <span className="sr-only">Chargement en cours.</span>
  </div>
);

export default LoadingSpinner;
