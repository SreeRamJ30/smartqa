import React, { useState, useEffect } from 'react';
import './VisualResults.css';

function VisualResults() {
  // Visual reports state
  const [visualReports, setVisualReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassed, setShowPassed] = useState(true);
  const [showFailed, setShowFailed] = useState(true);

  // Fetch visual test reports when component mounts
  useEffect(() => {
    fetchVisualReports();
    
    // Check for latest test results from session storage
    const latestResults = sessionStorage.getItem('latestVisualTestResults');
    if (latestResults) {
      try {
        const results = JSON.parse(latestResults);
        // Auto-select the latest test results if available
        setTimeout(() => {
          const latestReport = visualReports.find(report => report.testId === results.testId);
          if (latestReport) {
            fetchReportDetails(latestReport.id);
          }
        }, 1000);
        // Clear the session storage after use
        sessionStorage.removeItem('latestVisualTestResults');
      } catch (e) {
        console.error('Error parsing latest test results:', e);
      }
    }
  }, []);

  // Function to fetch visual test reports
  const fetchVisualReports = () => {
    setLoadingReports(true);
    fetch('http://localhost:3001/api/reports/visual')
      .then(response => response.json())
      .then(data => {
        setVisualReports(data.reports || []);
        setLoadingReports(false);
      })
      .catch(error => {
        console.error('Error fetching visual reports:', error);
        setLoadingReports(false);
      });
  };

  // Function to fetch a specific visual test report
  const fetchReportDetails = (reportId) => {
    setLoadingReportDetails(true);
    
    // Store the selected report ID for export matching
    window.lastSelectedReportId = reportId;
    
    fetch(`http://localhost:3001/api/reports/visual/${reportId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Ensure the report has the correct ID for matching
          const reportWithId = {
            ...data.report,
            id: data.report.id || reportId
          };
          setSelectedReport(reportWithId);
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
        // Extract date parts - assuming format 2025-06-16T10-11-11579Z
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

  // Helper function to construct proper image URLs from relative paths
  const constructImageUrl = (relativePath) => {
    if (!relativePath) return null;
    
    // Convert Windows backslashes to forward slashes
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    // Remove leading ../ patterns but keep the bitmaps_ directory structure
    let cleanPath = normalizedPath.replace(/^\.\.\//, '');
    
    // Ensure the path includes backstop_data if it's missing
    if (!cleanPath.includes('backstop_data/')) {
      cleanPath = `backstop_data/${cleanPath}`;
    }
    
    // Return the full URL with the backend base URL and VISUAL path
    return `http://localhost:3001/VISUAL/${cleanPath}`;
  };

  // Function to render visual differences with enhanced styling
  const renderVisualDifferences = (differences, result) => {
    // Handle null, undefined, or empty differences
    if (!differences || 
        (Array.isArray(differences) && differences.length === 0) ||
        (typeof differences === 'object' && Object.keys(differences).length === 0)) {
      return (
        <div className="no-differences">
          <i className="fas fa-check-circle"></i>
          <p>No visual differences detected. The screenshots match between reference and testing sites.</p>
        </div>
      );
    }

    // Normalize differences to array format if it's not already
    let diffsArray = differences;
    if (!Array.isArray(differences)) {
      if (typeof differences === 'object') {
        diffsArray = Object.values(differences);
      } else {
        diffsArray = [differences];
      }
    }
    
    // Count different types of visual changes
    const totalDiffs = diffsArray.length;
    const significantDiffs = diffsArray.filter(diff => 
      result.rawMisMatchPercentage > (result.threshold || 0.1) * 100).length;

    return (
      <div className="visual-diff-container">
        {/* Summary section */}
        <div className="diff-summary">
          <div className="diff-summary-title">Visual Differences Summary</div>
          <div className="diff-stats">
            <div className="diff-stat-item">
              <span className="diff-stat-count visual-diff">{result.misMatchPercentage}%</span>
              <span>Visual difference</span>
            </div>
            <div className="diff-stat-item">
              <span className="diff-stat-count threshold">{(result.threshold * 100).toFixed(1)}%</span>
              <span>Threshold</span>
            </div>
            <div className="diff-stat-item">
              <span className="diff-stat-count analysis-time">{result.analysisTime || 0}ms</span>
              <span>Analysis time</span>
            </div>
          </div>
        </div>

        {/* Visual differences */}
        {diffsArray.map((diff, index) => (
          <div key={index} className="visual-diff-element">
            <span className="diff-marker diff-marker-visual">
              <i className="fas fa-exclamation-triangle"></i>
            </span>
            
            <div className="element-content">
              <span className="issue-description">{diff.issue || 'Visual difference detected'}</span>
              
              <div className="visual-metadata">
                <div className="metadata-row">
                  <span className="metadata-label">Page:</span>
                  <span className="metadata-value">{result.pageName}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Viewport:</span>
                  <span className="metadata-value">{result.viewport}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Mismatch:</span>
                  <span className="metadata-value mismatch">{result.misMatchPercentage}%</span>
                </div>
                {result.dimensions && (
                  <div className="metadata-row">
                    <span className="metadata-label">Dimensions:</span>
                    <span className="metadata-value">
                      {result.dimensions.width}×{result.dimensions.height}
                      {!result.isSameDimensions && <span className="dimension-warning"> (Different sizes!)</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Function to render detailed visual diff view with image comparison
  const renderVisualDiffView = (result) => {
    if (!result.differences || result.differences.length === 0) {
      return (
        <div className="no-differences">
          <i className="fas fa-check-circle"></i>
          <p>No visual differences detected. The screenshots match between reference and testing sites.</p>
        </div>
      );
    }

    return (
      <div className="visual-diff-detailed-container">
        {/* Enhanced image comparison with better layout */}
        <div className="image-comparison-section">
          <div className="image-comparison-header">
            <i className="fas fa-images"></i>
            <span>Visual Comparison - {result.viewport} viewport</span>
            <div className="comparison-stats">
              <span className="stat-badge mismatch">{result.misMatchPercentage}% different</span>
              <span className="stat-badge threshold">Threshold: {(result.threshold * 100).toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="image-comparison-grid">
            {result.referencePath && (
              <div className="image-container reference">
                <div className="image-header">
                  <h4><i className="fas fa-bookmark"></i> Reference Image</h4>
                  <span className="image-info">Expected appearance</span>
                </div>
                <div className="image-wrapper">
                  <img 
                    src={constructImageUrl(result.referencePath)} 
                    alt="Reference" 
                    className="comparison-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="image-error" style={{display: 'none'}}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Reference image not found</p>
                  </div>
                </div>
              </div>
            )}
            
            {result.testPath && (
              <div className="image-container test">
                <div className="image-header">
                  <h4><i className="fas fa-flask"></i> Test Image</h4>
                  <span className="image-info">Current appearance</span>
                </div>
                <div className="image-wrapper">
                  <img 
                    src={constructImageUrl(result.testPath)} 
                    alt="Test" 
                    className="comparison-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="image-error" style={{display: 'none'}}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Test image not found</p>
                  </div>
                </div>
              </div>
            )}
            
            {result.diffPath && (
              <div className="image-container diff">
                <div className="image-header">
                  <h4><i className="fas fa-search"></i> Difference</h4>
                  <span className="image-info">{result.misMatchPercentage}% different</span>
                </div>
                <div className="image-wrapper">
                  <img 
                    src={constructImageUrl(result.diffPath)} 
                    alt="Difference" 
                    className="comparison-image diff-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="image-error" style={{display: 'none'}}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Difference image not found</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Image interaction controls */}
          <div className="image-controls">
            <button className="control-btn" onClick={() => openImageModal(result)}>
              <i className="fas fa-expand"></i> View Full Size
            </button>
            <button className="control-btn" onClick={() => downloadImages(result)}>
              <i className="fas fa-download"></i> Download Images
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Function to handle HTML report export similar to DOM results
  const handleExportReport = () => {
    if (!selectedReport) {
      alert('No report selected to export');
      return;
    }
    
    console.log('Selected report:', selectedReport);
    console.log('Available visual reports:', visualReports);
    
    // Store the current selected report ID for matching
    const currentReportId = selectedReport.id || selectedReport.testId;
    
    // Find the original report from the list to get the correct filename
    // Try multiple matching strategies
    let originalReport = null;
    
    // Strategy 1: Match by exact id (most reliable)
    originalReport = visualReports.find(report => report.id === currentReportId);
    console.log('Strategy 1 (match by exact id):', originalReport);
    
    // Strategy 2: Match by testId from both sides
    if (!originalReport) {
      originalReport = visualReports.find(report => 
        (report.testId === selectedReport.testId) || 
        (report.testId === selectedReport.id) ||
        (report.id === selectedReport.testId)
      );
      console.log('Strategy 2 (match by testId):', originalReport);
    }
    
    // Strategy 3: Match by filename patterns in the id
    if (!originalReport && currentReportId) {
      // Extract timestamp and user parts for flexible matching
      const reportIdParts = currentReportId.replace(/^visual-test-report-/, '').replace(/\.json$/, '');
      originalReport = visualReports.find(report => {
        const listReportParts = report.id.replace(/^visual-test-report-/, '').replace(/\.json$/, '');
        return reportIdParts === listReportParts;
      });
      console.log('Strategy 3 (match by filename pattern):', originalReport);
    }
    
    // Strategy 4: Match by timestamp if available
    if (!originalReport && selectedReport.timestamp) {
      originalReport = visualReports.find(report => 
        report.timestamp === selectedReport.timestamp ||
        report.timestamp === selectedReport.generatedAt
      );
      console.log('Strategy 4 (match by timestamp):', originalReport);
    }
    
    // Strategy 5: Use the currently selected report from the list (if we're viewing one)
    if (!originalReport && window.lastSelectedReportId) {
      originalReport = visualReports.find(report => report.id === window.lastSelectedReportId);
      console.log('Strategy 5 (match by last selected):', originalReport);
    }
    
    // Strategy 6: Use the first report if we only have one (fallback)
    if (!originalReport && visualReports.length === 1) {
      originalReport = visualReports[0];
      console.log('Strategy 6 (fallback to single report):', originalReport);
    }
    
    if (!originalReport) {
      console.error('Could not find matching report. Debug info:');
      console.error('selectedReport.id:', selectedReport.id);
      console.error('selectedReport.testId:', selectedReport.testId);
      console.error('selectedReport.timestamp:', selectedReport.timestamp);
      console.error('Available report IDs:', visualReports.map(r => r.id));
      console.error('Available report testIds:', visualReports.map(r => r.testId));
      console.error('Available report timestamps:', visualReports.map(r => r.timestamp));
      
      // Provide more helpful error message with suggestions
      alert('Could not find the original report filename. Please try refreshing the reports list and selecting the report again.');
      return;
    }
    
    // Use the original filename and replace .json with .html, and visual-test-report with visual-test-html-report
    const jsonFileName = originalReport.id; // This is like "visual-test-report-2025-06-17T02-17-57.559Z-Sreeram1-3x34l.json"
    const htmlReportFileName = jsonFileName
      .replace('visual-test-report-', 'visual-test-html-report-')
      .replace('.json', '.html');
    
    // Create a URL to the HTML report file
    const reportUrl = `http://localhost:3001/VISUAL/reports/${htmlReportFileName}`;
    
    console.log(`Original JSON filename: ${jsonFileName}`);
    console.log(`HTML report filename: ${htmlReportFileName}`);
    console.log(`Full URL: ${reportUrl}`);
    
    // First check if the HTML report exists by making a HEAD request
    fetch(reportUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          // File exists, proceed with download
          const link = document.createElement('a');
          link.href = reportUrl;
          link.download = htmlReportFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          throw new Error(`HTML report not found (${response.status})`);
        }
      })
      .catch(error => {
        console.error('Error accessing HTML report:', error);
        alert(`Could not access the HTML report. The file might not exist at: ${htmlReportFileName}`);
      });
  };

  // Function to open image modal (placeholder for future implementation)
  const openImageModal = (result) => {
    // This could open a full-screen modal with the images
    console.log('Opening image modal for:', result.pageName, result.viewport);
    // For now, open the difference image in a new tab
    if (result.diffPath) {
      window.open(constructImageUrl(result.diffPath), '_blank');
    }
  };

  // Function to download images (placeholder for future implementation)
  const downloadImages = (result) => {
    // This could trigger downloads of all three images
    console.log('Downloading images for:', result.pageName, result.viewport);
    
    // Download difference image if available
    if (result.diffPath) {
      const link = document.createElement('a');
      link.href = constructImageUrl(result.diffPath);
      link.download = `${result.pageName}-${result.viewport}-diff.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Filter reports based on search and status filters
  const filteredReports = visualReports.filter(report => {
    // Search filter
    const matchesSearch = !searchTerm || 
      report.testId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatTimestamp(report.timestamp).toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const hasPassedTests = report.summary?.passedTests > 0;
    const hasFailedTests = report.summary?.failedTests > 0;
    
    const matchesStatus = (showPassed && hasPassedTests) || 
                         (showFailed && hasFailedTests) ||
                         (!hasPassedTests && !hasFailedTests); // Show reports with no specific status
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="visual-results-section">
      <h2>Visual Results</h2>
      <div className="refresh-button">
        <button onClick={fetchVisualReports}>
          <i className="fas fa-sync-alt"></i> Refresh Reports
        </button>
      </div>
      <div className="visual-results-container">
        <div className="reports-list">
          <h3>Available Reports</h3>
          <div className="reports-header">
            <input 
              type="text" 
              placeholder="Search reports..." 
              className="report-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="report-filters">
              <label>
                <input 
                  type="checkbox" 
                  checked={showPassed}
                  onChange={(e) => setShowPassed(e.target.checked)}
                /> 
                Show Passed
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={showFailed}
                  onChange={(e) => setShowFailed(e.target.checked)}
                /> 
                Show Failed
              </label>
            </div>
          </div>
          {loadingReports ? (
            <div className="loading-spinner">Loading reports...</div>
          ) : filteredReports.length > 0 ? (
            <ul className="report-list">
              {filteredReports.map(report => (
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
                  
                  {report.summary && (
                    <div className="report-stats">
                      <span className="report-total">{report.summary.totalTests || 0} tests</span>
                      <span className="report-passed">{report.summary.passedTests || 0} passed</span>
                      <span className="report-failed">{report.summary.failedTests || 0} failed</span>
                      <span className="report-success-rate">{report.summary.successRate || 0}% success</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <i className="fas fa-images"></i>
              <p>No visual reports available</p>
              <p className="empty-state-hint">Run a visual test to generate a report.</p>
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
                    {selectedReport.summary?.executionTimeMs && (
                      <div className="metadata-item">
                        <span className="metadata-label">Execution Time:</span>
                        <span className="metadata-value">{(selectedReport.summary.executionTimeMs / 1000).toFixed(2)}s</span>
                      </div>
                    )}
                    
                    {selectedReport.results && selectedReport.results.length > 0 && (
                      <div className="metadata-item">
                        <span className="metadata-label">Viewports:</span>
                        <span className="metadata-value">
                          {[...new Set(selectedReport.results.map(r => r.viewport))].join(', ')}
                        </span>
                      </div>
                    )}
                    
                    {selectedReport.results && selectedReport.results.length > 0 && (
                      <div className="metadata-item">
                        <span className="metadata-label">Pages Tested:</span>
                        <span className="metadata-value">
                          {[...new Set(selectedReport.results.map(r => r.pageName))].length} pages
                        </span>
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
                      <span className="metric-value">{selectedReport.summary?.totalTests || 'N/A'}</span>
                    </div>
                    <div className="metric passed">
                      <span className="metric-label">Passed</span>
                      <span className="metric-value">{selectedReport.summary?.passedTests || 0}</span>
                    </div>
                    <div className="metric failed">
                      <span className="metric-label">Failed</span>
                      <span className="metric-value">{selectedReport.summary?.failedTests || 0}</span>
                    </div>
                    <div className="metric success-rate">
                      <span className="metric-label">Success Rate</span>
                      <span className="metric-value">{selectedReport.summary?.successRate || 0}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="report-actions">
                  <button className="action-button" onClick={handleExportReport}>
                    <i className="fas fa-download"></i> Export HTML
                  </button>
                  <button className="action-button" onClick={() => window.open(`http://localhost:3001/api/reports/visual/${selectedReport.id}`, '_blank')}>
                    <i className="fas fa-file-code"></i> View JSON
                  </button>
                  <div className="filter-controls">
                    <label>
                      <input type="checkbox" defaultChecked onChange={(e) => {
                        // Filter passed tests in detailed view
                        const cards = document.querySelectorAll('.test-result-card.passed');
                        cards.forEach(card => {
                          card.style.display = e.target.checked ? 'block' : 'none';
                        });
                      }} /> 
                      Show Passed
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked onChange={(e) => {
                        // Filter failed tests in detailed view
                        const cards = document.querySelectorAll('.test-result-card.failed');
                        cards.forEach(card => {
                          card.style.display = e.target.checked ? 'block' : 'none';
                        });
                      }} /> 
                      Show Failed
                    </label>
                  </div>
                </div>
              </div>
              
              <h4>Visual Comparison Results</h4>
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
                            {result.pageName} - {result.viewport}
                          </h5>
                          <span className="test-result-path">
                            {result.status === 'PASS' 
                              ? 'No visual differences detected' 
                              : `${result.misMatchPercentage}% visual difference (threshold: ${(result.threshold * 100).toFixed(1)}%)`
                            }
                          </span>
                        </div>
                        <div className="test-result-toggle">
                          <i className={`fas ${result.expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                        </div>
                      </div>
                      
                      {result.expanded && (
                        <div className="test-result-details">
                          {/* Enhanced test report with improved visual diff visualization */}
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
                                <span className="detail-label">Viewport:</span>
                                <span className="detail-value">{result.viewport}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Status:</span>
                                <span className={`detail-value status ${result.status.toLowerCase()}`}>{result.status}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Visual Difference:</span>
                                <span className="detail-value">{result.misMatchPercentage}%</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Threshold:</span>
                                <span className="detail-value">{(result.threshold * 100).toFixed(1)}%</span>
                              </div>
                              {result.analysisTime && (
                                <div className="detail-item">
                                  <span className="detail-label">Analysis Time:</span>
                                  <span className="detail-value">{result.analysisTime}ms</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Use the renderVisualDiffView function for visualization */}
                            {result.status === 'FAIL' ? renderVisualDiffView(result) : (
                              <div className="no-differences">
                                <i className="fas fa-check-circle"></i>
                                <p>No visual differences detected. Screenshots match perfectly.</p>
                              </div>
                            )}
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
              <p className="empty-state-hint">Click on a report to view detailed visual comparison results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VisualResults;