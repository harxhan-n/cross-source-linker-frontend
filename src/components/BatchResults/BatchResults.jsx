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
    unmatched: []
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
  
  // State for tracking expanded suspected records
  const [expandedSuspected, setExpandedSuspected] = useState(new Set());
  
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

  // Helper function to transform suspected records - group by source
  const transformSuspectedRecords = (suspectedData) => {
    const groupedRecords = [];
    suspectedData.forEach((suspect, suspectIndex) => {
      if (suspect.targets && suspect.targets.length > 0) {
        groupedRecords.push({
          id: `suspect-source-${suspectIndex}`,
          sourceIndex: suspect.source_index,
          sourceRecord: suspect.source_record,
          targets: suspect.targets.map((target, targetIndex) => ({
            id: `suspect-target-${suspectIndex}-${targetIndex}`,
            targetIndex: target.target_index,
            targetRecord: target.target_record,
            matchingRules: target.rule ? target.rule.rule_name || 'N/A' : 'N/A',
            rationale: target.rationale_statement || 'No rationale provided',
            ruleDetails: target.rule
          }))
        });
      }
    });
    return groupedRecords;
  };

  // Helper function to transform unmatched records
  const transformUnmatchedRecords = (unmatchedSource, unmatchedTarget) => {
    return {
      unmatchedSource,
      unmatchedTarget
    };
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
      // Reset state when batch changes
      setActiveTab('matched');
      setExpandedSuspected(new Set());
      setDisplayCounts({
        matched: 20,
        suspected: 20,
        unmatched: 20
      });
      setNotification({ show: false, type: '', message: '' });
      setPopup({ isVisible: false, type: '', title: '', data: null });
      
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

  // Add suspected records mapping rendering logic
  const renderSuspectedMapping = (suspectedData) => {
    if (suspectedData.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-message">No suspected records found</div>
        </div>
      );
    }

    return (
      <div className="suspected-mapping">
        <div className="suspected-tables">
          {/* Source Records Table */}
          <div className="suspected-table suspected-source">
            <h3>Source Records ({suspectedData.length})</h3>
            <div className="table">
              <div className="table-header">
                {Object.keys(suspectedData[0]?.sourceRecord || {}).map((key) => (
                  <div key={key} className="header-cell">{key}</div>
                ))}
                <div className="header-cell">Actions</div>
              </div>
              <div className="table-body">
                {suspectedData.map((sourceGroup, index) => (
                  <div 
                    key={sourceGroup.id} 
                    className={`table-row ${expandedSuspected.has(sourceGroup.id) ? 'selected' : ''}`}
                    onClick={() => {
                      setExpandedSuspected(new Set([sourceGroup.id])); // Only one selected at a time
                    }}
                  >
                    {Object.values(sourceGroup.sourceRecord || {}).map((value, idx) => (
                      <div key={idx} className="table-cell">{value}</div>
                    ))}
                    <div className="table-cell">
                      <button 
                        className="view-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          showSourceDetails({ sourceRecord: sourceGroup.sourceRecord, source: `Row ${sourceGroup.sourceIndex}` });
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Target Records Table */}
          <div className="suspected-table suspected-target">
            <h3>
              {expandedSuspected.size > 0 
                ? `Suspected Target Records (${
                    suspectedData.find(sg => expandedSuspected.has(sg.id))?.targets?.length || 0
                  })` 
                : 'Suspected Target Records (Select a source record)'}
            </h3>
            <div className="table">
              {expandedSuspected.size > 0 && (() => {
                const selectedSource = suspectedData.find(sg => expandedSuspected.has(sg.id));
                const targets = selectedSource?.targets || [];
                
                if (targets.length === 0) {
                  return (
                    <div className="empty-targets">
                      <div className="empty-message">No suspected targets for this source</div>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="table-header">
                      {Object.keys(targets[0]?.targetRecord || {}).map((key) => (
                        <div key={key} className="header-cell">{key}</div>
                      ))}
                      <div className="header-cell">Matching Rules</div>
                      <div className="header-cell">Rationale</div>
                      <div className="header-cell">Actions</div>
                    </div>
                    <div className="table-body">
                      {targets.map((target, index) => (
                        <div key={target.id} className="table-row target-row">
                          {Object.values(target.targetRecord || {}).map((value, idx) => (
                            <div key={idx} className="table-cell">{value}</div>
                          ))}
                          <div className="table-cell">
                            {target.ruleDetails ? (
                              <button 
                                className="record-link" 
                                onClick={() => showRuleDetails({ ruleDetails: target.ruleDetails, matchingRules: target.matchingRules })}
                                title="Click to view rule details"
                              >
                                {target.matchingRules}
                              </button>
                            ) : (
                              target.matchingRules
                            )}
                          </div>
                          <div className="table-cell">
                            <div 
                              className="rationale-cell" 
                              data-tooltip={target.rationale}
                            >
                              {target.rationale && target.rationale.length > 30 
                                ? `${target.rationale.substring(0, 30)}...` 
                                : target.rationale}
                            </div>
                          </div>
                          <div className="table-cell">
                            <button 
                              className="view-details-btn"
                              onClick={() => showTargetDetails({ targetRecord: target.targetRecord, target: `Row ${target.targetIndex}` })}
                            >
                              View Details
                            </button>
                          </div>
                          <div className="row-arrow-left">←</div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
              
              {expandedSuspected.size === 0 && (
                <div className="empty-targets">
                  <div className="empty-message">Click on a source record to view its suspected targets</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add unmatched tables rendering logic
  const renderUnmatchedTables = (unmatchedSource, unmatchedTarget) => {
    return (
      <div className="unmatched-tables">
        <div className="unmatched-table unmatched-source">
          <h3>Unmatched Source Records ({unmatchedSource?.length || 0})</h3>
          <div className="table">
            <div className="table-header">
              {Object.keys(unmatchedSource[0] || {}).map((key) => (
                <div key={key} className="header-cell">{key}</div>
              ))}
            </div>
            <div className="table-body">
              {unmatchedSource.map((record, index) => (
                <div key={index} className="table-row">
                  {Object.values(record).map((value, idx) => (
                    <div key={idx} className="table-cell">{value}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="unmatched-table unmatched-target">
          <h3>Unmatched Target Records ({unmatchedTarget?.length || 0})</h3>
          <div className="table">
            <div className="table-header">
              {Object.keys(unmatchedTarget[0] || {}).map((key) => (
                <div key={key} className="header-cell">{key}</div>
              ))}
            </div>
            <div className="table-body">
              {unmatchedTarget.map((record, index) => (
                <div key={index} className="table-row">
                  {Object.values(record).map((value, idx) => (
                    <div key={idx} className="table-cell">{value}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
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
          <span className="tab-count">
            ({(results.unmatched.unmatchedSource?.length || 0) + (results.unmatched.unmatchedTarget?.length || 0)})
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'matched' && renderTable(results[activeTab])}
        {activeTab === 'suspected' && renderSuspectedMapping(results[activeTab])}
        {activeTab === 'unmatched' && renderUnmatchedTables(
          results.unmatched.unmatchedSource || [],
          results.unmatched.unmatchedTarget || []
        )}
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