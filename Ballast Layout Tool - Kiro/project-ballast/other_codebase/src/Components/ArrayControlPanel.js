/**
 * ArrayControlPanel.js
 * UI controls for managing arrays - rotation, deletion, selection
 */

import React, { useState, useCallback } from 'react';

const ArrayControlPanel = ({ 
  arrays, 
  selectedArrayId,
  onSelectArray,
  onEditArray,
  onDeleteArray,
  onToggleCreationMode,
  isCreationMode
}) => {
  const selectedArray = arrays.find(a => a.id === selectedArrayId);

  const handleDeleteArray = useCallback((arrayId, e) => {
    e.stopPropagation(); // Prevent dropdown from changing
    if (window.confirm('Delete this array?')) {
      onDeleteArray(arrayId);
    }
  }, [onDeleteArray]);

  const handleEditArray = useCallback((arrayId, e) => {
    e.stopPropagation(); // Prevent dropdown from changing
    onEditArray(arrayId);
  }, [onEditArray]);

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '5px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold' }}>
        Array Controls
      </h3>

      {/* Creation Mode Toggle */}
      <button
        onClick={onToggleCreationMode}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '15px',
          backgroundColor: isCreationMode ? '#4CAF50' : '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px'
        }}
      >
        {isCreationMode ? '✓ Creating Arrays' : 'Create New Array'}
      </button>

      {/* Array List with inline actions */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666'
        }}>
          Arrays ({arrays.length})
        </label>
        
        {arrays.length === 0 ? (
          <div style={{
            padding: '15px',
            textAlign: 'center',
            color: '#999',
            fontSize: '12px',
            fontStyle: 'italic',
            backgroundColor: '#f9f9f9',
            borderRadius: '3px',
            border: '1px dashed #ddd'
          }}>
            No arrays yet. Click "Create New Array" to start.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {arrays.map(array => (
              <div
                key={array.id}
                onClick={() => onSelectArray(array.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: selectedArrayId === array.id ? '#e3f2fd' : '#f5f5f5',
                  border: selectedArrayId === array.id ? '2px solid #2196F3' : '1px solid #ddd',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '13px'
                }}
                onMouseEnter={(e) => {
                  if (selectedArrayId !== array.id) {
                    e.currentTarget.style.backgroundColor = '#fafafa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedArrayId !== array.id) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }
                }}
              >
                {/* Array Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                    Array {array.id}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {array.rows}×{array.cols} panels • {array.rotation}°
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  {/* Edit Button */}
                  <button
                    onClick={(e) => handleEditArray(array.id, e)}
                    title="Edit array"
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
                  >
                    ✏️
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteArray(array.id, e)}
                    title="Delete array"
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f44336'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tip */}
      {!isCreationMode && arrays.length > 0 && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f0f7ff',
          borderRadius: '3px',
          fontSize: '11px',
          lineHeight: '1.4',
          color: '#555'
        }}>
          💡 <strong>Tip:</strong> Click ✏️ to edit an array's orientation, rows, or columns.
        </div>
      )}
    </div>
  );
};

export default React.memo(ArrayControlPanel);
