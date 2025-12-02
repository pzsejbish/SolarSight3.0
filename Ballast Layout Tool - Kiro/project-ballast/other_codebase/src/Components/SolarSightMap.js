import React, { useEffect, useRef, memo } from 'react';
import { GoogleMap } from '@react-google-maps/api';

const SolarSightMap = memo(({ 
    isLoaded,
    mapCenter,
    zoom,
    options,
    onMapLoad,
    onMapUnmount,
    setbackPolygon,
    panelPolygons,
    selectedPolygonIndex
}) => {
  const mapRef = useRef(null);

  useEffect(() => {
    return () => {
      if (onMapUnmount) {
        onMapUnmount();
      }
    };
  }, [onMapUnmount]);

  useEffect(() => {
    if (setbackPolygon && mapRef.current) {
      setbackPolygon.setMap(mapRef.current);
      console.log("Setback polygon added to map");
    }
  }, [setbackPolygon]);

  useEffect(() => {
    if (panelPolygons.length > 0 && mapRef.current) {
      panelPolygons.forEach(panel => panel.setMap(mapRef.current));
      console.log(`${panelPolygons.length} panels added to map`);
    }
  }, [panelPolygons]);

  // LoadScript in App.js ensures Google Maps is loaded before this component renders
  console.log('🗺️ SolarSightMap rendering, window.google:', !!window.google);
  console.log('🗺️ SolarSightMap props:', { isLoaded, hasMapCenter: !!mapCenter, zoom });
  
  if (!window.google) {
    console.log('⚠️ Google Maps not loaded yet in SolarSightMap');
    return <div>Loading map...</div>;
  }
  
  console.log('✅ Google Maps available, rendering GoogleMap component');

  const handleMapLoad = (map) => {
    console.log('🗺️ SolarSightMap handleMapLoad called');
    console.log('📍 Map instance:', map);
    mapRef.current = map;
    onMapLoad(map);
    console.log('✅ SolarSightMap onMapLoad callback completed');
  };

  return (
    <GoogleMap
      mapContainerStyle={{ height: '100%', width: '100%' }}
      center={mapCenter}
      zoom={zoom || 20} // Use provided zoom or default to 20
      tilt={0} // Top-down view
      heading={0} // No rotation
      options={{ 
        mapTypeId: 'satellite', // Satellite only
        mapTypeControl: false, // Disable map type switching
        fullscreenControl: false,
        streetViewControl: false,
        rotateControl: false, // Disable rotation
        tiltControl: false, // Disable tilt
        zoomControl: true, // Keep zoom controls
        scaleControl: true,
        gestureHandling: 'greedy', // Allow panning/zooming without ctrl key
        disableDefaultUI: false,
        maxZoom: 23, // Allow zooming in very close
        minZoom: 19  // Restrict zoom out to hide imagery boundary
      }}
      onLoad={handleMapLoad}
    />
  );
});

export default SolarSightMap;