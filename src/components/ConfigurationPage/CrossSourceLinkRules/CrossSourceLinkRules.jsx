import React, { useState, useEffect } from 'react';
import './CrossSourceLinkRules.css';
import { rulesApi, fieldApi } from '../../../services/apiClient.js';
import Popup from '../../Popup/Popup.jsx';

export default function CrossSourceLinkRules() {
  // State for form data
  const [formData, setFormData] = useState({
    ruleName: '',
    description: '',
    sourceField: '',
    targetField: '',
    selectIfBothSame: false,
    matchClassification: '',
    matchType: '',
    rationaleStatement: '',
    codeBlock: ''
  });

  // State for rules data
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // State for dropdown options
  const [fields, setFields] = useState([]);
  const [matchClassifications, setMatchClassifications] = useState([]);
  const [matchTypes, setMatchTypes] = useState([]);

  // Popup states
  const [popup, setPopup] = useState({
    isVisible: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null
  });

  // Fetch field options and all rules on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch field options for dropdowns
        const fieldOptionsResponse = await rulesApi.fetchFieldOptions();
        
        if (fieldOptionsResponse.status_code === 200 && fieldOptionsResponse.data) {
          setMatchClassifications(fieldOptionsResponse.data.match_classification || []);
          setMatchTypes(fieldOptionsResponse.data.match_types || []);
        } else {
          console.error('Failed to fetch field options:', fieldOptionsResponse.message);
        }
        
        // Fetch all available fields
        const fieldsResponse = await fieldApi.getAllFields();
        
        if (fieldsResponse.status_code === 200 && fieldsResponse.data) {
          // Transform API data to match our component structure
          const transformedFields = fieldsResponse.data.map(field => ({
            id: field.field_id || field.id,
            fieldName: field.field_name,
            fieldType: field.type
          }));
          
          setFields(transformedFields);
        } else {
          console.error('Failed to fetch fields:', fieldsResponse.message);
        }
        
        // Fetch all rules
        const rulesResponse = await rulesApi.getAllRules();
        
        if (rulesResponse.status_code === 200 && rulesResponse.data) {
          setRules(rulesResponse.data);
        } else {
          console.error('Failed to fetch rules:', rulesResponse.message);
          setError(rulesResponse.message || 'Failed to fetch rules');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error loading data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Debug popup state changes
  useEffect(() => {
    console.log('Popup state changed:', popup);
  }, [popup]);

  // Popup helper functions
  const showPopup = (type, title, message, onConfirm = null) => {
    console.log('showPopup called with:', { type, title, message, onConfirm }); // Debug log
    setPopup({
      isVisible: true,
      type,
      title,
      message,
      onConfirm
    });
  };

  const hidePopup = () => {
    setPopup({
      isVisible: false,
      type: 'info',
      title: '',
      message: '',
      onConfirm: null
    });
  };

  const showSuccess = (message) => {
    showPopup('success', 'Success', message);
  };

  const showError = (message) => {
    showPopup('error', 'Error', message);
  };

  const showConfirm = (title, message, onConfirm) => {
    console.log('showConfirm called with:', { title, message }); // Debug log
    showPopup('confirm', title, message, onConfirm);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleForm = () => {
    setIsFormOpen(!isFormOpen);
  };

  const addRule = async () => {
    if (!formData.ruleName.trim()) {
      showError('Please enter a rule name');
      return;
    }

    if (!formData.description.trim()) {
      showError('Please enter a rule description');
      return;
    }

    setIsProcessing(true);
    try {
      // Convert form data to API expected format
      const ruleData = {
        rule_name: formData.ruleName,
        description: formData.description,
        source_field: formData.sourceField,
        target_field: formData.targetField,
        select_if_both_same: formData.selectIfBothSame,
        match_classification: formData.matchClassification,
        match_type: formData.matchType,
        rationale_statement: formData.rationaleStatement,
        code_block: formData.codeBlock
      };

      // Call API to create rule
      const response = await rulesApi.createRule(ruleData);
      
      if (response.status_code === 200 || response.status_code === 201) {
        // Success case - update the table
        if (response.data) {
          // Use the returned data if available
          setRules(response.data);
        } else {
          // Refresh rules list if not returned in the response
          const rulesResponse = await rulesApi.getAllRules();
          if (rulesResponse.status_code === 200 && rulesResponse.data) {
            setRules(rulesResponse.data);
          }
        }
        
        // Show success message
        showSuccess(response.message || 'Rule added successfully');
        
        // Reset form
        setFormData({
          ruleName: '',
          description: '',
          sourceField: '',
          targetField: '',
          selectIfBothSame: false,
          matchClassification: '',
          matchType: '',
          rationaleStatement: '',
          codeBlock: ''
        });
        
        // Close the form after successful creation
        setIsFormOpen(false);
      } else {
        // Error case - don't re-render the table
        showError(response.message || 'Failed to add rule. Please try again.');
      }
    } catch (err) {
      console.error('Error adding rule:', err);
      showError('Error adding rule. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteRule = (ruleId) => {
    console.log('Delete rule clicked for ID:', ruleId); // Debug log
    showConfirm(
      'Delete Rule', 
      'Are you sure you want to delete this rule?', 
      async () => {
        console.log('Confirm delete clicked'); // Debug log
        hidePopup(); // Hide the confirmation popup first
        setIsProcessing(true);
        try {
          const response = await rulesApi.deleteRule(ruleId);
          
          if (response.status_code === 200) {
            // Success case - update the table
            if (response.data) {
              // Use the returned data if available
              setRules(response.data);
            } else {
              // Remove rule from local state if no data returned
              setRules(rules.filter(rule => rule.rule_id !== ruleId));
            }
            showSuccess(response.message || 'Rule deleted successfully');
          } else {
            // Error case - don't update the table
            showError(response.message || 'Failed to delete rule. Please try again.');
          }
        } catch (err) {
          console.error('Error deleting rule:', err);
          showError('Error deleting rule. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      }
    );
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);

  const editRule = (ruleId) => {
    const rule = rules.find(r => r.rule_id === ruleId);
    if (rule) {
      // Set the form data with the rule values
      setFormData({
        ruleName: rule.rule_name,
        description: rule.description || '',
        sourceField: rule.source_field,
        targetField: rule.target_field,
        selectIfBothSame: rule.select_if_both_same,
        matchClassification: rule.match_classification,
        matchType: rule.match_type,
        rationaleStatement: rule.rationale_statement,
        codeBlock: rule.code_block
      });
      
      // Set editing state
      setIsEditing(true);
      setEditingRuleId(ruleId);
      setIsFormOpen(true); // Open the form when editing
      
      // Scroll to the form
      document.querySelector('.rules-form').scrollIntoView({ behavior: 'smooth' });
    }
  };

  const saveEditedRule = async () => {
    if (!formData.ruleName.trim()) {
      showError('Please enter a rule name');
      return;
    }

    if (!formData.description.trim()) {
      showError('Please enter a rule description');
      return;
    }

    setIsProcessing(true);
    try {
      // Convert form data to API expected format
      const ruleData = {
        rule_name: formData.ruleName,
        description: formData.description,
        source_field: formData.sourceField,
        target_field: formData.targetField,
        select_if_both_same: formData.selectIfBothSame,
        match_classification: formData.matchClassification,
        match_type: formData.matchType,
        rationale_statement: formData.rationaleStatement,
        code_block: formData.codeBlock
      };

      // Call API to update rule
      const response = await rulesApi.updateRule(editingRuleId, ruleData);
      
      if (response.status_code === 200) {
        // Success case - update the table
        if (response.data) {
          // Use the returned data if available
          setRules(response.data);
        } else {
          // Refresh rules list if not returned in the response
          const rulesResponse = await rulesApi.getAllRules();
          if (rulesResponse.status_code === 200 && rulesResponse.data) {
            setRules(rulesResponse.data);
          }
        }
        
        showSuccess(response.message || 'Rule updated successfully');
        
        // Reset form and editing state
        setFormData({
          ruleName: '',
          description: '',
          sourceField: '',
          targetField: '',
          selectIfBothSame: false,
          matchClassification: '',
          matchType: '',
          rationaleStatement: '',
          codeBlock: ''
        });
        setIsEditing(false);
        setEditingRuleId(null);
        setIsFormOpen(false); // Close the form after successful update
      } else {
        // Error case - don't update the table
        showError(response.message || 'Failed to update rule. Please try again.');
      }
    } catch (err) {
      console.error('Error updating rule:', err);
      showError('Error updating rule. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      ruleName: '',
      description: '',
      sourceField: '',
      targetField: '',
      selectIfBothSame: false,
      matchClassification: '',
      matchType: '',
      rationaleStatement: '',
      codeBlock: ''
    });
    setIsEditing(false);
    setEditingRuleId(null);
    setIsFormOpen(false); // Close the form when cancelling edit
  };

  return (
    <div className="cross-source-rules">
      {/* Show popup when needed */}
      {popup.isVisible && (
        <Popup 
          isVisible={popup.isVisible}
          type={popup.type}
          title={popup.title}
          message={popup.message}
          onClose={hidePopup}
          onConfirm={popup.onConfirm}
        />
      )}
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading rules configuration...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="rules-form-accordion">
            <div className="accordion-header" onClick={toggleForm}>
              <h3>Cross Source Link Rules {isEditing ? '(Editing)' : '(Add New)'}</h3>
              <span className={`accordion-arrow ${isFormOpen ? 'open' : ''}`}>▼</span>
            </div>
            
            <div className={`accordion-content ${isFormOpen ? 'open' : ''}`}>
              <div className="rules-form">
                {/* First Row - Rule Name */}
                <div className="form-row">
                  <div className="form-group full-width">
                    <input
                      type="text"
                      placeholder="Rule Name"
                      className="form-input-1"
                      value={formData.ruleName}
                      onChange={(e) => handleInputChange('ruleName', e.target.value)}
                    />
                  </div>
                </div>

                {/* Rule Description */}
                <div className="form-row">
                  <div className="form-group full-width">
                    <textarea
                      placeholder="Rule Description - Explain how this rule works..."
                      className="form-textarea description-textarea"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows="3"
                    />
                  </div>
                </div>

                {/* Second Row - Source Field, Target Field dropdowns */}
                <div className="form-row">
                  <div className="form-group">
                    <select
                      className="form-input"
                      value={formData.sourceField}
                      onChange={(e) => handleInputChange('sourceField', e.target.value)}
                    >
                      <option value="">Select Source Field</option>
                      {fields.map(field => (
                        <option key={`source-${field.id}`} value={field.fieldName}>
                          {field.fieldName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <select
                      className="form-input"
                      value={formData.targetField}
                      onChange={(e) => handleInputChange('targetField', e.target.value)}
                    >
                      <option value="">Select Target Field</option>
                      {fields.map(field => (
                        <option key={`target-${field.id}`} value={field.fieldName}>
                          {field.fieldName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Third Row - Match Classification, Match Type */}
                <div className="form-row">
                  <div className="form-group">
                    <select
                      className="form-input"
                      value={formData.matchClassification}
                      onChange={(e) => handleInputChange('matchClassification', e.target.value)}
                    >
                      <option value="">Select Match/Ignore</option>
                      {matchClassifications.map(classification => (
                        <option key={classification} value={classification}>
                          {classification}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <select
                      className="form-input"
                      value={formData.matchType}
                      onChange={(e) => handleInputChange('matchType', e.target.value)}
                    >
                      <option value="">Select Match Type</option>
                      {matchTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fourth Row - Rationale and Backend Code */}
                <div className="form-row">
                  <div className="form-group">
                    <textarea
                      placeholder="Rationale Statement to be displayed..."
                      className="form-textarea"
                      value={formData.rationaleStatement}
                      onChange={(e) => handleInputChange('rationaleStatement', e.target.value)}
                      rows="11"
                    />
                  </div>
                  <div className="form-group">
                    <div className="code-editor-container">
                      <div className="editor-header">
                        <span>Python Code Block - (Generated by AI Agent)</span>
                      </div>
                      <textarea
                        placeholder="
    # Your Python code logic here
    def rule_code_block(source_value, target_value):
        # Example:
        # if source_value == target_value:
        #     return True
        # return False"
                        className="form-textarea code-editor python-editor"
                        value={formData.codeBlock}
                        onChange={(e) => handleInputChange('codeBlock', e.target.value)}
                        rows="8"
                        spellCheck="false"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Add/Edit Rule Buttons */}
                <div className="form-row">
                  <div className="form-group full-width">
                    {isEditing ? (
                      <div className="button-container">
                        <button 
                          className="cancel-edit-btn" 
                          onClick={cancelEdit} 
                          disabled={isProcessing}
                        >
                          Cancel
                        </button>
                        <button 
                          className="save-rule-btn" 
                          onClick={saveEditedRule} 
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Save Changes'}
                        </button>
                      </div>
                    ) : (
                      <div className="button-container">
                        <button 
                          className="add-rule-btn" 
                          onClick={addRule} 
                          disabled={isProcessing}
                          style={{marginRight: '10px'}}
                        >
                          {isProcessing ? 'Processing...' : '+Add rule'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

      {/* Rules Table */}
      <div className="rules-table">
        <div className="rules-table-header">
          <div className="rules-header-cell">Rule Name</div>
          <div className="rules-header-cell">Source → Target Field</div>
          <div className="rules-header-cell">Match/Ignore</div>
          <div className="rules-header-cell">Match Type</div>
          <div className="rules-header-cell">Rationale</div>
          <div className="rules-header-cell">Actions</div>
        </div>
        
        <div className="rules-table-body">
          {rules.length === 0 ? (
            <div className="empty-state">
              <div className="empty-message">No rules configured</div>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.rule_id} className="rules-table-row">
                <div className="rules-table-cell">{rule.rule_name}</div>
                <div className="rules-table-cell">{rule.source_field} → {rule.target_field}</div>
                <div className="rules-table-cell">{rule.match_classification}</div>
                <div className="rules-table-cell">{rule.match_type}</div>
                <div className="rules-table-cell" title={rule.rationale_statement}>
                  {rule.rationale_statement && rule.rationale_statement.length > 30 
                    ? `${rule.rationale_statement.substring(0, 30)}...` 
                    : rule.rationale_statement
                  }
                </div>
                <div className="rules-table-cell rules-actions-cell">
                  <button 
                    className="action-btn edit-btn" 
                    onClick={() => editRule(rule.rule_id)} 
                    disabled={isProcessing}
                  >
                    <img 
                      src="https://img.icons8.com/?size=100&id=uURIXIy2oK8a&format=png&color=12B886"
                      alt="Edit"
                      width="40"
                      height="35"
                      style={isProcessing ? {opacity: 0.5} : {}}
                    />
                  </button>
                  <button 
                    className="action-btn delete-btn" 
                    onClick={() => deleteRule(rule.rule_id)}
                    disabled={isProcessing}
                  >
                    <img 
                      src="https://img.icons8.com/?size=100&id=RVDvUJYxkige&format=png&color=12B886"
                      alt="Delete"
                      width="40"
                      height="40"
                      style={isProcessing ? {opacity: 0.5} : {}}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </>
    )}
  </div>
  );
}