
import React, { useState } from 'react';

import Sidebar from './components/Sidebar/Sidebar';
import BatchForm from './components/BatchForm/BatchForm';
import ConfigurationPage from './components/ConfigurationPage/ConfigurationPage';
import BatchResults from './components/BatchResults/BatchResults';
import './App.css';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'configuration', or 'batchResults'
  const [selectedBatch, setSelectedBatch] = useState(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const refreshSidebar = () => {
    setSidebarRefreshTrigger(prev => prev + 1);
  };

  const navigateToConfiguration = () => {
    setCurrentView('configuration');
  };

  const navigateToHome = () => {
    setCurrentView('home');
    setSelectedBatch(null);
  };

  const navigateToBatchResults = (batch) => {
    setSelectedBatch(batch);
    setCurrentView('batchResults');
  };

  const handleBatchReprocessed = (newBatchId, newBatchName) => {
    // Refresh the sidebar to show the new batch
    refreshSidebar();
    
    // Navigate to the new batch results
    setSelectedBatch({
      batch_id: newBatchId,
      batch_name: newBatchName
    });
    // Keep the current view as 'batchResults' to stay on the batch results page
  };

  return (
    <div className="app-root">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={toggleSidebar} 
        refreshTrigger={sidebarRefreshTrigger}
        onNavigateToConfiguration={navigateToConfiguration}
        onNavigateToBatchResults={navigateToBatchResults}
        currentView={currentView}
      />
      <main className={`main-content${sidebarOpen ? ' sidebar-open' : ''}`}>
        {currentView === 'home' && (
          <div className="content-wrapper">
            <header className="main-header">
              <h1>Ready to unlock insights from your data?</h1>
              <p>Upload your source and target files to find matches and connections</p>
            </header>
            
            <section className="form-section">
              <BatchForm 
                onBatchProcessed={refreshSidebar} 
                onNavigateToBatchResults={navigateToBatchResults}
              />
            </section>
          </div>
        )}
        
        {currentView === 'configuration' && (
          <ConfigurationPage onBack={navigateToHome} />
        )}

        {currentView === 'batchResults' && selectedBatch && (
          <BatchResults 
            batchId={selectedBatch.batch_id}
            batchName={selectedBatch.batch_name}
            onNavigateBack={navigateToHome}
            onBatchReprocessed={handleBatchReprocessed}
          />
        )}
      </main>
    </div>
  );
}
