import React, { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Stage } from "@react-three/drei";
import { SolarPanel } from "./SolarPanel";
import * as THREE from "three";

export function SolarPanelScene({
  totalRotationAngle = 0,
  tiltAngleDegrees = 30,
  isClockwise = true,
}) {
  const [combinedRotation, setCombinedRotation] = useState(new THREE.Euler());

  useEffect(() => {
    // Convert totalRotationAngle to radians and invert the angle for correct rotation
    const totalRotationRad = THREE.MathUtils.degToRad(-totalRotationAngle + 90);

    // If polygon was drawn counterclockwise, add PI radians (180 degrees) to flip the panel
    const rotationAdjustment = isClockwise ? 0 : Math.PI;

    // Update combined rotation based on totalRotationAngle
    const updatedCombinedRotation = new THREE.Euler(
      -Math.PI / 2, // Keeps the panel flat on the XZ plane
      0, // No Y-axis rotation
      totalRotationRad + rotationAdjustment // Z-axis rotation to match the grid
    );

    setCombinedRotation(updatedCombinedRotation);
  }, [totalRotationAngle, isClockwise]);

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 50, position: [0, 75, 100] }}>
      <Suspense fallback={null}>
        <Stage environment="studio" intensity={0.6}>
          <group rotation={combinedRotation}>
            <SolarPanel tiltAngleDegrees={tiltAngleDegrees} />
          </group>
        </Stage>
      </Suspense>
      <Environment preset="studio" />
    </Canvas>
  );
}

export default SolarPanelScene;
