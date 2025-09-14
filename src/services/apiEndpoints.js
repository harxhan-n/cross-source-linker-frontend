// API endpoints configuration
const API_BASE_URL = 'http://192.168.1.7:8080';

// API endpoints
export const API_ENDPOINTS = {
  ALL_BATCHES: {
    url: `${API_BASE_URL}/all_batches`,
    method: 'GET'
  },
  PROCESS_BATCH: {
    url: `${API_BASE_URL}/process_batch`,
    method: 'POST'
  },
  FETCH_BATCH_RESULTS: {
    url: `${API_BASE_URL}/fetch_batch_results`,
    method: 'POST'
  },
  EXPORT_BATCH_RESULTS: {
    url: `${API_BASE_URL}/export_batch_results`,
    method: 'POST'
  },
  RE_RUN_BATCH: {
    url: `${API_BASE_URL}/re_run_batch`,
    method: 'POST'
  },
  ALL_FIELDS: {
    url: `${API_BASE_URL}/all_fields`,
    method: 'GET'
  },
  CONFIGURE_FIELDS: {
    url: `${API_BASE_URL}/configure_fields`,
    method: 'POST'
  },
  EDIT_FIELDS: {
    url: `${API_BASE_URL}/edit_fields`,
    method: 'PATCH'
  },
  DELETE_FIELDS: {
    url: `${API_BASE_URL}/delete_fields`,
    method: 'DELETE'
  },
  FETCH_FIELD_OPTIONS: {
    url: `${API_BASE_URL}/fetch_fields`,
    method: 'GET'
  },
  ALL_RULES: {
    url: `${API_BASE_URL}/all_rules`,
    method: 'GET'
  },
  CREATE_RULE: {
    url: `${API_BASE_URL}/configure_rules`,
    method: 'POST'
  },
  UPDATE_RULE: {
    url: `${API_BASE_URL}/edit_rules`,
    method: 'PATCH'
  },
  DELETE_RULE: {
    url: `${API_BASE_URL}/delete_rules`,
    method: 'DELETE'
  }
};

// HTTP methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
};

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};