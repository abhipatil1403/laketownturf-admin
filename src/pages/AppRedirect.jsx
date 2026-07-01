import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const AppRedirect = () => {
  const location = useLocation();

  useEffect(() => {
    // Attempt to open the Android app via custom scheme
    const customSchemeUrl = `laketownturf:/${location.pathname}${location.search}`;
    
    // Slight delay to allow the UI to render before redirecting
    const timer = setTimeout(() => {
      window.location.replace(customSchemeUrl);
    }, 500);

    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className="min-h-screen bg-darkNavy flex flex-col items-center justify-center text-textSecondary p-4 text-center font-sans">
      <div className="w-16 h-16 border-4 border-primaryGreen border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-2xl font-bold text-white mb-4">Opening Lake Town Turf...</h2>
      <p className="mb-8">If the app does not open automatically, please tap the button below.</p>
      <a 
        href={`laketownturf:/${location.pathname}${location.search}`}
        className="px-6 py-3 bg-primaryGreen text-darkNavy font-semibold rounded-lg hover:bg-opacity-90 transition-all shadow-lg"
      >
        Open in App
      </a>
      <p className="mt-12 text-sm opacity-70">Don't have the app? Please install it to view this link.</p>
    </div>
  );
};

export default AppRedirect;
