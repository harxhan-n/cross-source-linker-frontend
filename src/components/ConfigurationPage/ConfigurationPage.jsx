import React, { useState } from 'react';
import './ConfigurationPage.css';
import FieldConfiguration from './FieldConfiguration/FieldConfiguration.jsx';
import CrossSourceLinkRules from './CrossSourceLinkRules/CrossSourceLinkRules.jsx';

export default function ConfigurationPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('fields');

  return (
    <div className="configuration-page">
      <div className="configuration-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="configuration-tabs">
        <button 
          className={`tab-button ${activeTab === 'fields' ? 'active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          Dataset Field Configuration
        </button>
        <button 
          className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Cross Source Link Rules
        </button>
      </div>

      <div className="configuration-content">
        {activeTab === 'fields' && (
          <FieldConfiguration />
        )}
        {activeTab === 'rules' && (
          <CrossSourceLinkRules />
        )}
      </div>
    </div>
  );
}