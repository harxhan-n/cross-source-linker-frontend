import React from 'react';
import './Popup.css';

export default function Popup({ 
  isVisible, 
  onClose, 
  type = 'info', // 'success', 'error', 'warning', 'confirm'
  title, 
  message, 
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'confirm':
        return '❓';
      default:
        return 'ℹ️';
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className={`popup-container ${type}`}>
        <div className="popup-header">
          <div className="popup-icon">{getIcon()}</div>
          <h3 className="popup-title">{title}</h3>
          <button className="popup-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="popup-content">
          <p className="popup-message">{message}</p>
        </div>
        
        <div className="popup-actions">
          {type === 'confirm' ? (
            <>
              <button className="popup-btn popup-btn-secondary" onClick={onClose}>
                {cancelText}
              </button>
              <button className="popup-btn popup-btn-primary" onClick={onConfirm}>
                {confirmText}
              </button>
            </>
          ) : (
            <button className="popup-btn popup-btn-primary" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}