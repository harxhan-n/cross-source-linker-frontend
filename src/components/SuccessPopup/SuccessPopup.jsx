import React from 'react';
import './SuccessPopup.css';

export default function SuccessPopup({ isOpen, onClose, batchData, onNavigateToBatchResults }) {
  if (!isOpen || !batchData) return null;

  const { data, message } = batchData;

  const handleViewResults = () => {
    if (onNavigateToBatchResults && data) {
      onNavigateToBatchResults({
        batch_id: data.batch_id,
        batch_name: data.batch_name
      });
      onClose(); // Close the popup after navigation
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div className="success-icon">✅</div>
          <h2>{message}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="popup-body">
          
          <div className="results-grid">
            <div className="result-card matched">
              <div className="result-header">
                <span className="result-icon">🎯</span>
                <span className="result-title">Matched</span>
              </div>
              <div className="result-count">{data.matched_data.count}</div>
            </div>
            
            <div className="result-card suspected">
              <div className="result-header">
                <span className="result-icon">🤔</span>
                <span className="result-title">Suspected</span>
              </div>
              <div className="result-count">{data.suspected_data.count}</div>
            </div>
            
            <div className="result-card unmatched-source">
              <div className="result-header">
                <span className="result-icon">📋</span>
                <span className="result-title">Unmatched Source</span>
              </div>
              <div className="result-count">{data.unmatched_source_data.count}</div>
            </div>
            
            <div className="result-card unmatched-target">
              <div className="result-header">
                <span className="result-icon">📄</span>
                <span className="result-title">Unmatched Target</span>
              </div>
              <div className="result-count">{data.unmatched_target_data.count}</div>
            </div>
          </div>
        </div>
        
        <div className="popup-footer">
          <button className="btn-secondary" onClick={onClose}>
            Stay Here
          </button>
          <button className="btn-primary" onClick={handleViewResults}>
            View Results
          </button>
        </div>
      </div>
    </div>
  );
}