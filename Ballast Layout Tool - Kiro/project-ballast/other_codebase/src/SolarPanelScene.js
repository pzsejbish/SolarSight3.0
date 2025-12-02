// SolarPanelScene.js
import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Stage } from '@react-three/drei';
import { SolarPanel } from './SolarPanel';
import * as THREE from 'three';

export function SolarPanelScene({ totalRotationAngle = 0, tiltAngleDegrees = 30, isClockwise = true }) {
  // Initialize with default rotation (0 degrees) to prevent cold start issues
  const [combinedRotation, setCombinedRotation] = useState(() => {
    const defaultRotationRad = THREE.MathUtils.degToRad(90); // Default 0° + 90° offset
    return new THREE.Euler(
      -Math.PI / 2, // Keeps the panel flat on the XZ plane
      0,            // No Y-axis rotation
      defaultRotationRad // Default Z-axis rotation
    );
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    console.log('🎨 SolarPanelScene updating rotation:', {
      totalRotationAngle,
      tiltAngleDegrees,
      isClockwise
    });

    try {
      // Convert totalRotationAngle to radians and invert the angle for correct rotation
      const totalRotationRad = THREE.MathUtils.degToRad(-totalRotationAngle + 90);

      // If polygon was drawn counterclockwise, add PI radians (180 degrees) to flip the panel
      const rotationAdjustment = isClockwise ? 0 : Math.PI;

      // Update combined rotation based on totalRotationAngle
      const updatedCombinedRotation = new THREE.Euler(
        -Math.PI / 2, // Keeps the panel flat on the XZ plane
        0,            // No Y-axis rotation
        totalRotationRad + rotationAdjustment // Z-axis rotation to match the grid
      );

      setCombinedRotation(updatedCombinedRotation);
      console.log('🎨 SolarPanelScene rotation updated successfully to', totalRotationAngle, '°');
    } catch (error) {
      console.error('🎨 ERROR in SolarPanelScene rotation calculation:', error);
      setHasError(true);
    }
  }, [totalRotationAngle, isClockwise, tiltAngleDegrees]);

  if (hasError) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        color: '#999',
        fontSize: '12px'
      }}>
        3D Preview unavailable
      </div>
    );
  }

  return (
    <Canvas
      key="solar-panel-canvas-stable" // Stable key to prevent remounting
      shadows
      dpr={[1, 2]}
      camera={{ fov: 50, position: [0, 75, 100] }}
      onCreated={() => console.log('🎨 Canvas created successfully')}
      onError={(error) => {
        console.error('🎨 Canvas error:', error);
        setHasError(true);
      }}
      gl={{ preserveDrawingBuffer: true }} // Prevent WebGL context loss
    >
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
