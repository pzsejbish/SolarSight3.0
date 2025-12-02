// useGoogleMapsApi.js
import { useState, useEffect } from 'react';

const useGoogleMapsApi = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places,drawing,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }

    return () => {
      // Clean up script if needed
      const script = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
      if (script) {
        script.remove();
      }
    };
  }, []);

  return isLoaded;
};

export default useGoogleMapsApi;
