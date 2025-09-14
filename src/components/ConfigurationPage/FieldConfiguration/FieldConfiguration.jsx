import React, { useState, useEffect } from 'react';
import './FieldConfiguration.css';
import { fieldApi } from '../../../services/apiClient.js';
import Popup from '../../Popup/Popup.jsx';

export default function FieldConfiguration() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  
  // Form state for adding new fields
  const [formData, setFormData] = useState({
    fieldName: '',
    fieldType: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalFieldName, setOriginalFieldName] = useState('');
  
  // Popup states
  const [popup, setPopup] = useState({
    isVisible: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null
  });

  // Fetch fields data on component mount
  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fieldApi.getAllFields();
        
        if (response.status_code === 200 && response.data) {
          // Transform API data to match our component structure
          const transformedFields = response.data.map((field, index) => ({
            id: index + 1,
            fieldName: field.field_name,
            fieldType: field.type,
            description: field.description || ''
          }));
          
          setFields(transformedFields);
        } else {
          throw new Error(response.message || 'Failed to fetch fields');
        }
      } catch (err) {
        console.error('Error fetching fields:', err);
        setError(`API Error: ${err.message}`);
        setFields([]); // Don't show fallback data, just empty array
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  // Popup helper functions
  const showPopup = (type, title, message, onConfirm = null) => {
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
    showPopup('confirm', title, message, onConfirm);
  };

  const addField = async () => {
    // Validate form data
    if (!formData.fieldName.trim() || !formData.fieldType.trim()) {
      showError('Please fill in both Field Name and Field Type');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let response;
      
      if (isEditMode) {
        // Edit existing field
        response = await fieldApi.editFields(
          originalFieldName,
          formData.fieldName.trim(),
          formData.fieldType.trim(),
          formData.description.trim(),
          true // is_active always true for now
        );
      } else {
        // Add new field
        response = await fieldApi.configureFields(
          formData.fieldName.trim(),
          formData.fieldType.trim(),
          formData.description.trim()
        );
      }

      // Check response status code to determine success or failure
      if (response.status_code === 201 || response.status_code === 200) {
        if (response.data) {
          // Transform API data to match our component structure
          const transformedFields = response.data.map((field, index) => ({
            id: index + 1,
            fieldName: field.field_name,
            fieldType: field.type,
            description: field.description || ''
          }));
          
          // Only update fields state on success
          setFields(transformedFields);
          
          // Reset form and edit mode
          resetForm();
        }
        
        // Show success message from API
        showSuccess(response.message || `Field ${isEditMode ? 'updated' : 'added'} successfully!`);
      } else {
        // Show ONLY the message from the API response without any additional text
        showError(response.message);
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} field:`, err);
      
      // Extract message from nested response if available
      if (err.response && err.response.data && err.response.data.message) {
        // Show only the message from the API
        showError(err.response.data.message);
      } else if (err.message && err.message.includes('HTTP error')) {
        // For HTTP errors, try to parse and show a more user-friendly message
        showError("Connection error. Please try again.");
      } else {
        // For other errors, show only the message without additional text
        showError(err.message || "Unable to complete request");
      }
      
      // Store error but don't cause rerender that would clear form data
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fieldName: '',
      fieldType: '',
      description: ''
    });
    setIsEditMode(false);
    setOriginalFieldName('');
    setEditingField(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateField = (id, property, value) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, [property]: value } : field
    ));
  };

  const deleteField = async (id) => {
    const fieldToDelete = fields.find(field => field.id === id);
    if (!fieldToDelete) {
      console.error('Field not found');
      return;
    }

    // Show confirmation popup
    showConfirm(
      'Delete Field',
      `Are you sure you want to delete "${fieldToDelete.fieldName}"? This action cannot be undone.`,
      async () => {
        try {
          setError(null);
          
          const response = await fieldApi.deleteFields(fieldToDelete.fieldName);
          
          if (response.status_code === 200 && response.data) {
            // Transform API data to match our component structure
            const transformedFields = response.data.map((field, index) => ({
              id: index + 1,
              fieldName: field.field_name,
              fieldType: field.type,
              hasInfluence: field.has_influence,
              mandatory: field.required
            }));
            
            setFields(transformedFields);
            
            // If we were editing the deleted field, reset the form
            if (editingField === id) {
              resetForm();
            }
            
            // Show success message from API
            showSuccess(response.message || 'Field deleted successfully!');
          } else {
            throw new Error(response.message || 'Failed to delete field');
          }
        } catch (err) {
          console.error('Error deleting field:', err);
          showError(err.message || 'Something went wrong while deleting the field. Please try again.');
          setError(err.message);
        }
        hidePopup(); // Close the confirm popup
      }
    );
  };

  const startEditing = (id) => {
    const fieldToEdit = fields.find(field => field.id === id);
    if (fieldToEdit) {
      setFormData({
        fieldName: fieldToEdit.fieldName,
        fieldType: fieldToEdit.fieldType,
        description: fieldToEdit.description || ''
      });
      setOriginalFieldName(fieldToEdit.fieldName);
      setIsEditMode(true);
      setEditingField(id);
    }
  };

  const cancelEdit = () => {
    resetForm();
  };

  const stopEditing = () => {
    setEditingField(null);
  };

  return (
    <div className="field-configuration">
      <div className="field-form-header">
        <div className="form-inputs">
          <input
            type="text"
            placeholder="Field Name"
            className="header-input"
            value={formData.fieldName}
            onChange={(e) => handleInputChange('fieldName', e.target.value)}
            disabled={isSubmitting}
          />
          <input
            type="text"
            placeholder="Field Type"
            className="header-input"
            value={formData.fieldType}
            onChange={(e) => handleInputChange('fieldType', e.target.value)}
            disabled={isSubmitting}
          />
          <input
            type="text"
            placeholder="Description"
            className="header-input"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={isSubmitting}
          />
          <div className="button-group">
            <button 
              className="add-field-btn" 
              onClick={addField}
              disabled={isSubmitting}
            >
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Field' : '+ Add field')}
            </button>
            {isEditMode && (
              <button 
                className="cancel-edit-btn" 
                onClick={cancelEdit}
                disabled={isSubmitting}
                title="Cancel Edit"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="fields-table">
        <div className="table-header">
          <div className="header-cell">Field Name</div>
          <div className="header-cell">Field Type</div>
          <div className="header-cell">Description</div>
          <div className="header-cell" style={{ marginRight: "30px" }}>Actions</div>
        </div>
        
        <div className="table-body">
          {loading ? (
            <div className="loading-state">
              <div className="loading-message">Loading fields...</div>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-message">
                <span>Something went wrong. Please try again.</span>
              </div>
            </div>
          ) : fields.length === 0 ? (
            <div className="empty-state">
              <div className="empty-message">No records found</div>
            </div>
          ) : (
            fields.map((field) => (
              <div key={field.id} className={`table-row ${editingField === field.id ? 'editing' : ''}`}>
                <div className="table-cell">
                  <span className="field-display">
                    {field.fieldName}
                  </span>
                </div>
                <div className="table-cell">
                  <span className="field-display">
                    {field.fieldType}
                  </span>
                </div>
                <div className="table-cell">
                  <span className="field-display">
                    {field.description || 'No description'}
                  </span>
                </div>
                <div className="table-cell">
                  <div className="action-buttons">
                    <button
                      onClick={() => startEditing(field.id)}
                      className="edit-btn"
                      title="Edit"
                    >
                      <img 
                        src="https://img.icons8.com/?size=100&id=uURIXIy2oK8a&format=png&color=12B886"
                        alt="Edit"
                        width="40"
                        height="35"
                      />
                    </button>
                    <button
                      onClick={() => deleteField(field.id)}
                      className="delete-btn"
                      title="Delete"
                    >
                      <img 
                        src="https://img.icons8.com/?size=100&id=RVDvUJYxkige&format=png&color=12B886"
                        alt="Delete"
                        width="40"
                        height="40"
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <Popup
        isVisible={popup.isVisible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={hidePopup}
        onConfirm={popup.onConfirm}
      />
    </div>
  );
}