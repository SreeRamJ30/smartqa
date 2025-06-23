import React, { useState, useEffect } from 'react';
import './DOMResults.css';
import DOMDiffViewer, { LineDiffViewer } from '../../common/DOMDiffViewer';

function DOMResults() {
  // DOM reports state
  const [domReports, setDomReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);

  // Fetch DOM test reports when component mounts
  useEffect(() => {
    fetchDomReports();
  }, []);

  // Function to fetch DOM test reports
  const fetchDomReports = () => {
    setLoadingReports(true);
    fetch('http://localhost:3001/api/reports/dom?source=domtests')
      .then(response => response.json())
      .then(data => {
        setDomReports(data.reports || []);
        setLoadingReports(false);
      })
      .catch(error => {
        console.error('Error fetching DOM reports:', error);
        setLoadingReports(false);
      });
  };

  // Function to fetch a specific DOM test report
  const fetchReportDetails = (reportId) => {
    setLoadingReportDetails(true);
    fetch(`http://localhost:3001/api/reports/dom/${reportId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setSelectedReport(data.report);
        } else {
          alert(`Error: ${data.message}`);
        }
        setLoadingReportDetails(false);
      })
      .catch(error => {
        console.error('Error fetching report details:', error);
        setLoadingReportDetails(false);
      });
  };

  // Helper function to format timestamps
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    // Check if timestamp is in ISO format or a string
    let date;
    if (timestamp.includes('T')) {
      // Handle ISO format
      date = new Date(timestamp);
    } else if (timestamp.includes('-')) {
      // Handle custom format like in report IDs
      const parts = timestamp.split('-');
      if (parts.length >= 3) {
        // Extract date parts - assuming format 2025-06-13T11-26-06-556Z
        const datePart = parts.slice(0, 3).join('-');
        date = new Date(datePart);
      } else {
        return timestamp; // Return original if we can't parse
      }
    } else {
      return timestamp; // Return original if we can't parse
    }
    
    // Check if we have a valid date
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    
    // Format the date
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to render DOM differences
  const renderDomDifferences = (differences) => {
    return <DOMDiffViewer differences={differences} />;
  };

  // Function to render detailed DOM diff view with enhanced visualization
  const renderDomDiffView = (result) => {
    if (!result.differences || result.differences.length === 0) {
      return (
        <div className="no-differences">
          <i className="fas fa-check-circle"></i>
          <p>No DOM differences detected. The elements match between reference and testing sites.</p>
        </div>
      );
    }

    return (
      <div className="dom-diff-detailed-container">
        {/* Show DOM differences with enhanced visualization */}
        <DOMDiffViewer differences={result.differences} />
        
        {/* Line-by-line diff with enhanced styling */}
        {result.diffLines && result.diffLines.length > 0 && 
          <LineDiffViewer diffLines={result.diffLines} />
        }
      </div>
    );
  };

  // Function to handle HTML report download via new POST API (returns URL)
  const handleExportReport = async () => {
    if (!selectedReport || !selectedReport.id) {
      alert('No report selected to export');
      return;
    }
    // Try to use the full filename if available, otherwise search for the full filename in the backend
    let reportId = selectedReport.id;
    if (!reportId.endsWith('.json')) {
      reportId = reportId + '.json';
    }
    // If the id does not start with dom-test-report, try to find the full filename in the backend
    try {
      console.log('Exporting report with ID:', reportId);
      const response = await fetch('http://localhost:3001/api/export/dom-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to export report');
      }
      // Trigger download using the returned URL
      const downloadUrl = `http://localhost:3001${data.url}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadUrl.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Error exporting report: ' + error.message);
    }
  };

  return (
    <div className="dom-results-section">
      <h2>DOM Results</h2>
      <div className="refresh-button">
        <button onClick={fetchDomReports}>
          <i className="fas fa-sync-alt"></i> Refresh Reports
        </button>
      </div>
      <div className="dom-results-container">
        <div className="reports-list">
          <h3>Available Reports</h3>
          <div className="reports-header">
            <input 
              type="text" 
              placeholder="Search reports..." 
              className="report-search" 
            />
          </div>
          {loadingReports ? (
            <div className="loading-spinner">Loading reports...</div>
          ) : domReports.length > 0 ? (
            <ul className="report-list">
              {domReports.map(report => (
                <li 
                  key={report.id} 
                  className={selectedReport && selectedReport.id === report.id ? 'active' : ''}
                  onClick={() => fetchReportDetails(report.id)}
                >
                  <div className="report-header-row">
                    <span className="report-date">{formatTimestamp(report.timestamp || report.id)}</span>
                    {report.testId && (
                      <span className="report-id">ID: {report.testId}</span>
                    )}
                  </div>
                  
                  {report.user && (
                    <div className="report-user">
                      <i className="fas fa-user"></i>
                      <span>{report.user.fullName || report.user.email || 'Unknown user'}</span>
                    </div>
                  )}
                  
                  {report.totalTests && (
                    <span className="report-stats">
                      <span className="report-total">{report.totalTests}</span>
                      <span className="report-passed">{report.passed || 0}</span>
                      <span className="report-failed">{report.failed || 0}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <i className="fas fa-file-alt"></i>
              <p>No reports available</p>
              <p className="empty-state-hint">Run a DOM test to generate a report.</p>
            </div>
          )}
        </div>
        
        <div className="report-details">
          <h3>Report Details</h3>
          {loadingReportDetails ? (
            <div className="loading-spinner">Loading report details...</div>
          ) : selectedReport ? (
            <div className="report-content">
              <div className="report-header">
                <div className="report-summary">
                  <h4>{formatTimestamp(selectedReport.generatedAt || selectedReport.timestamp)}</h4>
                  
                  {/* Add user information display */}
                  {selectedReport.user && (
                    <div className="report-user-info">
                      <span className="user-label">Created by:</span>
                      <span className="user-name">{selectedReport.user.fullName}</span>
                      <span className="user-email">({selectedReport.user.email})</span>
                    </div>
                  )}
                  
                  {/* Add test ID display */}
                  {selectedReport.id && (
                    <div className="report-id-full">
                      <span className="id-label">Test ID:</span>
                      <span className="id-value">{selectedReport.id}</span>
                    </div>
                  )}
                  
                  {/* Add environment and performance information */}
                  <div className="report-metadata">
                    {selectedReport.executionTimeMs && (
                      <div className="metadata-item">
                        <span className="metadata-label">Execution Time:</span>
                        <span className="metadata-value">{(selectedReport.executionTimeMs / 1000).toFixed(2)}s</span>
                      </div>
                    )}
                    
                    {selectedReport.browser && (
                      <div className="metadata-item">
                        <span className="metadata-label">Browser:</span>
                        <span className="metadata-value">{selectedReport.browser}</span>
                      </div>
                    )}
                    
                    {selectedReport.testingDomain && selectedReport.referenceDomain && (
                      <div className="metadata-domains">
                        <div className="metadata-item">
                          <span className="metadata-label">Testing Domain:</span>
                          <span className="metadata-value domain">{selectedReport.testingDomain}</span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Reference Domain:</span>
                          <span className="metadata-value domain">{selectedReport.referenceDomain}</span>
                        </div>
                      </div>
                    )}
                    
                    {selectedReport.environment && (
                      <div className="metadata-environment">
                        <details>
                          <summary>Environment Details</summary>
                          <div className="environment-details">
                            {selectedReport.environment.date && (
                              <div className="metadata-item">
                                <span className="metadata-label">Date:</span>
                                <span className="metadata-value">{selectedReport.environment.date}</span>
                              </div>
                            )}
                            {selectedReport.environment.time && (
                              <div className="metadata-item">
                                <span className="metadata-label">Time:</span>
                                <span className="metadata-value">{selectedReport.environment.time}</span>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                  
                  <div className="report-metrics">
                    <div className="metric">
                      <span className="metric-label">Total Tests</span>
                      <span className="metric-value">{selectedReport.totalTests || 'N/A'}</span>
                    </div>
                    <div className="metric passed">
                      <span className="metric-label">Passed</span>
                      <span className="metric-value">{selectedReport.passedTests || 0}</span>
                    </div>
                    <div className="metric failed">
                      <span className="metric-label">Failed</span>
                      <span className="metric-value">{selectedReport.failedTests || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="report-actions">
                  <button className="action-button" onClick={handleExportReport}>
                    <i className="fas fa-download"></i> Export
                  </button>
                  <div className="filter-controls">
                    <label>
                      <input type="checkbox" defaultChecked /> 
                      Show Passed
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked /> 
                      Show Failed
                    </label>
                  </div>
                </div>
              </div>
              
              <h4>DOM Comparison Results</h4>
              {selectedReport.results && selectedReport.results.length > 0 ? (
                <div className="test-results">
                  {selectedReport.results.map((result, index) => (
                    <div key={index} className={`test-result-card ${result.status === 'PASS' ? 'passed' : 'failed'}`}>
                      <div className="test-result-header" onClick={() => {
                        // Toggle expanded state for this result
                        const updatedReport = {...selectedReport};
                        updatedReport.results[index].expanded = !result.expanded;
                        setSelectedReport(updatedReport);
                      }}>
                        <div className="test-status-icon">
                          <i className={`fas ${result.status === 'PASS' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                        </div>
                        <div className="test-result-title">
                          <h5>
                            {result.testingUrl ? new URL(result.testingUrl).pathname.split('/').pop() : `Test ${index + 1}`}
                          </h5>
                          <span className="test-result-path">{result.status === 'PASS' ? 'No differences detected' : `${result.differencesCount || 'Multiple'} differences found`}</span>
                        </div>
                        <div className="test-result-toggle">
                          <i className={`fas ${result.expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                        </div>
                      </div>
                      
                      {result.expanded && (
                        <div className="test-result-details">
                          {/* Enhanced test report with improved diff visualization */}
                          <div className="webdriverio-report">
                            <div className="result-section">
                              <h6>Test Info</h6>
                              <div className="detail-item">
                                <span className="detail-label">Testing URL:</span>
                                <span className="detail-value url">{result.testingUrl || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Reference URL:</span>
                                <span className="detail-value url">{result.referenceUrl || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Status:</span>
                                <span className={`detail-value status ${result.status.toLowerCase()}`}>{result.status}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Differences:</span>
                                <span className="detail-value">{result.differencesCount || 'Unknown'}</span>
                              </div>
                            </div>
                            
                            {/* Use the renderDomDiffView function for visualization */}
                            {renderDomDiffView(result)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-clipboard-list"></i>
                  <p>No test results found in this report</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-file-search"></i>
              <p>Select a report from the list</p>
              <p className="empty-state-hint">Click on a report to view detailed results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DOMResults;