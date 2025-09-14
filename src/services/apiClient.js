import { API_ENDPOINTS, DEFAULT_HEADERS } from './apiEndpoints.js';

class ApiClient {
  /**
   * Make a generic API request
   * @param {string} url - The API endpoint URL
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param {Object|FormData} body - Request body (optional)
   * @param {Object} headers - Additional headers (optional)
   * @returns {Promise<Object>} API response
   */
  async makeRequest(url, method = 'GET', body = null, headers = {}) {
    try {
      const config = {
        method,
        headers: {
          ...headers
        }
      };

      // Handle FormData differently than JSON
      if (body instanceof FormData) {
        config.body = body;
        // Don't set Content-Type for FormData, let browser set it with boundary
      } else if (body && method !== 'GET') {
        config.headers = {
          ...DEFAULT_HEADERS,
          ...headers
        };
        config.body = JSON.stringify(body);
      } else {
        config.headers = {
          ...DEFAULT_HEADERS,
          ...headers
        };
      }

      const response = await fetch(url, config);
      
      // Get response text first to handle NaN values
      const responseText = await response.text();
      
      // Replace NaN values with null before parsing JSON
      const sanitizedText = responseText.replace(/:\s*NaN\s*([,}])/g, ': null$1');
      
      const data = JSON.parse(sanitizedText);
      
      // Don't throw errors, instead return the error response
      // This allows us to handle API error messages properly
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      // Return a structured error response similar to API error format
      return {
        status_code: 500,
        status_message: "ERROR",
        message: error.message || "Network error. Please check your connection and try again."
      };
    }
  }

  /**
   * Fetch all batches from the API
   * @returns {Promise<Object>} API response with batch data
   */
  async getAllBatches() {
    const { url, method } = API_ENDPOINTS.ALL_BATCHES;
    return this.makeRequest(url, method);
  }

  /**
   * Fetch all fields from the API
   * @returns {Promise<Object>} API response with field data
   */
  async getAllFields() {
    const { url, method } = API_ENDPOINTS.ALL_FIELDS;
    return this.makeRequest(url, method);
  }

  /**
   * Configure/Add a new field
   * @param {string} fieldName - Name of the field
   * @param {string} fieldType - Type of the field
   * @param {string} description - Description of the field
   * @returns {Promise<Object>} API response with updated field list
   */
  async configureFields(fieldName, fieldType, description) {
    const { url, method } = API_ENDPOINTS.CONFIGURE_FIELDS;
    
    // Ensure all required fields are provided
    if (!fieldName || !fieldType || !description) {
      return {
        status_code: 400,
        status_message: "BAD REQUEST",
        message: "Missing required key(s): field_name, field_type, description"
      };
    }
    
    const body = {
      field_name: fieldName,
      field_type: fieldType,
      description: description || ''
    };
    
    try {
      return await this.makeRequest(url, method, body);
    } catch (error) {
      // Handle network errors or other exceptions
      console.error("Error in configureFields:", error);
      return {
        status_code: 500,
        status_message: "INTERNAL SERVER ERROR",
        message: error.message || "Unexpected error occurred. Please try again!"
      };
    }
  }

  /**
   * Edit an existing field
   * @param {string} originalFieldName - Original field name for the URL
   * @param {string} fieldName - Field name (should match originalFieldName as it cannot be updated)
   * @param {string} fieldType - Type of the field
   * @param {string} description - Description of the field
   * @param {boolean} isActive - Whether field is active
   * @returns {Promise<Object>} API response with updated field list
   */
  async editFields(originalFieldName, fieldName, fieldType, description, isActive = true) {
    const { url, method } = API_ENDPOINTS.EDIT_FIELDS;
    const fullUrl = `${url}/${encodeURIComponent(originalFieldName)}`;
    const body = {
      type: fieldType,
      description: description || '',
      is_active: isActive
    };
    return this.makeRequest(fullUrl, method, body);
  }

  /**
   * Delete a field
   * @param {string} fieldName - Name of the field to delete
   * @returns {Promise<Object>} API response with updated field list
   */
  async deleteFields(fieldName) {
    const { url, method } = API_ENDPOINTS.DELETE_FIELDS;
    const fullUrl = `${url}/${encodeURIComponent(fieldName)}`;
    return this.makeRequest(fullUrl, method);
  }

  /**
   * Process a batch with source and target files
   * @param {string} batchName - Name of the batch
   * @param {File} sourceFile - Source CSV/Excel file
   * @param {File} targetFile - Target CSV/Excel file
   * @returns {Promise<Object>} API response with processing results
   */
  async processBatch(batchName, sourceFile, targetFile) {
    const { url, method } = API_ENDPOINTS.PROCESS_BATCH;
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('batch_name', batchName);
    formData.append('source_file', sourceFile);
    formData.append('target_file', targetFile);
    
    return this.makeRequest(url, method, formData);
  }
  
}// Export a singleton instance
export const apiClient = new ApiClient();

// Export individual API functions for easier imports
export const batchApi = {
  getAllBatches: () => apiClient.getAllBatches(),
  processBatch: (batchName, sourceFile, targetFile) => apiClient.processBatch(batchName, sourceFile, targetFile),
  
  /**
   * Fetch batch results by batch ID
   * @param {string} batchId - ID of the batch to fetch results for
   * @returns {Promise<Object>} API response with batch results
   */
  fetchBatchResults: async (batchId) => {
    const { url, method } = API_ENDPOINTS.FETCH_BATCH_RESULTS;
    return apiClient.makeRequest(url, method, { batch_id: batchId });
  },

  /**
   * Export batch results to Excel and upload to Google Drive
   * @param {string} batchId - The batch ID to export
   * @returns {Promise<Object>} API response with file link and file name
   */
  exportBatchResults: async (batchId) => {
    const { url, method } = API_ENDPOINTS.EXPORT_BATCH_RESULTS;
    return apiClient.makeRequest(url, method, { batch_id: batchId });
  },

  /**
   * Re-run a batch with current matching rules
   * @param {string} batchId - The batch ID to re-run
   * @returns {Promise<Object>} API response with new batch details
   */
  reRunBatch: async (batchId) => {
    const { url, method } = API_ENDPOINTS.RE_RUN_BATCH;
    return apiClient.makeRequest(url, method, { batch_id: batchId });
  }
};

export const fieldApi = {
  getAllFields: () => apiClient.getAllFields(),
  configureFields: (fieldName, fieldType, description) => 
    apiClient.configureFields(fieldName, fieldType, description),
  editFields: (originalFieldName, fieldName, fieldType, description, isActive) => 
    apiClient.editFields(originalFieldName, fieldName, fieldType, description, isActive),
  deleteFields: (fieldName) => apiClient.deleteFields(fieldName)
};

// Rules API methods
export const rulesApi = {
  /**
   * Fetch field options for dropdowns (match classifications and match types)
   * @returns {Promise<Object>} API response with field options data
   */
  fetchFieldOptions: async () => {
    const { url, method } = API_ENDPOINTS.FETCH_FIELD_OPTIONS;
    return apiClient.makeRequest(url, method);
  },
  
  /**
   * Fetch all rules
   * @returns {Promise<Object>} API response with rules data
   */
  getAllRules: async () => {
    const { url, method } = API_ENDPOINTS.ALL_RULES;
    return apiClient.makeRequest(url, method);
  },
  
  /**
   * Create a new rule
   * @param {Object} ruleData - The rule data to create
   * @returns {Promise<Object>} API response with created rule
   */
  createRule: async (ruleData) => {
    const { url, method } = API_ENDPOINTS.CREATE_RULE;
    return apiClient.makeRequest(url, method, ruleData);
  },
  
  /**
   * Update an existing rule
   * @param {number} ruleId - ID of the rule to update
   * @param {Object} ruleData - Updated rule data
   * @returns {Promise<Object>} API response with updated rule
   */
  updateRule: async (ruleId, ruleData) => {
    const { url, method } = API_ENDPOINTS.UPDATE_RULE;
    const fullUrl = `${url}/${ruleId}`;
    return apiClient.makeRequest(fullUrl, method, ruleData);
  },
  
  /**
   * Delete a rule
   * @param {number} ruleId - ID of the rule to delete
   * @returns {Promise<Object>} API response with deletion status
   */
  deleteRule: async (ruleId) => {
    const { url, method } = API_ENDPOINTS.DELETE_RULE;
    const fullUrl = `${url}/${ruleId}`;
    return apiClient.makeRequest(fullUrl, method);
  }
};