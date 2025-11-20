/**
 * WorkflowControlPanel.js
 * Shows current workflow step and navigation buttons
 */

import React from 'react';

const WorkflowControlPanel = ({ 
  currentStep,
  onNext,
  onBack,
  canGoNext = true,
  canGoBack = true
}) => {
  const steps = [
    { id: 'building', label: 'Draw Building Outline', description: 'Click points to trace your building' },
    { id: 'building-edit', label: 'Edit Building Outline', description: 'Drag points to adjust your outline' },
    { id: 'obstructions', label: 'Draw Obstructions', description: 'Mark vents, skylights, and HVAC units' },
    { id: 'obstructions-edit', label: 'Edit Obstructions', description: 'Drag points to adjust obstruction shapes' },
    { id: 'arrays', label: 'Create Panel Arrays', description: 'Click and drag to place solar panels' }
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
      border: '2px solid #4CAF50'
    }}>
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
                backgroundColor: index <= currentStepIndex ? '#4CAF50' : '#E0E0E0',
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
          Step {currentStepIndex + 1} of {steps.length}
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
      </div>

      {/* Navigation buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '10px',
        justifyContent: 'center'
      }}>
        {canGoBack && currentStepIndex > 0 && (
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
        
        {canGoNext && currentStepIndex < steps.length - 1 && (
          <button
            onClick={onNext}
            style={{
              padding: '10px 24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
          >
            Next →
          </button>
        )}
      </div>

      {/* Helper text for editing */}
      {currentStep === 'building-edit' && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#E8F5E9',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#2E7D32',
          textAlign: 'center'
        }}>
          💡 Tip: Drag the points on your building outline to adjust the shape
        </div>
      )}
      
      {currentStep === 'obstructions' && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#FFEBEE',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#C62828',
          textAlign: 'center'
        }}>
          🔴 Draw polygons around roof obstructions • Click "Next" when done
        </div>
      )}
      
      {currentStep === 'obstructions-edit' && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#FFEBEE',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#C62828',
          textAlign: 'center'
        }}>
          💡 Tip: Drag the points on obstruction outlines to fine-tune their shapes
        </div>
      )}
    </div>
  );
};

export default WorkflowControlPanel;
