import React from "react";

function SolarPanelScene({
  totalRotationAngle,
  tiltAngleDegrees,
  isClockwise,
}) {
  // Placeholder 3D scene component
  // This would normally use Three.js / React Three Fiber
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#e0e0e0",
        color: "#666",
        fontSize: "12px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div>3D Panel Preview</div>
        <div style={{ fontSize: "10px", marginTop: "5px" }}>
          Rotation: {totalRotationAngle}° | Tilt: {tiltAngleDegrees}°
        </div>
      </div>
    </div>
  );
}

export default SolarPanelScene;
