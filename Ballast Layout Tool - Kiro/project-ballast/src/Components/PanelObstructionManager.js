import React from "react";

function PanelObstructionManager({
  polygons,
  setPolygons,
  selectedPolygonIndex,
  mapRef,
  formData,
  addTextOverlay,
}) {
  // Placeholder component for panel obstruction management
  return (
    <div
      style={{
        padding: "10px",
        backgroundColor: "#f5f5f5",
        borderRadius: "5px",
        border: "1px solid #ddd",
      }}
    >
      <h4
        style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: "bold" }}
      >
        Panel Obstructions
      </h4>
      <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
        Obstruction management tools
      </p>
    </div>
  );
}

export default PanelObstructionManager;
