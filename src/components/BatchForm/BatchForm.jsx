
import React, { useRef, useState } from 'react';
import './BatchForm.css';
import { batchApi } from '../../services/apiClient.js';
import SuccessPopup from '../SuccessPopup/SuccessPopup.jsx';

export default function BatchForm({ onBatchProcessed, onNavigateToBatchResults }) {
  const [batchName, setBatchName] = useState('');
  const [sourceFile, setSourceFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [dragSource, setDragSource] = useState(false);
  const [dragTarget, setDragTarget] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  // Create refs for hidden file inputs
  const sourceFileInputRef = useRef(null);
  const targetFileInputRef = useRef(null);

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) return;
    if (type === 'source') setSourceFile(file);
    else setTargetFile(file);
    setDragSource(false);
    setDragTarget(false);
  };

  const handleDragOver = (e, type) => {
    e.preventDefault();
    if (type === 'source') setDragSource(true);
    else setDragTarget(true);
  };

  const handleDragLeave = (type) => {
    if (type === 'source') setDragSource(false);
    else setDragTarget(false);
  };

  // Handle file input change
  const handleFileInputChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) return;
    if (type === 'source') setSourceFile(file);
    else setTargetFile(file);
  };

  // Handle dropzone click to trigger file input
  const handleDropzoneClick = (type) => {
    if (type === 'source') {
      sourceFileInputRef.current?.click();
    } else {
      targetFileInputRef.current?.click();
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!batchName.trim()) {
      setError('Please enter a batch name');
      return;
    }
    
    if (!sourceFile) {
      setError('Please select a source file');
      return;
    }
    
    if (!targetFile) {
      setError('Please select a target file');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await batchApi.processBatch(batchName.trim(), sourceFile, targetFile);
      
      if (response.status_code === 200) {
        setSuccessData(response);
        setShowSuccessPopup(true);
        
        // Reset form
        setBatchName('');
        setSourceFile(null);
        setTargetFile(null);
        
        // Reset file inputs
        if (sourceFileInputRef.current) sourceFileInputRef.current.value = '';
        if (targetFileInputRef.current) targetFileInputRef.current.value = '';
        
        // Trigger sidebar refresh to show the new batch
        if (onBatchProcessed) {
          onBatchProcessed();
        }
      } else {
        setError('Failed to process batch. Please try again.');
      }
    } catch (err) {
      console.error('Error processing batch:', err);
      setError('Failed to process batch. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    setSuccessData(null);
  };

  return (
    <>
      <form className="batch-form" autoComplete="off" onSubmit={handleSubmit}>
        <input 
          className="batch-name-input" 
          type="text" 
          placeholder="Enter the Batch Name"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          disabled={isLoading}
        />
        
        {error && <div className="error-message">{error}</div>}
      
      {/* Hidden file inputs */}
      <input
        ref={sourceFileInputRef}
        type="file"
        accept=".csv,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => handleFileInputChange(e, 'source')}
      />
      <input
        ref={targetFileInputRef}
        type="file"
        accept=".csv,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => handleFileInputChange(e, 'target')}
      />
      
      <div className="dropzone-row">
        <div
          className={`dropzone${dragSource ? ' drag-over' : ''}${sourceFile ? ' has-file' : ''}`}
          onDrop={e => handleDrop(e, 'source')}
          onDragOver={e => handleDragOver(e, 'source')}
          onDragLeave={() => handleDragLeave('source')}
          onClick={() => handleDropzoneClick('source')}
          tabIndex={0}
        >
          {sourceFile ? (
            <span className="file-label">{sourceFile.name}</span>
          ) : (
            <span>Drop your source document or <br />click to browse<br /><span className="file-types">.csv, .xlsx</span></span>
          )}
        </div>
        <div
          className={`dropzone${dragTarget ? ' drag-over' : ''}${targetFile ? ' has-file' : ''}`}
          onDrop={e => handleDrop(e, 'target')}
          onDragOver={e => handleDragOver(e, 'target')}
          onDragLeave={() => handleDragLeave('target')}
          onClick={() => handleDropzoneClick('target')}
          tabIndex={0}
        >
          {targetFile ? (
            <span className="file-label">{targetFile.name}</span>
          ) : (
            <span>Drop your target document or <br />click to browse<br /><span className="file-types">.csv, .xlsx</span></span>
          )}
        </div>
      </div>
      <button 
        className="find-match-btn" 
        type="submit" 
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Find Match'}
      </button>
    </form>
    
    <SuccessPopup
      isOpen={showSuccessPopup}
      onClose={handleCloseSuccessPopup}
      batchData={successData}
      onNavigateToBatchResults={onNavigateToBatchResults}
    />
    </>
  );
}
