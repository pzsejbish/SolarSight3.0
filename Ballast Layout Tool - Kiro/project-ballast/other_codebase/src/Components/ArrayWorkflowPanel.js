/**
 * ArrayWorkflowPanel.js
 * Shows array creation workflow steps with Next/Back navigation
 */

import React from 'react';

const ArrayWorkflowPanel = ({ 
  currentStep,
  onNext,
  onBack,
  onRotate,
  canGoNext = true,
  canGoBack = true,
  arrayCount = 0,
  rowCount = 0,
  colCount = 0
}) => {
  const steps = [
    { id: 'origin', label: 'Place Origin Point', description: 'Click to place array origin, drag to adjust' },
    { id: 'rotate', label: 'Set Panel Orientation', description: 'Rotate panel 90° if needed' },
    { id: 'rows', label: 'Set Row Length', description: 'Drag arrows to add panels horizontally' },
    { id: 'columns', label: 'Set Column Length', description: 'Drag arrows to add panels vertically' },
    { id: 'finalize', label: 'Finalize Array', description: 'Review and confirm your array' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const currentStepData = steps[currentStepIndex];

  if (!currentStepData) return null;

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      border: '2px solid #2196F3'
    }}>
      {/* Array count badge */}
      <div style={{
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        backgroundColor: '#4CAF50',
        color: 'white',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        {arrayCount}
      </div>

      {/* Progress indicator */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          {steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: index <= currentStepIndex ? '#2196F3' : '#E0E0E0',
                marginRight: index < steps.length - 1 ? '4px' : '0',
                borderRadius: '2px',
                transition: 'background-color 0.3s'
              }}
            />
          ))}
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: '#666',
          textAlign: 'center'
        }}>
          Array Step {currentStepIndex + 1} of {steps.length}
        </div>
      </div>

      {/* Current step info */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#333',
          marginBottom: '5px'
        }}>
          {currentStepData.label}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          {currentStepData.description}
        </div>
        
        {/* Array size info */}
        {(currentStep === 'rows' || currentStep === 'columns') && (
          <div style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#F5F5F5',
            borderRadius: '20px',
            display: 'inline-block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#333'
          }}>
            {currentStep === 'rows' && `${rowCount} panel${rowCount !== 1 ? 's' : ''} in row`}
            {currentStep === 'columns' && `${rowCount} × ${colCount} = ${rowCount * colCount} total panels`}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '10px',
        justifyContent: 'center'
      }}>
        {canGoBack && (
          <button
            onClick={onBack}
            style={{
              padding: '10px 24px',
              backgroundColor: '#757575',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#616161'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#757575'}
          >
            ← Back
          </button>
        )}
        
        {canGoNext && (
          <button
            onClick={onNext}
            style={{
              padding: '10px 24px',
              backgroundColor: currentStep === 'finalize' ? '#4CAF50' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = currentStep === 'finalize' ? '#45a049' : '#1976D2'}
            onMouseOut={(e) => e.target.style.backgroundColor = currentStep === 'finalize' ? '#4CAF50' : '#2196F3'}
          >
            {currentStep === 'finalize' ? '✓ Save Array' : 'Next →'}
          </button>
        )}
      </div>

      {/* Helper text */}
      {currentStep === 'origin' && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#E3F2FD',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#1565C0',
          textAlign: 'center'
        }}>
          💡 Click inside the green area to place origin • Drag the green marker to adjust
        </div>
      )}
      
      {currentStep === 'rotate' && onRotate && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#FFF3E0',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#E65100', marginBottom: '8px' }}>
            🔄 Panel is aligned with building edge
          </div>
          <div style={{ fontSize: '11px', color: '#F57C00', marginBottom: '10px', fontStyle: 'italic' }}>
            👁️ Check the 3D preview in the sidebar to see panel tilt direction
          </div>
          <button
            onClick={onRotate}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#F57C00'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#FF9800'}
          >
            <span style={{ fontSize: '18px' }}>↻</span>
            <span>Rotate Panel 90°</span>
          </button>
        </div>
      )}
      
      {currentStep === 'rows' && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#E8F5E9',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#2E7D32',
          textAlign: 'center'
        }}>
          🟢 Drag green arrows left/right to set row length
        </div>
      )}
      
      {currentStep === 'columns' && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#E3F2FD',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#1565C0',
          textAlign: 'center'
        }}>
          🔵 Drag blue arrows up/down to set column length
        </div>
      )}
    </div>
  );
};

export default ArrayWorkflowPanel;
