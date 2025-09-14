import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { batchApi } from '../../services/apiClient.js';

export default function Sidebar({ isOpen, onClose, refreshTrigger, onNavigateToConfiguration, onNavigateToBatchResults, currentView }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleToggle = () => {
    onClose(); // This will toggle the open state
  };

  // Fetch batches function
  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await batchApi.getAllBatches();
      
      if (response.status_code === 200 && response.data) {
        setBatches(response.data);
      } else {
        setError('Failed to load batches');
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  // Fetch batches on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchBatches();
  }, [refreshTrigger]);

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}> 
      <div className="sidebar-header" onClick={handleToggle}>
        <div className="logo-section">
          <div className="logo-icon">
           <img style={{ width: '30px', height: '30px', marginTop: '10px', marginLeft: '6px' }} src="https://img.icons8.com/ios-glyphs/30/12B886/conflict--v1.png" alt="conflict--v1"/>
          </div>
          <span className="logo-text">Cross Source Linker</span>
        </div>
        <div className="toggle-arrow">
          {isOpen ? '' : ''}
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <div 
          className={`nav-item ${currentView === 'configuration' ? 'active' : ''}`}
          onClick={onNavigateToConfiguration}
        >
          <span className="nav-icon">⚙️</span>
          <span>Configure Fields/ Rules</span>
        </div>
      </nav>

      <div className="processed-batches">
        <div className="batches-title">Recent Batches</div>
        {loading ? (
          <div className="batches-loading">Loading...</div>
        ) : error ? (
          <div className="batches-error">{error}</div>
        ) : (
          <ul>
            {batches.length > 0 ? (
              batches.map(batch => (
                <li 
                  key={batch.batch_id} 
                  className="batch-item"
                  onClick={() => onNavigateToBatchResults(batch)}
                >
                  <span className="batch-name">{batch.batch_name}</span>
                </li>
              ))
            ) : (
              <li className="no-batches">No recent batches found</li>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
}
