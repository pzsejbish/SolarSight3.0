import React, { useRef, useEffect, useState } from 'react';

const MyMapComponent = ({ center, zoom }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    // Check if Google Maps is loaded
    if (window.google && !map) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        mapTypeId: 'satellite',
        tilt: 0
      });
      setMap(newMap);
    }
  }, [center, zoom, map]);

  useEffect(() => {
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);

      // Check if a marker already exists
      if (markerRef.current) {
        // If it does, just update its position
        markerRef.current.setPosition(center);
      } else {
        // If not, create a new marker and save the reference
        markerRef.current = new window.google.maps.Marker({
          position: center,
          map: map,
        });
      }
    }
  }, [map, center, zoom]);

  // Cleanup function to remove the marker when the component unmounts
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, []);

  // Return the map container
  return (
    <div tabIndex="-1" style={{ height: '500px', width: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default MyMapComponent;