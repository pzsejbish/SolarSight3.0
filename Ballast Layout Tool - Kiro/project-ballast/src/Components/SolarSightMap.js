import React, { useEffect, useRef } from "react";
import { GoogleMap, DrawingManager } from "@react-google-maps/api";

function SolarSightMap({
  isLoaded,
  mapCenter,
  zoom,
  options,
  drawingManagerOptions,
  onMapLoad,
  onMapUnmount,
  onPolygonComplete,
  setbackPolygon,
  panelPolygons,
  polygons,
  selectedPolygonIndex,
}) {
  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={mapCenter}
      zoom={zoom}
      options={options}
      onLoad={onMapLoad}
      onUnmount={onMapUnmount}
    >
      {/* Map content will be rendered here */}
    </GoogleMap>
  );
}

export default SolarSightMap;
