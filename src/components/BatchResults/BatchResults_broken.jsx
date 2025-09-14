import React, { useState, useEffect } from 'react';
import './BatchResults.css';
import { batchApi } from '../../services/apiClient.js';

export default function BatchResults({ batchId, batchName, onNavigateBack, onBatchReprocessed }) {
  const [activeTab, setActiveTab] = useState('matched');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [reprocessLoading, setReprocessLoading] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    type: '', // 'success', 'error', 'info'
    message: ''
  });
  const [results, setResults] = useState({
    matched: [],
    suspected: [],
    unmatched: {
      source: [],
      target: []
    }
  });
  
  // Popup state for detailed record views
  const [popup, setPopup] = useState({
    isVisible: false,
    type: '', // 'source', 'target', or 'rule'
    title: '',
    data: null
  });

  // Pagination state for load more functionality
  const [displayCounts, setDisplayCounts] = useState({
    matched: 20,
    suspected: 20,
    unmatched: 20
  });

  // Accordion state for unmatched records
  const [accordionState, setAccordionState] = useState({
    sourceOpen: true,
    targetOpen: true
  });
  
  const INITIAL_DISPLAY_COUNT = 20;
  const LOAD_MORE_COUNT = 10;

  // Show notification helper
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 5000); // Hide after 5 seconds
  };

  // Helper function to transform matched records
  const transformMatchedRecords = (matchedData) => {
    return matchedData.map((match, index) => ({
      id: index + 1,
      source: `Row ${match.source_index}`,
      target: `Row ${match.target_index}`,
      matchingRules: match.rule ? match.rule.rule_name || 'N/A' : 'N/A',
      rationale: match.rationale_statement || 'No rationale provided',
      // Store full records for detailed view later
      sourceRecord: match.source_record,
      targetRecord: match.target_record,
      ruleDetails: match.rule
    }));
  };

  // Helper function to transform suspected records
  const transformSuspectedRecords = (suspectedData) => {
    const transformedRecords = [];
    suspectedData.forEach((suspect, suspectIndex) => {
      if (suspect.targets && suspect.targets.length > 0) {
        suspect.targets.forEach((target, targetIndex) => {
          transformedRecords.push({
            id: `suspect-${suspectIndex}-${targetIndex}`,
            source: `Row ${suspect.source_index}`,
            target: `Row ${target.target_index}`,
            matchingRules: target.rule ? target.rule.rule_name || 'N/A' : 'N/A',
            rationale: target.rationale_statement || 'No rationale provided',
            // Store full records for detailed view later
            sourceRecord: suspect.source_record,
            targetRecord: target.target_record,
            ruleDetails: target.rule
          });
        });
      }
    });
    return transformedRecords;
  };

  // Helper function to transform unmatched records - keeping source and target separate
  const transformUnmatchedRecords = (unmatchedSource, unmatchedTarget) => {
    console.log('transformUnmatchedRecords called');
    console.log('unmatchedSource:', unmatchedSource);
    console.log('unmatchedTarget:', unmatchedTarget);
    
    const sourceRecords = [];
    const targetRecords = [];
    
    // Transform unmatched source records
    if (unmatchedSource && unmatchedSource.length > 0) {
      unmatchedSource.forEach((source, index) => {
        const sourceIndex = source.source_index !== undefined ? source.source_index : index;
        sourceRecords.push({
          id: `unmatched-source-${index}`,
          rowIndex: sourceIndex,
          data: source,
          type: 'source'
        });
      });
    }

    // Transform unmatched target records
    if (unmatchedTarget && unmatchedTarget.length > 0) {
      unmatchedTarget.forEach((target, index) => {
        const targetIndex = target.target_index !== undefined ? target.target_index : index;
        targetRecords.push({
          id: `unmatched-target-${index}`,
          rowIndex: targetIndex,
          data: target,
          type: 'target'
        });
      });
    }

    const result = {
      source: sourceRecords,
      target: targetRecords
    };
    
    console.log('transformUnmatchedRecords result:', result);
    return result;
  };

  // Component for displaying record details in popup
  const RecordDetailPopup = ({ isVisible, title, data, onClose }) => {
    if (!isVisible || !data) return null;

    return (
      <div className="popup-overlay" onClick={onClose}>
        <div className="popup-content" onClick={(e) => e.stopPropagation()}>
          <div className="popup-header">
            <h3>{title}</h3>
            <button className="popup-close" onClick={onClose}>×</button>
          </div>
          <div className="popup-body">
            <div className="record-details">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="record-field">
                  <div className="field-label">{key.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className="field-value">
                    {value !== null && value !== undefined 
                      ? (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
                      : 'N/A'
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching batch results for batch ID:', batchId);
        const response = await batchApi.fetchBatchResults(batchId);
        
        if (response.status_code === 200 && response.data) {
          const transformedResults = {
            matched: transformMatchedRecords(response.data.matched || []),
            suspected: transformSuspectedRecords(response.data.suspected || []),
            unmatched: transformUnmatchedRecords(
              response.data.unmatched_source || [], 
              response.data.unmatched_target || []
            )
          };
          
          console.log('Transformed results:', transformedResults);
          setResults(transformedResults);
        } else {
          setError(response.message || 'Failed to load batch results');
        }
      } catch (err) {
        console.error('Error fetching batch results:', err);
        setError('Failed to load batch results');
      } finally {
        setLoading(false);
      }
    };

    if (batchId) {
      fetchResults();
    }
  }, [batchId]);

  const handleReprocess = async () => {
    try {
      setReprocessLoading(true);
      console.log('Reprocessing batch:', batchId);
      
      // Call the re-run batch API
      const response = await batchApi.reRunBatch(batchId);
      
      if (response.status_code === 200) {
        // Success - show success notification
        console.log('Reprocess successful:', response);
        
        const newBatchData = response.data;
        const totalUnmatched = newBatchData.unmatched_source_data.count + newBatchData.unmatched_target_data.count;
        
        const successMessage = `✅ Batch Reprocessed Successfully!
        
📁 New Batch: ${newBatchData.batch_name}
📊 Results Summary:
  • ${newBatchData.matched_data.count} Matched Records
  • ${newBatchData.suspected_data.count} Suspected Matches  
  • ${totalUnmatched} Unmatched Records
        
🔄 Redirecting to new batch...`;
        
        showNotification('success', successMessage);
        
        // Wait a moment for the notification to show, then navigate to the new batch
        setTimeout(() => {
          // Call the callback to refresh sidebar and open the new batch
          if (onBatchReprocessed) {
            onBatchReprocessed(newBatchData.batch_id, newBatchData.batch_name);
          }
        }, 1500); // Wait 1.5 seconds to let user see the success message
        
      } else {
        // Handle API error responses
        console.error('Reprocess failed:', response);
        showNotification('error', `Reprocess failed: ${response.message || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error reprocessing batch:', error);
      showNotification('error', 'Failed to reprocess batch. Please try again.');
    } finally {
      setReprocessLoading(false);
    }
  };

  const handleExportAnalysis = async () => {
    try {
      setExportLoading(true);
      console.log('Exporting analysis for batch:', batchId);
      
      // Call the export API
      const response = await batchApi.exportBatchResults(batchId);
      
      if (response.status_code === 200) {
        // Success - download file and open link
        console.log('Export successful:', response);
        
        // Show success notification
        showNotification('success', `Export successful! File: ${response.file_name}`);
        
        // Open the Google Drive link in a new tab
        if (response.file_link) {
          window.open(response.file_link, '_blank');
        }
        
      } else {
        // Handle API error responses
        console.error('Export failed:', response);
        showNotification('error', response.message || 'Export failed: Unknown error occurred');
      }
    } catch (error) {
      console.error('Error exporting batch results:', error);
      showNotification('error', 'Failed to export analysis. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Popup handlers
  const showSourceDetails = (record) => {
    if (record.sourceRecord) {
      setPopup({
        isVisible: true,
        type: 'source',
        title: `Source Record - ${record.source}`,
        data: record.sourceRecord
      });
    }
  };

  const showTargetDetails = (record) => {
    if (record.targetRecord) {
      setPopup({
        isVisible: true,
        type: 'target',
        title: `Target Record - ${record.target}`,
        data: record.targetRecord
      });
    }
  };

  const showRuleDetails = (record) => {
    if (record.ruleDetails) {
      setPopup({
        isVisible: true,
        type: 'rule',
        title: `Rule Details - ${record.matchingRules}`,
        data: record.ruleDetails
      });
    }
  };

  const hidePopup = () => {
    setPopup({
      isVisible: false,
      type: '',
      title: '',
      data: null
    });
  };

  // Load more functionality
  const handleLoadMore = (tabType) => {
    setDisplayCounts(prev => ({
      ...prev,
      [tabType]: prev[tabType] + LOAD_MORE_COUNT
    }));
  };

  // Reset display count when switching tabs
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // Reset display count for the new tab to initial count
    setDisplayCounts(prev => ({
      ...prev,
      [newTab]: Math.min(prev[newTab], INITIAL_DISPLAY_COUNT)
    }));
  };

  // Toggle accordion sections
  const toggleAccordion = (section) => {
    setAccordionState(prev => ({
      ...prev,
      [`${section}Open`]: !prev[`${section}Open`]
    }));
  };

  // Simple unmatched records renderer with debug info
  const renderUnmatchedAccordions = () => {
    const unmatchedData = results.unmatched || { source: [], target: [] };
    const sourceRecords = unmatchedData.source || [];
    const targetRecords = unmatchedData.target || [];

    return (
      <div className="unmatched-accordions">
        <div className="debug-info">
          <p>Source Records: {sourceRecords.length}</p>
          <p>Target Records: {targetRecords.length}</p>
          <p>Debug: {JSON.stringify(unmatchedData).substring(0, 100)}...</p>
        </div>
        
        <div className="accordion-section">
          <div className="accordion-header">
            <h3>Unmatched Source Records ({sourceRecords.length})</h3>
          </div>
          <div className="accordion-content">
            {sourceRecords.length > 0 ? (
              <div>Found {sourceRecords.length} source records</div>
            ) : (
              <div>No source records</div>
            )}
          </div>
        </div>

        <div className="accordion-section">
          <div className="accordion-header">
            <h3>Unmatched Target Records ({targetRecords.length})</h3>
          </div>
          <div className="accordion-content">
            {targetRecords.length > 0 ? (
              <div>Found {targetRecords.length} target records</div>
            ) : (
              <div>No target records</div>
            )}
          </div>
        </div>
      </div>
    );
  };
      console.log(`renderAccordionTable called for ${type}:`, records);
      
      if (records.length === 0) {
        return (
          <div className="accordion-empty">
            <div className="empty-message">No unmatched {type} records</div>
          </div>
        );
      }

      // Get column names from the first record's data
      const columns = records.length > 0 && records[0]?.data ? Object.keys(records[0].data) : [];
      console.log(`Columns for ${type}:`, columns);
      
      if (columns.length === 0) {
        return (
          <div className="accordion-empty">
            <div className="empty-message">No data available for {type} records</div>
          </div>
        );
      }
      
      const currentDisplayCount = displayCounts.unmatched;
      const displayedRecords = records.slice(0, currentDisplayCount);
      const hasMoreData = records.length > currentDisplayCount;

      return (
        <div className="accordion-content">
          {isOpen && (
            <>
              <div className="accordion-table">
                <div className="accordion-table-header">
                  <div className="accordion-header-cell">Row</div>
                  {columns.map(column => (
                    <div key={column} className="accordion-header-cell">
                      {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  ))}
                </div>
                
                <div className="accordion-table-body">
                  {displayedRecords.map(record => (
                    <div key={record.id} className="accordion-table-row">
                      <div className="accordion-table-cell">
                        Row {record.rowIndex}
                      </div>
                      {columns.map(column => (
                        <div key={column} className="accordion-table-cell">
                          {record.data[column] || 'N/A'}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              {hasMoreData && (
                <div className="load-more-section">
                  <div className="load-more-info">
                    Showing {displayedRecords.length} of {records.length} {type} records
                  </div>
                  <button 
                    className="load-more-btn" 
                    onClick={() => handleLoadMore('unmatched')}
                  >
                    Load More ({Math.min(LOAD_MORE_COUNT, records.length - currentDisplayCount)} more)
                  </button>
                </div>
              )}
              
              {!hasMoreData && records.length > INITIAL_DISPLAY_COUNT && (
                <div className="load-more-section">
                  <div className="load-more-info">
                    All {records.length} {type} records loaded
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      );
    };

    return (
      <div className="unmatched-accordions">
        <div className="debug-info">
          <p>Source Records: {sourceRecords.length}</p>
          <p>Target Records: {targetRecords.length}</p>
          <p>Accordion State: Source Open = {accordionState.sourceOpen}, Target Open = {accordionState.targetOpen}</p>
        </div>
        
        {/* Source Records Accordion */}
        <div className="accordion-section">
          <div 
            className="accordion-header"
            onClick={() => toggleAccordion('source')}
          >
            <h3>Unmatched Source Records ({sourceRecords.length})</h3>
            <span className={`accordion-arrow ${accordionState.sourceOpen ? 'open' : ''}`}>
              ▼
            </span>
          </div>
          {renderAccordionTable(sourceRecords, 'source', accordionState.sourceOpen)}
        </div>

        {/* Target Records Accordion */}
        <div className="accordion-section">
          <div 
            className="accordion-header"
            onClick={() => toggleAccordion('target')}
          >
            <h3>Unmatched Target Records ({targetRecords.length})</h3>
            <span className={`accordion-arrow ${accordionState.targetOpen ? 'open' : ''}`}>
              ▼
            </span>
          </div>
          {renderAccordionTable(targetRecords, 'target', accordionState.targetOpen)}
        </div>
      </div>
    );
  };

  const renderTable = (data) => {
    if (data.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-message">No {activeTab} records found</div>
        </div>
      );
    }

    const currentDisplayCount = displayCounts[activeTab];
    const displayedData = data.slice(0, currentDisplayCount);
    const hasMoreData = data.length > currentDisplayCount;

    return (
      <div className="results-table">
        <div className="table-header">
          <div className="header-cell">Source</div>
          <div className="header-cell">Target</div>
          <div className="header-cell">Matching Rules</div>
          <div className="header-cell">Rationale</div>
        </div>
        
        <div className="table-body">
          {displayedData.map((record) => (
            <div key={record.id} className="table-row">
              <div className="table-cell">
                {record.sourceRecord ? (
                  <button 
                    className="record-link" 
                    onClick={() => showSourceDetails(record)}
                    title="Click to view source record details"
                  >
                    {record.source}
                  </button>
                ) : (
                  record.source
                )}
              </div>
              <div className="table-cell">
                {record.targetRecord ? (
                  <button 
                    className="record-link" 
                    onClick={() => showTargetDetails(record)}
                    title="Click to view target record details"
                  >
                    {record.target}
                  </button>
                ) : (
                  record.target
                )}
              </div>
              <div className="table-cell">
                {record.ruleDetails ? (
                  <button 
                    className="record-link" 
                    onClick={() => showRuleDetails(record)}
                    title="Click to view rule details"
                  >
                    {record.matchingRules}
                  </button>
                ) : (
                  record.matchingRules
                )}
              </div>
              <div className="table-cell">
                <div 
                  className="rationale-cell" 
                  data-tooltip={record.rationale}
                >
                  {record.rationale && record.rationale.length > 50 
                    ? `${record.rationale.substring(0, 50)}...` 
                    : record.rationale}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Load More Section */}
        {hasMoreData && (
          <div className="load-more-section">
            <div className="load-more-info">
              Showing {displayedData.length} of {data.length} records
            </div>
            <button 
              className="load-more-btn"
              onClick={() => handleLoadMore(activeTab)}
            >
              Load More ({Math.min(LOAD_MORE_COUNT, data.length - currentDisplayCount)} more)
            </button>
          </div>
        )}
        
        {/* Show all records info when everything is loaded */}
        {!hasMoreData && data.length > INITIAL_DISPLAY_COUNT && (
          <div className="load-more-section">
            <div className="all-records-info">
              All {data.length} records loaded
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="batch-results">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading batch results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="batch-results">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="batch-results">
      {/* Header with back button and action buttons */}
      <div className="results-header">
        <div className="header-left">
          <button className="back-button" onClick={onNavigateBack}>
            ← Back
          </button>
          <h1 className="batch-title">{batchName}</h1>
        </div>
        <div className="header-right">
          <button 
            className="action-button reprocess-btn" 
            onClick={handleReprocess}
            disabled={reprocessLoading}
          >
            {reprocessLoading ? '⏳ Reprocessing...' : '🔄 Reprocess'}
          </button>
          <button 
            className="action-button export-btn" 
            onClick={handleExportAnalysis}
            disabled={exportLoading}
          >
            {exportLoading ? '⏳ Exporting...' : '📊 Export Analysis'}
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close" 
              onClick={() => setNotification({ show: false, type: '', message: '' })}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'matched' ? 'active' : ''}`}
          onClick={() => handleTabChange('matched')}
        >
          Matched Records
          <span className="tab-count">({results.matched.length})</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'suspected' ? 'active' : ''}`}
          onClick={() => handleTabChange('suspected')}
        >
          Suspected Records
          <span className="tab-count">({results.suspected.length})</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'unmatched' ? 'active' : ''}`}
          onClick={() => handleTabChange('unmatched')}
        >
          Unmatched Records
          <span className="tab-count">({(results.unmatched.source?.length || 0) + (results.unmatched.target?.length || 0)})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'unmatched' ? renderUnmatchedAccordions() : renderTable(results[activeTab])}
      </div>

      {/* Record Detail Popup */}
      <RecordDetailPopup 
        isVisible={popup.isVisible}
        title={popup.title}
        data={popup.data}
        onClose={hidePopup}
      />
    </div>
  );
}