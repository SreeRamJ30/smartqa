import React, { useEffect, useState } from 'react';
import './CombinedResults.css';
import TabNavigation from '../../common/TabNavigation';
import DOMDiffViewer, { LineDiffViewer } from '../../common/DOMDiffViewer';

function CombinedResults() {
  // State for combined reports
  const [combinedReports, setCombinedReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [expandedResults, setExpandedResults] = useState({});
  
  // Filter states
  const [showPassedTests, setShowPassedTests] = useState(true);
  const [showFailedTests, setShowFailedTests] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterViewport, setFilterViewport] = useState('all');
  
  // Sort states
  const [domSortBy, setDomSortBy] = useState('status');
  const [visualSortBy, setVisualSortBy] = useState('status');

  // New comparison features
  const [compareMode, setCompareMode] = useState(false);
  const [selectedReportsForComparison, setSelectedReportsForComparison] = useState([]);
  const [showTrends, setShowTrends] = useState(false);

  useEffect(() => {
    fetchCombinedReports();
    
    // Auto-select latest report from session storage if available
    const latestResults = sessionStorage.getItem('latestCombinedTestResults');
    if (latestResults) {
      try {
        const results = JSON.parse(latestResults);
        setTimeout(() => {
          const latestReport = combinedReports.find(report => report.testId === results.testId);
          if (latestReport) {
            fetchReportDetails(latestReport.id);
          }
        }, 500);
        sessionStorage.removeItem('latestCombinedTestResults');
      } catch (e) {
        console.log('No valid latest results found');
      }
    }
  }, [combinedReports.length]); // Changed dependency to avoid infinite loop

  // Function to fetch combined test reports
  const fetchCombinedReports = () => {
    setLoadingReports(true);
    fetch('http://localhost:3001/api/reports/combined')
      .then(response => response.json())
      .then((data) => {
        setCombinedReports(data.reports || []);
        setLoadingReports(false);
        
        // Show success feedback
        console.log(`Refreshed: Found ${data.reports?.length || 0} combined reports`);
      })
      .catch(error => {
        console.error('Error fetching combined reports:', error);
        setLoadingReports(false);
        alert('Failed to refresh reports. Please try again.');
      });
  };

  // Function to fetch a specific combined test report
  const fetchReportDetails = (reportId) => {
    setLoadingReportDetails(true);
    
    // Debug log to see what reportId we're working with
    console.log('Fetching report details for ID:', reportId);
    
    // Use the reportId directly - it should be the filename from the API response
    const apiUrl = `http://localhost:3001/api/reports/combined/${encodeURIComponent(reportId)}`;
    console.log('API URL:', apiUrl);
    
    fetch(apiUrl)
      .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('API response data:', data);
        if (data.success) {
          setSelectedReport(data.report);
          // Reset tab to overview when new report is selected
          setSelectedTab('overview');
          setExpandedResults({});
        } else {
          console.error('API returned error:', data.message);
          alert(`Error: ${data.message}`);
        }
        setLoadingReportDetails(false);
      })
      .catch(error => {
        console.error('Error fetching report details:', error);
        setLoadingReportDetails(false);
        alert(`Failed to load report: ${error.message}`);
      });
  };

  // Debug: Log DOM Results for selected report
  useEffect(() => {
    if (selectedReport && selectedReport.domResult) {
      console.log('DOM Result:', selectedReport.domResult);
    } else if (selectedReport) {
      console.warn('No DOM Result found in selected report:', selectedReport);
    }
  }, [selectedReport]);

  // Helper functions
  const toggleExpanded = (resultId) => {
    setExpandedResults(prev => ({
      ...prev,
      [resultId]: !prev[resultId]
    }));
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    // Check if timestamp is in ISO format or a string
    let date;
    if (timestamp.includes('T')) {
      // Handle ISO format and custom formats like '2025-06-17T08-58-52-455Z-SreeRamJ'
      // Extract the date part before any user identifier
      let cleanTimestamp = timestamp;
      
      // Remove user identifier if present (anything after the last '-' that contains letters)
      const parts = timestamp.split('-');
      if (parts.length > 3) {
        // Check if the last part contains letters (user identifier)
        const lastPart = parts[parts.length - 1];
        if (/[a-zA-Z]/.test(lastPart)) {
          // Remove the user part and reconstruct timestamp
          cleanTimestamp = parts.slice(0, -1).join('-');
        }
      }
      
      // Replace colons with dashes if needed (for filenames)
      cleanTimestamp = cleanTimestamp.replace(/-(\d{2})-(\d{2})-(\d{3})Z?$/, ':$1:$2.$3Z');
      
      date = new Date(cleanTimestamp);
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

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pass':
      case 'passed':
        return '✅';
      case 'fail':
      case 'failed':
        return '❌';
      case 'warn':
      case 'warning':
        return '⚠️';
      default:
        return '📊';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pass':
      case 'passed':
        return '#4CAF50';
      case 'fail':
      case 'failed':
        return '#f44336';
      case 'warn':
      case 'warning':
        return '#ff9800';
      default:
        return '#2196F3';
    }
  };

  // Function to construct image URLs for visual comparisons
  const constructImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    
    // Handle BackstopJS relative paths
    if (imagePath.includes('bitmaps_')) {
      // Convert BackstopJS relative paths to absolute paths
      // Remove leading ..\ or ./ patterns and normalize path separators
      let cleanPath = imagePath.replace(/^\.\.[\\/]+/g, '').replace(/\\/g, '/');
      
      // Ensure the path starts with backstop_data if it's missing
      if (!cleanPath.includes('backstop_data/')) {
        cleanPath = `backstop_data/${cleanPath}`;
      }
      
      // Construct the full URL
      const imageUrl = `http://localhost:3001/reports/${cleanPath}`;
      
      // Log the constructed URL for debugging
      console.log('Constructed image URL:', imageUrl, 'from path:', imagePath);
      
      return imageUrl;
    }
    
    return `http://localhost:3001${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
  };

  // Function to render DOM differences with enhanced visualization
  const renderDomDifferences = (differences) => {
    return <DOMDiffViewer differences={differences} />;
  };

  // Enhanced function to render visual differences with better error handling
  const renderVisualDifferences = (result) => {
    if (!result || result.status === 'pass') {
      return (
        <div className="no-differences">
          <i className="fas fa-check-circle"></i>
          <p>No visual differences detected. Screenshots match perfectly.</p>
        </div>
      );
    }

    // Check if we have image paths
    const hasReference = result.pair?.reference;
    const hasTest = result.pair?.test;
    const hasDiff = result.pair?.diffImage && result.status === 'fail';

    return (
      <div className="visual-diff-container">
        <div className="diff-summary">
          <div className="diff-summary-title">Visual Differences Summary</div>
          <div className="diff-stats">
            <div className="diff-stat-item">
              <span className="diff-stat-count visual-diff">{result.pair?.diff?.misMatchPercentage || result.diff?.misMatchPercentage || 0}%</span>
              <span>Visual difference</span>
            </div>
            <div className="diff-stat-item">
              <span className="diff-stat-count threshold">{((result.pair?.misMatchThreshold || result.misMatchThreshold || 0.1) * 100).toFixed(1)}%</span>
              <span>Threshold</span>
            </div>
            <div className="diff-stat-item">
              <span className="diff-stat-count analysis-time">{result.pair?.diff?.analysisTime || result.diff?.analysisTime || 0}ms</span>
              <span>Analysis time</span>
            </div>
          </div>
        </div>

        {!hasReference && !hasTest && !hasDiff ? (
          <div className="no-images-available">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Visual comparison images are not available for this test</p>
            <p className="help-text">This may happen if the test failed to capture screenshots or the images were not generated properly.</p>
            <div className="debug-info">
              <details>
                <summary>Debug Information</summary>
                <pre>{JSON.stringify(result.pair, null, 2)}</pre>
              </details>
            </div>
          </div>
        ) : (
          <div className="image-comparison-grid">
            {/* Reference Image */}
            {hasReference && (
              <div className="image-container reference">
                <div className="image-header">
                  <h4><i className="fas fa-bookmark"></i> Reference Image</h4>
                  <span className="image-info">Expected appearance</span>
                </div>
                <div className="image-wrapper">
                  <img 
                    src={constructImageUrl(result.pair.reference)} 
                    alt="Reference" 
                    className="comparison-image"
                    onLoad={(e) => {
                      console.log('Reference image loaded successfully:', e.target.src);
                    }}
                    onError={(e) => {
                      console.error('Reference image failed to load:', constructImageUrl(result.pair.reference));
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="image-error" style={{display: 'none'}}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Reference image not found</p>
                    <small>Path: {result.pair.reference}</small>
                    <div className="error-help">
                      <p>This image may not exist because:</p>
                      <ul>
                        <li>The reference image was not generated during the test</li>
                        <li>The image path has changed since the test was run</li>
                        <li>The file was moved or deleted</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Test Image */}
            {hasTest && (
              <div className="image-container test">
                <div className="image-header">
                  <h4><i className="fas fa-flask"></i> Test Image</h4>
                  <span className="image-info">Current appearance</span>
                </div>
                <div className="image-wrapper">
                  <img 
                    src={constructImageUrl(result.pair.test)} 
                    alt="Test" 
                    className="comparison-image"
                    onLoad={(e) => {
                      console.log('Test image loaded successfully:', e.target.src);
                    }}
                    onError={(e) => {
                      console.error('Test image failed to load:', constructImageUrl(result.pair.test));
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="image-error" style={{display: 'none'}}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Test image not found</p>
                    <small>Path: {result.pair.test}</small>
                    <div className="error-help">
                      <p>This image may not exist because:</p>
                      <ul>
                        <li>The test image was not captured during the test</li>
                        <li>The test failed before the screenshot was taken</li>
                        <li>The file was moved or deleted</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Difference Image - only show for failed tests */}
            {hasDiff && (
              <div className="image-container diff">
                <div className="image-header">
                  <h4><i className="fas fa-search"></i> Difference</h4>
                  <span className="image-info">{result.pair?.diff?.misMatchPercentage || result.diff?.misMatchPercentage || 0}% different</span>
                </div>
                <div className="image-wrapper">
                  <img 
                    src={constructImageUrl(result.pair.diffImage)} 
                    alt="Difference" 
                    className="comparison-image diff-image"
                    onLoad={(e) => {
                      console.log('Diff image loaded successfully:', e.target.src);
                    }}
                    onError={(e) => {
                      console.error('Diff image failed to load:', constructImageUrl(result.pair.diffImage));
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="image-error" style={{display: 'none'}}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Difference image not found</p>
                    <small>Path: {result.pair.diffImage}</small>
                    <div className="error-help">
                      <p>The difference image is generated when visual differences are detected. It may not exist if the comparison failed.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image interaction controls */}
        <div className="image-controls">
          <button className="control-btn" onClick={() => openImageModal(result)}>
            <i className="fas fa-expand"></i> View Full Size
          </button>
          {result.pair?.diffImage && (
            <button className="control-btn" onClick={() => downloadImage(result.pair.diffImage)}>
              <i className="fas fa-download"></i> Download Diff
            </button>
          )}
          {result.pair?.reference && (
            <button className="control-btn" onClick={() => downloadImage(result.pair.reference)}>
              <i className="fas fa-download"></i> Download Reference
            </button>
          )}
          {result.pair?.test && (
            <button className="control-btn" onClick={() => downloadImage(result.pair.test)}>
              <i className="fas fa-download"></i> Download Test
            </button>
          )}
          
          {/* Debug section for troubleshooting */}
          <details className="debug-section">
            <summary>Debug Image Paths</summary>
            <div className="debug-paths">
              {result.pair?.reference && (
                <div className="debug-path">
                  <strong>Reference:</strong> 
                  <code>{result.pair.reference}</code>
                  <br />
                  <strong>URL:</strong> 
                  <code>{constructImageUrl(result.pair.reference)}</code>
                </div>
              )}
              {result.pair?.test && (
                <div className="debug-path">
                  <strong>Test:</strong> 
                  <code>{result.pair.test}</code>
                  <br />
                  <strong>URL:</strong> 
                  <code>{constructImageUrl(result.pair.test)}</code>
                </div>
              )}
              {result.pair?.diffImage && (
                <div className="debug-path">
                  <strong>Diff:</strong> 
                  <code>{result.pair.diffImage}</code>
                  <br />
                  <strong>URL:</strong> 
                  <code>{constructImageUrl(result.pair.diffImage)}</code>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    );
  };

  // Helper function to open image modal
  const openImageModal = (result) => {
    // Implementation for full-size image modal
    console.log('Opening image modal for:', result);
    // You can implement a modal here to show full-size images
    // For now, we'll just open the first available image in a new tab
    if (result.pair?.reference) {
      window.open(constructImageUrl(result.pair.reference), '_blank');
    } else if (result.pair?.test) {
      window.open(constructImageUrl(result.pair.test), '_blank');
    }
  };

  // Helper function to download image
  const downloadImage = (imagePath) => {
    if (!imagePath) return;
    const link = document.createElement('a');
    link.href = constructImageUrl(imagePath);
    link.download = imagePath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to render element attributes
  const renderAttributes = (attributes) => {
    if (!attributes || Object.keys(attributes).length === 0) {
      return '';
    }
    
    return Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
  };

  // Function to render detailed DOM diff view with line-by-line comparison
  const renderDomDiffView = (result) => {
    if (result.status === 'ERROR') {
      return (
        <div className="dom-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p style={{ color: 'red' }}>DOM comparison failed: {result.error || 'Unknown error occurred.'}</p>
          {result.testingUrl && result.referenceUrl && (
            <div className="page-info">
              <small>Compared: {new URL(result.testingUrl).pathname} ↔ {new URL(result.referenceUrl).pathname}</small>
            </div>
          )}
        </div>
      );
    }
    if (!result.differences || result.differences.length === 0) {
      return (
        <div className="no-differences">
          <i className="fas fa-check-circle"></i>
          <p>No DOM differences detected. The elements match between reference and testing sites.</p>
          {result.testingUrl && result.referenceUrl && (
            <div className="page-info">
              <small>Compared: {new URL(result.testingUrl).pathname} ↔ {new URL(result.referenceUrl).pathname}</small>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="dom-diff-detailed-container">
        {/* Sitemap Test Context Header */}
        {result.testingUrl && result.referenceUrl && (
          <div className="sitemap-test-header">
            <div className="test-context">
              <h6><i className="fas fa-sitemap"></i> Sitemap Page Comparison</h6>
              <div className="url-comparison">
                <div className="url-item testing">
                  <span className="url-label">Testing Page:</span>
                  <span className="url-path">{new URL(result.testingUrl).pathname}</span>
                </div>
                <div className="url-item reference">
                  <span className="url-label">Reference Page:</span>
                  <span className="url-path">{new URL(result.referenceUrl).pathname}</span>
                </div>
              </div>
            </div>
            <div className="test-status">
              <span className={`status-badge ${result.status?.toLowerCase()}`}>
                <i className={`fas ${result.status === 'PASS' ? 'fa-check' : 'fa-times'}`}></i>
                {result.status}
              </span>
              {result.differencesCount > 0 && (
                <span className="differences-count">
                  {result.differencesCount} difference{result.differencesCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Enhanced DOM differences visualization for sitemap context */}
        <DOMDiffViewer 
          differences={result.differences} 
          context="sitemap"
          testingUrl={result.testingUrl}
          referenceUrl={result.referenceUrl}
        />
        
        {/* Line-by-line diff with enhanced styling for sitemap testing */}
        {result.diffLines && result.diffLines.length > 0 && (
          <div className="sitemap-diff-section">
            <div className="diff-section-header">
              <h6><i className="fas fa-code"></i> HTML Source Comparison</h6>
              <p>Line-by-line comparison of HTML source between testing and reference pages</p>
            </div>
            <LineDiffViewer diffLines={result.diffLines} />
          </div>
        )}
      </div>
    );
  };

  // Filter functions for test results
  const filterTestResults = (results, type = 'dom') => {
    if (!results) return [];

    return results.filter(result => {
      // Check status match based on checkboxes
      let statusMatch = false;
      
      if (type === 'visual') {
        // For visual tests, status is 'pass' or 'fail' (lowercase)
        const isPassed = result.status?.toLowerCase() === 'pass';
        const isFailed = result.status?.toLowerCase() === 'fail';
        statusMatch = (showPassedTests && isPassed) || (showFailedTests && isFailed);
      } else {
        // For DOM tests, status is 'PASS' or 'FAIL' (uppercase)
        const isPassed = result.status?.toUpperCase() === 'PASS';
        const isFailed = result.status?.toUpperCase() === 'FAIL';
        statusMatch = (showPassedTests && isPassed) || (showFailedTests && isFailed);
      }

      // Check search match
      const searchMatch = !searchTerm || 
        (result.testingUrl && result.testingUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (result.referenceUrl && result.referenceUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (result.pair?.label && result.pair.label.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Check viewport match (mainly for visual tests)
      const viewportMatch = filterViewport === 'all' || 
        (result.pair?.viewportLabel && result.pair.viewportLabel.toLowerCase().includes(filterViewport.toLowerCase()));
      
      return statusMatch && searchMatch && viewportMatch;
    });
  };

  // Sort functions for test results
  const sortTestResults = (results, sortBy, type = 'dom') => {
    if (!results) return [];

    const sortedResults = [...results];
    
    switch (sortBy) {
      case 'status':
        return sortedResults.sort((a, b) => {
          const statusA = type === 'visual' ? (a.status || '').toLowerCase() : (a.status || '').toUpperCase();
          const statusB = type === 'visual' ? (b.status || '').toLowerCase() : (b.status || '').toUpperCase();
          
          // Sort failed tests first, then passed tests
          if (statusA === statusB) return 0;
          if (type === 'visual') {
            return statusA === 'fail' ? -1 : 1;
          } else {
            return statusA === 'FAIL' ? -1 : 1;
          }
        });
        
      case 'url':
        return sortedResults.sort((a, b) => {
          const urlA = a.testingUrl || a.pair?.url || '';
          const urlB = b.testingUrl || b.pair?.url || '';
          return urlA.localeCompare(urlB);
        });
        
      case 'differences':
        if (type === 'dom') {
          return sortedResults.sort((a, b) => {
            const diffA = a.differencesCount || 0;
            const diffB = b.differencesCount || 0;
            return diffB - diffA; // Sort by most differences first
          });
        }
        break;
        
      case 'viewport':
        if (type === 'visual') {
          return sortedResults.sort((a, b) => {
            const viewportA = a.pair?.viewportLabel || '';
            const viewportB = b.pair?.viewportLabel || '';
            return viewportA.localeCompare(viewportB);
          });
        }
        break;
        
      case 'mismatch':
        if (type === 'visual') {
          return sortedResults.sort((a, b) => {
            const mismatchA = parseFloat(a.pair?.diff?.misMatchPercentage || a.diff?.misMatchPercentage || 0);
            const mismatchB = parseFloat(b.pair?.diff?.misMatchPercentage || b.diff?.misMatchPercentage || 0);
            return mismatchB - mismatchA; // Sort by highest mismatch first
          });
        }
        break;
        
      default:
        return sortedResults;
    }
    
    return sortedResults;
  };

  // Combined filter and sort function
  const getFilteredAndSortedResults = (results, type = 'dom') => {
    const filtered = filterTestResults(results, type);
    const sortBy = type === 'dom' ? domSortBy : visualSortBy;
    return sortTestResults(filtered, sortBy, type);
  };
  
  // Handle HTML report export via API call
  const handleExportReport = async () => {
    if (!selectedReport || !selectedReport.id) {
      alert('No report selected to export');
      return;
    }
    try {
      // Call backend to generate the HTML report
      const response = await fetch('http://localhost:3001/api/export-combined-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: selectedReport.id }) // Optionally send reportId if backend supports
      });
      const data = await response.json();
      if (data.success && data.url) {
        // Open the generated report in a new tab
        window.open(`http://localhost:3001${data.url}`, '_blank');
      } else {
        alert('Failed to export combined report: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      alert('Error exporting combined report: ' + error.message);
    }
  };

  // New export function for different formats
  const exportReport = (format) => {
    if (!selectedReport || !selectedReport.id) {
      alert('No report selected for export');
      return;
    }
    
    const reportIdParts = selectedReport.id.replace('combined-test-report-', '').replace('.json', '');
    let fileName = `combined-test-report-${reportIdParts}`;
    let exportUrl = '';
    
    switch (format) {
      case 'html':
        fileName += '.html';
        exportUrl = `http://localhost:3001/reports/combined/${fileName}`;
        break;
      case 'pdf':
        fileName += '.pdf';
        exportUrl = `http://localhost:3001/reports/combined/${fileName}`;
        break;
      case 'csv':
        fileName += '.csv';
        exportUrl = `http://localhost:3001/reports/combined/${fileName}`;
        break;
      case 'json':
        fileName += '.json';
        exportUrl = `http://localhost:3001/reports/combined/${fileName}`;
        break;
      default:
        alert('Unsupported export format');
        return;
    }
    
    console.log(`Exporting report as ${format.toUpperCase()}: ${fileName}`);
    
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export functions for trends and comparison reports
  const exportTrendsReport = (trendsData) => {
    if (!trendsData) {
      alert('No trends data available to export');
      return;
    }

    const reportData = {
      type: 'trends-analysis',
      timestamp: new Date().toISOString(),
      qualityScore: trendsData.qualityScore,
      timeline: trendsData.timeline,
      statistics: trendsData.statistics,
      stability: trendsData.stability,
      regressions: trendsData.regressions,
      recommendations: generateTrendRecommendations(trendsData)
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trends-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportComparisonReport = (comparisonData) => {
    if (!comparisonData) {
      alert('No comparison data available to export');
      return;
    }

    const reportData = {
      type: 'comparison-analysis',
      timestamp: new Date().toISOString(),
      summary: comparisonData.summary,
      domComparison: comparisonData.domComparison,
      visualComparison: comparisonData.visualComparison,
      performanceComparison: comparisonData.performanceComparison,
      reports: comparisonData.reports?.map(report => ({
        id: report.id,
        timestamp: report.timestamp,
        domSuccessRate: report.domResult?.summary?.successRate || 0,
        visualSuccessRate: report.visualResult?.summary?.successRate || 0,
        totalTests: (report.domResult?.summary?.totalTests || 0) + (report.visualResult?.summary?.totalTests || 0),
        executionTime: report.executionTimeMs || 0,
        user: report.user
      })) || []
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparison-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Missing function: generateComparisonData
  const generateComparisonData = (reports) => {
    if (!reports || reports.length < 2) return null;

    const sortedReports = [...reports].sort((a, b) => 
      new Date(a.timestamp || a.id) - new Date(b.timestamp || b.id)
    );

    // Extract data for comparison
    const domComparison = {
      successRates: sortedReports.map(r => r.domResult?.summary?.successRate || 0),
      totalTests: sortedReports.map(r => r.domResult?.summary?.totalTests || 0),
      failedTests: sortedReports.map(r => r.domResult?.summary?.failedTests || 0)
    };

    const visualComparison = {
      successRates: sortedReports.map(r => r.visualResult?.summary?.successRate || 0),
      totalTests: sortedReports.map(r => r.visualResult?.summary?.totalTests || 0),
      failedTests: sortedReports.map(r => r.visualResult?.summary?.failedTests || 0)
    };

    const performanceComparison = {
      executionTimes: sortedReports.map(r => r.executionTimeMs || 0)
    };

    // Calculate trends
    const calculateTrend = (values) => {
      if (values.length < 2) return 'neutral';
      const first = values[0];
      const last = values[values.length - 1];
      const change = ((last - first) / first) * 100;
      
      if (Math.abs(change) < 5) return 'neutral';
      return change > 0 ? 'positive' : 'negative';
    };

    // Calculate summary data
    const summary = {
      totalReports: reports.length,
      timeRange: {
        earliest: Math.min(...sortedReports.map(r => new Date(r.timestamp || r.id).getTime())),
        latest: Math.max(...sortedReports.map(r => new Date(r.timestamp || r.id).getTime()))
      },
      averageExecutionTime: performanceComparison.executionTimes.reduce((sum, time) => sum + time, 0) / performanceComparison.executionTimes.length,
      overallTrends: {
        dom: calculateTrend(domComparison.successRates),
        visual: calculateTrend(visualComparison.successRates),
        performance: calculateTrend(performanceComparison.executionTimes)
      }
    };

    return {
      summary,
      domComparison,
      visualComparison,
      performanceComparison,
      reports: sortedReports
    };
  };

  // Missing function: exitCompareMode
  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedReportsForComparison([]);
    if (selectedReport?.isComparison) {
      setSelectedReport(null);
      setSelectedTab('overview');
    }
  };

  // Compare Mode Functions
  const toggleReportSelection = (reportId) => {
    setSelectedReportsForComparison(prev => {
      if (prev.includes(reportId)) {
        // Remove from selection
        return prev.filter(id => id !== reportId);
      } else {
        // Add to selection (limit to 3 reports for comparison)
        if (prev.length >= 3) {
          alert('You can compare up to 3 reports at a time');
          return prev;
        }
        return [...prev, reportId];
      }
    });
  };

  const handleCompareReports = () => {
    if (selectedReportsForComparison.length < 2) {
      alert('Please select at least 2 reports to compare');
      return;
    }

    // Reset trends mode if active
    setShowTrends(false);

    // Fetch all selected reports for comparison
    setLoadingReportDetails(true);
    const reportPromises = selectedReportsForComparison.map(reportId =>
      fetch(`http://localhost:3001/api/reports/combined/${reportId}`)
        .then(response => response.json())
        .then(data => data.success ? data.report : null)
    );

    Promise.all(reportPromises)
      .then(reports => {
        const validReports = reports.filter(report => report !== null);
        if (validReports.length >= 2) {
          setSelectedReport({
            isComparison: true,
            reports: validReports,
            comparisonData: generateComparisonData(validReports)
          });
          setSelectedTab('comparison');
        } else {
          alert('Failed to load some reports for comparison');
        }
        setLoadingReportDetails(false);
      })
      .catch(error => {
        console.error('Error fetching reports for comparison:', error);
        setLoadingReportDetails(false);
        alert('Failed to load reports for comparison');
      });
  };

  // Fix the compare mode toggle
  const handleCompareMode = () => {
    if (compareMode) {
      // Exit compare mode
      exitCompareMode();
    } else {
      // Enter compare mode
      setCompareMode(true);
      setShowTrends(false); // Exit trends if active
      if (selectedReport?.isComparison) {
        setSelectedReport(null);
        setSelectedTab('overview');
      }
    }
  };

  // Fix the trends toggle
  const handleTrendsMode = () => {
    if (showTrends) {
      // Exit trends mode
      setShowTrends(false);
    } else {
      // Enter trends mode
      setShowTrends(true);
      setCompareMode(false); // Exit compare mode if active
      setSelectedReportsForComparison([]); // Clear compare selections
      if (selectedReport?.isComparison) {
        setSelectedReport(null);
      }
      setSelectedTab('overview');
    }
  };

  // Enhanced Trends functionality with better data visualization
  const generateTrendsData = () => {
    if (combinedReports.length < 2) return null;

    // Sort reports by timestamp for chronological analysis
    const sortedReports = [...combinedReports].sort((a, b) => 
      new Date(a.timestamp || a.id) - new Date(b.timestamp || b.id)
    );

    const trendsData = {
      timeline: sortedReports.map((report, index) => ({
        index,
        timestamp: report.timestamp || report.id,
        date: formatTimestamp(report.timestamp || report.id),
        domSuccessRate: report.domResult?.summary?.successRate || 0,
        visualSuccessRate: report.visualResult?.summary?.successRate || 0,
        domTotalTests: report.domResult?.summary?.totalTests || 0,
        visualTotalTests: report.visualResult?.summary?.totalTests || 0,
        domFailedTests: report.domResult?.summary?.failedTests || 0,
        visualFailedTests: report.visualResult?.summary?.failedTests || 0,
        executionTime: report.executionTimeMs || 0,
        user: report.user?.fullName || 'Unknown',
        reportId: report.id
      })),
      
      // Calculate enhanced trends with moving averages
      domTrend: calculateEnhancedTrend(sortedReports.map(r => r.domResult?.summary?.successRate || 0)),
      visualTrend: calculateEnhancedTrend(sortedReports.map(r => r.visualResult?.summary?.successRate || 0)),
      performanceTrend: calculateEnhancedTrend(sortedReports.map(r => r.executionTimeMs || 0), true),

      // Enhanced statistics with quartiles and standard deviation
      statistics: calculateDetailedStatistics(sortedReports),

      // Quality score calculation
      qualityScore: calculateQualityScore(sortedReports),

      // Regression detection
      regressions: detectRegressions(sortedReports),

      // Stability metrics
      stability: calculateStabilityMetrics(sortedReports)
    };

    return trendsData;
  };

  // Enhanced trend calculation with moving averages and confidence intervals
  const calculateEnhancedTrend = (values, lowerIsBetter = false) => {
    if (values.length < 3) return { 
      direction: 'neutral', 
      change: 0, 
      confidence: 'low',
      movingAverage: values[values.length - 1] || 0,
      volatility: 0
    };

    // Calculate moving averages for smoother trend detection
    const windowSize = Math.min(3, Math.floor(values.length / 3));
    const recent = values.slice(-windowSize);
    const historical = values.slice(0, -windowSize);

    if (historical.length === 0) return { 
      direction: 'neutral', 
      change: 0, 
      confidence: 'low',
      movingAverage: recent[recent.length - 1] || 0,
      volatility: 0
    };

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const historicalAvg = historical.reduce((sum, val) => sum + val, 0) / historical.length;
    
    const change = ((recentAvg - historicalAvg) / historicalAvg) * 100;
    
    // Calculate volatility
    const allValues = [...historical, ...recent];
    const mean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
    const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length;
    const volatility = Math.sqrt(variance);
    
    // Determine confidence based on sample size and volatility
    let confidence = 'low';
    if (values.length >= 5 && volatility < mean * 0.1) confidence = 'high';
    else if (values.length >= 3 && volatility < mean * 0.2) confidence = 'medium';
    
    let direction = 'neutral';
    const significanceThreshold = confidence === 'high' ? 3 : confidence === 'medium' ? 5 : 10;
    
    if (Math.abs(change) > significanceThreshold) {
      if (lowerIsBetter) {
        direction = change < 0 ? 'positive' : 'negative';
      } else {
        direction = change > 0 ? 'positive' : 'negative';
      }
    }

    return { 
      direction, 
      change: Math.abs(change), 
      confidence,
      movingAverage: recentAvg,
      volatility: (volatility / mean) * 100 || 0
    };
  };

  // Calculate detailed statistics for better insights
  const calculateDetailedStatistics = (sortedReports) => {
    const domSuccessRates = sortedReports.map(r => r.domResult?.summary?.successRate || 0);
    const visualSuccessRates = sortedReports.map(r => r.visualResult?.summary?.successRate || 0);
    const executionTimes = sortedReports.map(r => r.executionTimeMs || 0);

    const calculateStats = (values) => {
      if (values.length === 0) return { mean: 0, median: 0, q1: 0, q3: 0, stdDev: 0, min: 0, max: 0 };
      
      const sorted = [...values].sort((a, b) => a - b);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      return {
        mean,
        median,
        q1,
        q3,
        stdDev,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    };

    return {
      dom: calculateStats(domSuccessRates),
      visual: calculateStats(visualSuccessRates),
      performance: calculateStats(executionTimes)
    };
  };

  // Calculate overall quality score
  const calculateQualityScore = (sortedReports) => {
    if (sortedReports.length === 0) return 0;

    const weights = {
      domSuccess: 0.4,
      visualSuccess: 0.4,
      consistency: 0.1,
      performance: 0.1
    };

    const scores = sortedReports.map(report => {
      const domSuccess = (report.domResult?.summary?.successRate || 0) / 100;
      const visualSuccess = (report.visualResult?.summary?.successRate || 0) / 100;
      
      // Performance score (lower execution time is better)
      const maxTime = 300000; // 5 minutes max reasonable time
      const performanceScore = Math.max(0, 1 - ((report.executionTimeMs || 0) / maxTime));
      
      return (domSuccess * weights.domSuccess) + 
             (visualSuccess * weights.visualSuccess) + 
             (performanceScore * weights.performance);
    });

    // Calculate consistency bonus
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const consistencyScore = Math.max(0, 1 - (Math.sqrt(variance) * 2));

    return Math.round(((avgScore + (consistencyScore * weights.consistency)) * 100));
  };

  // Detect regressions in test results
  const detectRegressions = (sortedReports) => {
    const regressions = [];
    
    for (let i = 1; i < sortedReports.length; i++) {
      const prev = sortedReports[i - 1];
      const curr = sortedReports[i];
      
      // DOM regression detection
      const domPrevSuccess = prev.domResult?.summary?.successRate || 0;
      const domCurrSuccess = curr.domResult?.summary?.successRate || 0;
      const domDrop = domPrevSuccess - domCurrSuccess;
      
      if (domDrop > 15) { // More than 15% drop
        regressions.push({
          type: 'dom',
          severity: domDrop > 30 ? 'critical' : domDrop > 25 ? 'high' : 'medium',
          reportIndex: i,
          drop: domDrop,
          description: `DOM success rate dropped by ${domDrop.toFixed(1)}%`
        });
      }
      
      // Visual regression detection
      const visualPrevSuccess = prev.visualResult?.summary?.successRate || 0;
      const visualCurrSuccess = curr.visualResult?.summary?.successRate || 0;
      const visualDrop = visualPrevSuccess - visualCurrSuccess;
      
      if (visualDrop > 15) { // More than 15% drop
        regressions.push({
          type: 'visual',
          severity: visualDrop > 30 ? 'critical' : visualDrop > 25 ? 'high' : 'medium',
          reportIndex: i,
          drop: visualDrop,
          description: `Visual success rate dropped by ${visualDrop.toFixed(1)}%`
        });
      }
    }
    
    return regressions;
  };

  // Calculate stability metrics
  const calculateStabilityMetrics = (sortedReports) => {
    const domSuccessRates = sortedReports.map(r => r.domResult?.summary?.successRate || 0);
    const visualSuccessRates = sortedReports.map(r => r.visualResult?.summary?.successRate || 0);
    
    const calculateStability = (values) => {
      if (values.length < 2) return 100;
      
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const coefficientOfVariation = Math.sqrt(variance) / mean;
      
      // Convert to stability score (lower variance = higher stability)
      return Math.max(0, 100 - (coefficientOfVariation * 100));
    };

    return {
      dom: calculateStability(domSuccessRates),
      visual: calculateStability(visualSuccessRates),
      overall: calculateStability([...domSuccessRates, ...visualSuccessRates])
    };
  };

  // Enhanced recommendation generation for trends
  const generateTrendRecommendations = (trendsData) => {
    const recommendations = [];

    // Quality Score Analysis
    if (trendsData.qualityScore < 70) {
      recommendations.push({
        type: 'critical',
        icon: 'fas fa-exclamation-triangle',
        title: 'Poor Overall Quality Score',
        description: `Quality score of ${trendsData.qualityScore}/100 indicates significant issues. Immediate comprehensive review required.`,
        priority: 'critical',
        actionItems: [
          'Review test infrastructure stability',
          'Analyze failing test patterns',
          'Implement quality gates'
        ]
      });
    } else if (trendsData.qualityScore < 85) {
      recommendations.push({
        type: 'warning',
        icon: 'fas fa-chart-line',
        title: 'Quality Score Below Target',
        description: `Quality score of ${trendsData.qualityScore}/100 has room for improvement.`,
        priority: 'medium',
        actionItems: [
          'Identify improvement opportunities',
          'Optimize test reliability'
        ]
      });
    } else {
      recommendations.push({
        type: 'success',
        icon: 'fas fa-trophy',
        title: 'Excellent Quality Score',
        description: `Outstanding quality score of ${trendsData.qualityScore}/100. Maintain current standards!`,
        priority: 'info'
      });
    }

    // Regression Analysis
    if (trendsData.regressions.length > 0) {
      const criticalRegressions = trendsData.regressions.filter(r => r.severity === 'critical');
      const highRegressions = trendsData.regressions.filter(r => r.severity === 'high');
      
      if (criticalRegressions.length > 0) {
        recommendations.push({
          type: 'danger',
          icon: 'fas fa-exclamation-circle',
          title: 'Critical Regressions Detected',
          description: `${criticalRegressions.length} critical regression(s) found. Immediate investigation required.`,
          priority: 'critical',
          details: criticalRegressions.map(r => r.description)
        });
      }
      
      if (highRegressions.length > 0) {
        recommendations.push({
          type: 'warning',
          icon: 'fas fa-arrow-down',
          title: 'High-Impact Regressions',
          description: `${highRegressions.length} high-impact regression(s) detected.`,
          priority: 'high',
          details: highRegressions.map(r => r.description)
        });
      }
    }

    // Stability Analysis
    if (trendsData.stability.overall < 80) {
      recommendations.push({
        type: 'warning',
        icon: 'fas fa-wave-square',
        title: 'Low Test Stability',
        description: `Test stability score of ${trendsData.stability.overall.toFixed(1)}% indicates high variability in results.`,
        priority: 'medium',
        actionItems: [
          'Investigate test environment consistency',
          'Review test data management',
          'Check for timing-dependent tests'
        ]
      });
    }

    // Trend Direction Analysis
    ['domTrend', 'visualTrend', 'performanceTrend'].forEach(trendType => {
      const trend = trendsData[trendType];
      const testType = trendType.replace('Trend', '').toUpperCase();
      
      if (trend.direction === 'negative' && trend.confidence === 'high') {
        recommendations.push({
          type: 'warning',
          icon: 'fas fa-trending-down',
          title: `${testType} Quality Declining`,
          description: `${testType} metrics show a confident downward trend of ${trend.change.toFixed(1)}%. Confidence: ${trend.confidence}`,
          priority: 'high',
          volatility: trend.volatility.toFixed(1)
        });
      } else if (trend.direction === 'positive' && trend.confidence === 'high') {
        recommendations.push({
          type: 'success',
          icon: 'fas fa-trending-up',
          title: `${testType} Quality Improving`,
          description: `${testType} metrics show consistent improvement of ${trend.change.toFixed(1)}%. Great work!`,
          priority: 'info'
        });
      }
    });

    // Performance Specific Recommendations
    const avgExecutionTime = trendsData.statistics.performance.mean;
    if (avgExecutionTime > 180000) { // More than 3 minutes
      recommendations.push({
        type: 'warning',
        icon: 'fas fa-clock',
        title: 'Long Execution Times',
        description: `Average execution time of ${(avgExecutionTime / 1000 / 60).toFixed(1)} minutes may impact productivity.`,
        priority: 'medium',
        actionItems: [
          'Consider parallel test execution',
          'Optimize test selectors',
          'Review test infrastructure capacity'
        ]
      });
    }

    // Sort by priority and return top recommendations
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return recommendations
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 8); // Limit to 8 most important recommendations
  };

  // Enhanced trends view rendering with better visualizations
  const renderTrendsView = () => {
    const trendsData = generateTrendsData();
    
    if (!trendsData) {
      return (
        <div className="trends-loading">
          <i className="fas fa-chart-line"></i>
          <p>Not enough data for trends analysis</p>
          <p>At least 2 reports are required to show trends.</p>
        </div>
      );
    }

    const recommendations = generateTrendRecommendations(trendsData);

    return (
      <div className="trends-view trends-success">
        <div className="trends-header">
          <h4>
            <i className="fas fa-chart-line"></i>
            Performance Trends Analysis
          </h4>
          <div className="trends-controls">
            <button 
              className="control-btn"
              onClick={() => exportTrendsReport(trendsData)}
              title="Export trends analysis"
            >
              <i className="fas fa-download"></i> Export
            </button>
            <button 
              className="control-btn" 
              onClick={() => setShowTrends(false)}
              title="Close trends view"
            >
              <i className="fas fa-times"></i> Close
            </button>
          </div>
        </div>

        <div className="trends-content">
          {/* Quality Score Dashboard */}
          <div className="quality-dashboard">
            <div className="quality-score-card">
              <div className="score-circle">
                <div className="score-value">{trendsData.qualityScore}</div>
                <div className="score-label">Quality Score</div>
              </div>
              <div className="score-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">DOM Stability</span>
                  <span className="breakdown-value">{trendsData.stability.dom.toFixed(1)}%</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Visual Stability</span>
                  <span className="breakdown-value">{trendsData.stability.visual.toFixed(1)}%</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Performance</span>
                  <span className="breakdown-value">{((300000 - trendsData.statistics.performance.mean) / 3000).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Trends Chart */}
          <div className="trends-chart">
            <h5>
              📈 Success Rates Over Time
              <span className="chart-subtitle">({trendsData.timeline.length} reports analyzed)</span>
            </h5>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color dom"></span>
                <span className="legend-label">DOM Success Rate</span>
                <span className="legend-stats">
                  Avg: {trendsData.statistics.dom.mean.toFixed(1)}% | 
                  Trend: {trendsData.domTrend.direction} ({trendsData.domTrend.change.toFixed(1)}%)
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-color visual"></span>
                <span className="legend-label">Visual Success Rate</span>
                <span className="legend-stats">
                  Avg: {trendsData.statistics.visual.mean.toFixed(1)}% | 
                  Trend: {trendsData.visualTrend.direction} ({trendsData.visualTrend.change.toFixed(1)}%)
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-color performance"></span>
                <span className="legend-label">Execution Time</span>
                <span className="legend-stats">
                  Avg: {(trendsData.statistics.performance.mean / 1000).toFixed(1)}s | 
                  Trend: {trendsData.performanceTrend.direction} ({trendsData.performanceTrend.change.toFixed(1)}%)
                </span>
              </div>
            </div>
            
            <div className="chart-container">
              {/* Enhanced SVG chart with better data visualization */}
              <svg className="trends-svg" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(y => (
                  <line 
                    key={y} 
                    x1="50" 
                    y1={50 + (300 - y * 3)} 
                    x2="750" 
                    y2={50 + (300 - y * 3)} 
                    stroke="#f1f5f9" 
                    strokeWidth="1"
                  />
                ))}
                
                {/* Y-axis labels */}
                {[0, 25, 50, 75, 100].map(y => (
                  <text 
                    key={y} 
                    x="40" 
                    y={50 + (300 - y * 3) + 5} 
                    fill="#64748b" 
                    fontSize="12" 
                    textAnchor="end"
                  >
                    {y}%
                  </text>
                ))}
                
                {/* DOM Success Rate Line */}
                <path 
                  className="trends-line dom"
                  d={`M 50 ${350 - trendsData.timeline[0].domSuccessRate * 3} ` +
                     trendsData.timeline.map((data, index) => 
                       `L ${50 + index * (700 / (trendsData.timeline.length - 1))} ${350 - data.domSuccessRate * 3}`
                     ).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                />
                
                {/* Visual Success Rate Line */}
                <path 
                  className="trends-line visual"
                  d={`M 50 ${350 - trendsData.timeline[0].visualSuccessRate * 3} ` +
                     trendsData.timeline.map((data, index) => 
                       `L ${50 + index * (700 / (trendsData.timeline.length - 1))} ${350 - data.visualSuccessRate * 3}`
                     ).join(' ')}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                />
                
                {/* Data points */}
                {trendsData.timeline.map((data, index) => (
                  <g key={index}>
                    <circle 
                      cx={50 + index * (700 / (trendsData.timeline.length - 1))} 
                      cy={350 - data.domSuccessRate * 3}
                      r="4"
                      fill="#3b82f6"
                      className="data-point"
                    />
                    <circle 
                      cx={50 + index * (700 / (trendsData.timeline.length - 1))} 
                      cy={350 - data.visualSuccessRate * 3}
                      r="4"
                      fill="#8b5cf6"
                      className="data-point"
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>
          
          {/* Enhanced Summary Cards with Detailed Statistics */}
          <div className="trends-summary">
            <div className="summary-card">
              <div className="card-icon dom">
                <i className="fas fa-code"></i>
              </div>
              <div className="card-content">
                <h6 className="category-title">DOM Quality Trends</h6>
                <p className="category-description">{trendsData.statistics.dom.mean.toFixed(1)}% average success rate</p>
                <div className="trend-indicator">
                  <i className={`fas fa-arrow-${trendsData.domTrend.direction === 'positive' ? 'up' : trendsData.domTrend.direction === 'negative' ? 'down' : 'right'} fa-arrow-${trendsData.domTrend.direction}`}></i>
                  <span className={`trend-value ${trendsData.domTrend.direction}`}>
                    {trendsData.domTrend.change.toFixed(1)}%
                  </span>
                  <span className="confidence-badge">{trendsData.domTrend.confidence}</span>
                </div>
                <div className="additional-stats">
                  <small>Stability: {trendsData.stability.dom.toFixed(1)}%</small>
                  <small>Volatility: {trendsData.domTrend.volatility.toFixed(1)}%</small>
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon visual">
                <i className="fas fa-eye"></i>
              </div>
              <div className="card-content">
                <h6 className="category-title">Visual Quality Trends</h6>
                <p className="category-description">{trendsData.statistics.visual.mean.toFixed(1)}% average success rate</p>
                <div className="trend-indicator">
                  <i className={`fas fa-arrow-${trendsData.visualTrend.direction === 'positive' ? 'up' : trendsData.visualTrend.direction === 'negative' ? 'down' : 'right'} fa-arrow-${trendsData.visualTrend.direction}`}></i>
                  <span className={`trend-value ${trendsData.visualTrend.direction}`}>
                    {trendsData.visualTrend.change.toFixed(1)}%
                  </span>
                  <span className="confidence-badge">{trendsData.visualTrend.confidence}</span>
                </div>
                <div className="additional-stats">
                  <small>Stability: {trendsData.stability.visual.toFixed(1)}%</small>
                  <small>Volatility: {trendsData.visualTrend.volatility.toFixed(1)}%</small>
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-icon performance">
                <i className="fas fa-rocket"></i>
              </div>
              <div className="card-content">
                <h6 className="category-title">Performance Trends</h6>
                <p className="category-description">{(trendsData.statistics.performance.mean / 1000).toFixed(1)}s average execution</p>
                <div className="trend-indicator">
                  <i className={`fas fa-arrow-${trendsData.performanceTrend.direction === 'positive' ? 'up' : trendsData.performanceTrend.direction === 'negative' ? 'down' : 'right'} fa-arrow-${trendsData.performanceTrend.direction}`}></i>
                  <span className={`trend-value ${trendsData.performanceTrend.direction}`}>
                    {trendsData.performanceTrend.change.toFixed(1)}%
                  </span>
                  <span className="confidence-badge">{trendsData.performanceTrend.confidence}</span>
                </div>
                <div className="additional-stats">
                  <small>Range: {(trendsData.statistics.performance.min / 1000).toFixed(1)}s - {(trendsData.statistics.performance.max / 1000).toFixed(1)}s</small>
                  <small>Volatility: {trendsData.performanceTrend.volatility.toFixed(1)}%</small>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Recommendations with Action Items */}
          {recommendations.length > 0 && (
            <div className="comparison-recommendations">
              <h5>
                <i className="fas fa-lightbulb"></i>
                Intelligent Recommendations
                <span className="recommendations-count">({recommendations.length})</span>
              </h5>
              <div className="recommendations-grid">
                {recommendations.map((rec, index) => (
                  <div key={index} className={`recommendation-card priority-${rec.priority}`}>
                    <div className="recommendation-icon">
                      <i className={rec.icon}></i>
                    </div>
                    <div className="recommendation-content">
                      <h6>{rec.title}</h6>
                      <p>{rec.description}</p>
                      {rec.actionItems && rec.actionItems.length > 0 && (
                        <div className="action-items">
                          <strong>Action Items:</strong>
                          <ul>
                            {rec.actionItems.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {rec.details && rec.details.length > 0 && (
                        <div className="recommendation-details">
                          {rec.details.map((detail, i) => (
                            <div key={i} className="detail-item">{detail}</div>
                          ))}
                        </div>
                      )}
                      {rec.volatility && (
                        <div className="volatility-info">
                          Volatility: {rec.volatility}%
                        </div>
                      )}
                    </div>
                    <div className="recommendation-priority">
                      <span className={`priority-badge ${rec.priority}`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regression Alerts */}
          {trendsData.regressions.length > 0 && (
            <div className="regression-alerts">
              <h5>
                <i className="fas fa-exclamation-triangle"></i>
                Regression Alerts
              </h5>
              <div className="regression-list">
                {trendsData.regressions.map((regression, index) => (
                  <div key={index} className={`regression-alert severity-${regression.severity}`}>
                    <div className="regression-icon">
                      <i className={`fas ${regression.severity === 'critical' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}`}></i>
                    </div>
                    <div className="regression-content">
                      <h6>{regression.type.toUpperCase()} Regression</h6>
                      <p>{regression.description}</p>
                      <div className="regression-details">
                        <span>Report #{regression.reportIndex + 1}</span>
                        <span>Severity: {regression.severity}</span>
                        <span>Drop: {regression.drop.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderComparisonView = () => {
    if (!selectedReport?.isComparison || !selectedReport.reports) {
      return (
        <div className="comparison-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Comparison data is not available.</p>
        </div>
      );
    }

    const { reports, comparisonData } = selectedReport;

    if (!reports || reports.length === 0) {
      return (
        <div className="comparison-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>No reports to compare.</p>
        </div>
      );
    }

    const chartWidth = 600;
    const chartHeight = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;

    const xScale = (index) => margin.left + (reports.length > 1 ? index * (innerWidth / (reports.length - 1)) : innerWidth / 2);
    const yScale = (value) => chartHeight - margin.bottom - ((value || 0) * innerHeight / 100);

    const domLinePath = reports.length > 1 ?
      'M ' + reports.map((report, index) =>
        `${xScale(index)} ${yScale(report.domResult?.summary?.successRate)}`
      ).join(' L ') : '';

    const visualLinePath = reports.length > 1 ?
      'M ' + reports.map((report, index) =>
        `${xScale(index)} ${yScale(report.visualResult?.summary?.successRate)}`
      ).join(' L ') : '';

    return (
      <div className="comparison-view">
        <div className="comparison-header">
          <h4>
            <i className="fas fa-balance-scale"></i>
            Comparison Analysis
          </h4>
          <div className="comparison-controls">
            <button
              className="control-btn"
              onClick={() => exportComparisonReport(comparisonData)}
              title="Export comparison analysis"
            >
              <i className="fas fa-download"></i> Export
            </button>
            <button
              className="control-btn"
              onClick={exitCompareMode}
              title="Exit comparison mode"
            >
              <i className="fas fa-times"></i> Close
            </button>
          </div>
        </div>

        <div className="comparison-content">
          <div className="comparison-summary">
            <div className="summary-card">
              <h6>Reports Compared</h6>
              <p>{comparisonData?.summary?.totalReports}</p>
            </div>
            <div className="summary-card">
              <h6>Time Range</h6>
              <p>
                {formatTimestamp(comparisonData?.summary?.timeRange?.earliest)} - {formatTimestamp(comparisonData?.summary?.timeRange?.latest)}
              </p>
            </div>
            <div className="summary-card">
              <h6>Avg. Execution Time</h6>
              <p>{(comparisonData?.summary?.averageExecutionTime / 1000).toFixed(2)}s</p>
            </div>
          </div>

          <div className="comparison-details-grid">
            <div className="comparison-column">
              <h5>DOM Comparison</h5>
              <div className="comparison-metrics">
                <div className="metric-item">
                  <span>Success Rate Trend</span>
                  <span className={`trend-${comparisonData?.summary?.overallTrends?.dom?.direction}`}>
                    {comparisonData?.summary?.overallTrends?.dom?.direction}
                  </span>
                </div>
                <div className="metric-item">
                  <span>Avg. Success Rate</span>
                  <span>{comparisonData?.domComparison?.successRates?.reduce((a, b) => a + b, 0) / comparisonData?.domComparison?.successRates?.length}%</span>
                </div>
              </div>
            </div>
            <div className="comparison-column">
              <h5>Visual Comparison</h5>
              <div className="comparison-metrics">
                <div className="metric-item">
                  <span>Success Rate Trend</span>
                  <span className={`trend-${comparisonData?.summary?.overallTrends?.visual?.direction}`}>
                    {comparisonData?.summary?.overallTrends?.visual?.direction}
                  </span>
                </div>
                <div className="metric-item">
                  <span>Avg. Success Rate</span>
                  <span>{comparisonData?.visualComparison?.successRates?.reduce((a, b) => a + b, 0) / comparisonData?.visualComparison?.successRates?.length}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Visualization */}
          <div className="comparison-charts">
            <h5>Performance Trends</h5>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color dom"></span>
                <span className="legend-label">DOM Success Rate</span>
              </div>
              <div className="legend-item">
                <span className="legend-color visual"></span>
                <span className="legend-label">Visual Success Rate</span>
              </div>
            </div>
            <div className="chart-container">
              <svg className="comparison-chart" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet">
                {/* Y-axis grid and labels */}
                {[0, 25, 50, 75, 100].map(y => (
                  <g key={y}>
                    <line
                      x1={margin.left}
                      y1={yScale(y)}
                      x2={chartWidth - margin.right}
                      y2={yScale(y)}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={margin.left - 10}
                      y={yScale(y) + 5}
                      fill="#64748b"
                      fontSize="12"
                      textAnchor="end"
                    >
                      {y}%
                    </text>
                  </g>
                ))}

                {/* X-axis labels */}
                {reports.map((report, index) => (
                  <text
                    key={index}
                    x={xScale(index)}
                    y={chartHeight - margin.bottom + 20}
                    fill="#64748b"
                    fontSize="12"
                    textAnchor="middle"
                  >
                    Report {index + 1}
                  </text>
                ))}

                {/* Data lines */}
                {reports.length > 1 && (
                  <>
                    <path
                      d={domLinePath}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      className="trends-line dom"
                    />
                    <path
                      d={visualLinePath}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      className="trends-line visual"
                    />
                  </>
                )}

                {/* Data points */}
                {reports.map((report, index) => (
                  <g key={index}>
                    <circle
                      cx={xScale(index)}
                      cy={yScale(report.domResult?.summary?.successRate)}
                      r="4"
                      fill="#3b82f6"
                      className="data-point"
                    />
                                       <circle
                      cx={xScale(index)}
                      cy={yScale(report.visualResult?.summary?.successRate)}
                      r="4"
                      fill="#8b5cf6"
                      className="data-point"
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const fixedReportMetrics = () => {
    if (!selectedReport) return null;

    // Calculate combined metrics
    const domSummary = selectedReport.domResult?.summary || {};
    const visualSummary = selectedReport.visualResult?.summary || {};
    
    const totalTests = (domSummary.totalTests || 0) + (visualSummary.totalTests || 0);
    const passedTests = (domSummary.passedTests || 0) + (visualSummary.passedTests || 0);
    const failedTests = (domSummary.failedTests || 0) + (visualSummary.failedTests || 0);
    const overallSuccessRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

    return (
      <div className="combined-metrics-dashboard">
        <div className="metrics-summary">
          <div className="metric-circle success-rate">
            <div className="circle-value">{overallSuccessRate}%</div>
            <div className="circle-label">Overall Success Rate</div>
            <svg className="circle-progress" width="120" height="120" viewBox="0 0 120 120">
              <circle className="circle-bg" cx="60" cy="60" r="54" strokeWidth="12" />
              <circle 
                className="circle-progress-value" 
                cx="60" 
                cy="60" 
                r="54" 
                strokeWidth="12" 
                strokeDasharray="339.292"
                strokeDashoffset={339.292 - (339.292 * parseFloat(overallSuccessRate) / 100)}
              />
            </svg>
          </div>
          
          <div className="metrics-cards">
            <div className="metric-card total">
              <div className="metric-icon">
                <i className="fas fa-clipboard-list"></i>
              </div>
              <div className="metric-details">
                <span className="metric-value">{totalTests}</span>
                <span className="metric-name">Total Tests</span>
              </div>
            </div>
            
            <div className="metric-card passed">
              <div className="metric-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="metric-details">
                <span className="metric-value">{passedTests}</span>
                <span className="metric-name">Passed Tests</span>
              </div>
            </div>
            
            <div className="metric-card failed">
              <div className="metric-icon">
                <i className="fas fa-times-circle"></i>
              </div>
              <div className="metric-details">
                <span className="metric-value">{failedTests}</span>
                <span className="metric-name">Failed Tests</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="test-categories-section glass-card">
          <div className="categories-header">
            <div className="header-content">
              <h5>
                <i className="fas fa-layer-group"></i>
                Test Categories
              </h5>
            </div>
          </div>
          <div className="test-categories-grid">
            {/* DOM Testing Category */}
            <div className="category-card dom-category glass-card">
              <div className="category-progress-ring">
                <svg width="60" height="60">
                  <circle cx="30" cy="30" r="26" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                  <circle cx="30" cy="30" r="26" stroke="#3b82f6" strokeWidth="6" fill="none" strokeDasharray="163.36" strokeDashoffset={163.36 - (163.36 * (domSummary.successRate || 0) / 100)} style={{transition: 'stroke-dashoffset 0.7s'}}/>
                </svg>
                <span className="progress-ring-label" title="DOM Success Rate">{domSummary.successRate || 0}%</span>
              </div>
              <div className="category-main">
                <div className="category-icon dom"><i className="fas fa-code"></i></div>
                <div className="category-info">
                  <h6 className="category-title">DOM Structure Testing</h6>
                  <p className="category-description">Element comparison & validation</p>
                </div>
                <span className={`status-badge ${domSummary.successRate >= 80 ? 'excellent' : domSummary.successRate >= 60 ? 'good' : domSummary.successRate >= 40 ? 'warning' : 'critical'}`}>{domSummary.successRate >= 80 ? 'Excellent' : domSummary.successRate >= 60 ? 'Good' : domSummary.successRate >= 40 ? 'Needs Attention' : 'Critical'}</span>
              </div>
              <div className="category-metrics-row">
                <div className="metric" title="Total DOM Tests"><i className="fas fa-list-ol"></i> {domSummary.totalTests || 0}</div>
                               <div className="metric success" title="Passed"><i className="fas fa-check"></i> {domSummary.passedTests || 0}</div>
                <div className="metric failed" title="Failed"><i className="fas fa-times"></i> {domSummary.failedTests || 0}</div>
              </div>
              <button className="category-action-btn" onClick={() => setSelectedTab('dom')} title="View DOM Details">
                <span>View DOM Details</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            {/* Visual Testing Category */}
            <div className="category-card visual-category glass-card">
              <div className="category-progress-ring">
                <svg width="60" height="60">
                  <circle cx="30" cy="30" r="26" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                  <circle cx="30" cy="30" r="26" stroke="#8b5cf6" strokeWidth="6" fill="none" strokeDasharray="163.36" strokeDashoffset={163.36 - (163.36 * (visualSummary.successRate || 0) / 100)} style={{transition: 'stroke-dashoffset 0.7s'}}/>
                </svg>
                <span className="progress-ring-label" title="Visual Success Rate">{visualSummary.successRate || 0}%</span>
              </div>
              <div className="category-main">
                <div className="category-icon visual"><i className="fas fa-eye"></i></div>
                <div className="category-info">
                  <h6 className="category-title">Visual Regression Testing</h6>
                  <p className="category-description">Screenshot comparison & analysis</p>
                </div>
                <span className={`status-badge ${visualSummary.successRate >= 80 ? 'excellent' : visualSummary.successRate >= 60 ? 'good' : visualSummary.successRate >= 40 ? 'warning' : 'critical'}`}>{visualSummary.successRate >= 80 ? 'Excellent' : visualSummary.successRate >= 60 ? 'Good' : visualSummary.successRate >= 40 ? 'Needs Attention' : 'Critical'}</span>
              </div>
              <div className="category-metrics-row">
                <div className="metric" title="Total Visual Tests"><i className="fas fa-list-ol"></i> {visualSummary.totalTests || 0}</div>
                <div className="metric success" title="Passed"><i className="fas fa-check"></i> {visualSummary.passedTests || 0}</div>
                <div className="metric failed" title="Failed"><i className="fas fa-times"></i> {visualSummary.failedTests || 0}</div>
              </div>
              <button className="category-action-btn" onClick={() => setSelectedTab('visual')} title="View Visual Details">
                <span>View Visual Details</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="combined-results-section">
      <h2>Combined Test Results</h2>
      
      {/* Header Controls */}
      <div className="results-header">
        <div className="header-controls aligned-controls">
          <div className="refresh-button">
            <button onClick={fetchCombinedReports} disabled={loadingReports}>
              <i className={`fas fa-sync-alt ${loadingReports ? 'fa-spin' : ''}`}></i> 
              {loadingReports ? 'Refreshing...' : 'REFRESH REPORTS'}
            </button>
          </div>
          
          {/* New Enhanced Features */}
          <div className="advanced-controls">
            <button 
              className="control-btn primary-btn"
              onClick={handleCompareMode}
              title="Compare multiple reports"
            >
              <i className="fas fa-balance-scale"></i> 
              {compareMode ? 'Exit Compare' : 'Compare Reports'}
              <span className="help-icon-button" aria-label="Help information about compare reports">?
                <div className="help-tooltip">
                  Compare two or more test reports side-by-side to identify trends, differences, and improvements over time.
                </div>
              </span>
            </button>
            
            {compareMode && selectedReportsForComparison.length >= 2 && (
              <button 
                className="control-btn primary-btn compare-action"
                onClick={handleCompareReports}
                title="Start comparison of selected reports"
              >
                <i className="fas fa-chart-bar"></i> 
                Compare Selected ({selectedReportsForComparison.length})
              </button>
            )}
            
            <button 
              className="control-btn primary-btn"
              onClick={handleTrendsMode}
              title="Show performance trends"
            >
              <i className="fas fa-chart-line"></i> 
              Trends
              <span className="help-icon-button" aria-label="Help information about trends">?
                <div className="help-tooltip">
                  View performance trends over time, analyze quality metrics, and identify areas for improvement with AI-powered insights.
                </div>
              </span>
            </button>
            
            
            <div className="dropdown-container">
              <button className="control-btn primary-btn dropdown-trigger">
                <i className="fas fa-download"></i> 
                Export Options
                <span className="help-icon-button" aria-label="Help information about export options">?
                  <div className="help-tooltip">
                    Export your test reports in multiple formats. Choose HTML for visual review, PDF for sharing, CSV for data analysis, or JSON for integration with other tools.
                  </div>
                </span>
                <i className="fas fa-chevron-down ms-2"></i>
              </button>
              <div className="dropdown-menu">
                <div className="dropdown-menu-item html" onClick={() => exportReport('html')}>
                  <i className="fas fa-file-code"></i> HTML Report
                </div>
                <div className="dropdown-menu-item pdf" onClick={() => exportReport('pdf')}>
                  <i className="fas fa-file-pdf"></i> PDF Report
                </div>
                <div className="dropdown-menu-item csv" onClick={() => exportReport('csv')}>
                  <i className="fas fa-file-csv"></i> CSV Data
                </div>
                <div className="dropdown-menu-item json" onClick={() => exportReport('json')}>
                  <i className="fas fa-file-code"></i> JSON Data
                </div>
              </div>
            </div>
            
            <button 
              className="control-btn primary-btn"
              onClick={() => window.open('/api/docs/testing-guide', '_blank')}
              title="View testing documentation"
            >
              <i className="fas fa-question-circle"></i> 
              Help
            </button>
          </div>
        </div>

        {/* Filter Section */}
        {selectedReport && !selectedReport.isComparison && (
          <div className="filter-section">
            <div className="filter-header">
              <h3>Filter Results</h3>
              <button className="filter-toggle">
                <i className="fas fa-filter"></i>
              </button>
            </div>
            <div className="filter-controls">
              <div className="filter-group">
                <label>Search Tests</label>
                <input 
                  type="text" 
                  placeholder="Search by URL or label..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Filter by Viewport</label>
                <select value={filterViewport} onChange={(e) => setFilterViewport(e.target.value)}>
                  <option value="all">All Viewports</option>
                  <option value="desktop">Desktop</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
              <div className="checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={showPassedTests}
                    onChange={(e) => setShowPassedTests(e.target.checked)}
                  />
                  Show Passed Tests
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={showFailedTests}
                    onChange={(e) => setShowFailedTests(e.target.checked)}
                  />
                  Show Failed Tests
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Container */}
      <div className="results-container">
        <div className={`dom-results-container ${compareMode ? 'comparison-mode-active' : ''}`}>
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
            ) : combinedReports.length > 0 ? (
              <ul className="report-list">
                {combinedReports.map(report => (
                  <li 
                    key={report.id} 
                    className={`${selectedReport && selectedReport.id === report.id ? 'active' : ''} ${compareMode && selectedReportsForComparison.includes(report.id) ? 'selected' : ''}`}
                    onClick={() => {
                      if (compareMode) {
                        toggleReportSelection(report.id);
                      } else {
                        fetchReportDetails(report.id);
                      }
                    }}
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
                    
                    <div className="report-stats">
                      <span className="report-total">
                        {((report.summary?.domSummary?.totalTests || 0) + (report.summary?.visualSummary?.totalTests || 0)) || 
                         ((report.domResult?.summary?.totalTests || 0) + (report.visualResult?.summary?.totalTests || 0))} total
                      </span>
                      <span className="report-passed">
                        {((report.summary?.domSummary?.passedTests || 0) + (report.summary?.visualSummary?.passedTests || 0)) || 
                         ((report.domResult?.summary?.passedTests || 0) + (report.visualResult?.summary?.passedTests || 0))} passed
                      </span>
                      <span className="report-failed">
                        {((report.summary?.domSummary?.failedTests || 0) + (report.summary?.visualSummary?.failedTests || 0)) || 
                         ((report.domResult?.summary?.failedTests || 0) + (report.visualResult?.summary?.failedTests || 0))} failed
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <i className="fas fa-file-alt"></i>
                <p>No combined reports available</p>
                <p className="empty-state-hint">Run a sitemap-based combined test to generate a report.</p>
              </div>
            )}
          </div>
          
          <div className="report-details">
            <h3>Report Details</h3>
            {loadingReportDetails ? (
              <div className="loading-spinner">Loading report details...</div>
            ) : showTrends ? (
              renderTrendsView()
            ) : selectedReport?.isComparison ? (
              renderComparisonView()
            ) : selectedReport ? (
              <div className="report-content">
                <div className="report-header">
                  <div className="report-summary">
                    <h4>{formatTimestamp(selectedReport.timestamp)}</h4>
                    
                    {/* User information display */}
                    {selectedReport.user && (
                      <div className="report-user-info">
                        <span className="user-label">Created by:</span>
                        <span className="user-name">{selectedReport.user.fullName}</span>
                        <span className="user-email">({selectedReport.user.email})</span>
                      </div>
                    )}
                    
                    {/* Test ID display */}
                    {selectedReport.id && (
                      <div className="report-id-full">
                        <span className="id-label">Test ID:</span>
                        <span className="id-value">{selectedReport.id}</span>
                      </div>
                    )}
                    
                    {/* Test metadata */}
                    <div className="report-metadata">
                      <div className="metadata-item">
                        <span className="metadata-label">Test Type:</span>
                        <span className="metadata-value">Combined (DOM + Visual)</span>
                      </div>
                      {selectedReport.executionTimeMs && (
                        <div className="metadata-item">
                          <span className="metadata-label">Execution Time:</span>
                          <span className="metadata-value">{(selectedReport.executionTimeMs / 1000).toFixed(2)}s</span>
                        </div>
                      )}
                      {selectedReport.testingDomain && (
                        <div className="metadata-item">
                          <span className="metadata-label">Testing Domain:</span>
                          <span className="metadata-value domain">{selectedReport.testingDomain}</span>
                        </div>
                      )}
                      {selectedReport.referenceDomain && (
                        <div className="metadata-item">
                          <span className="metadata-label">Reference Domain:</span>
                          <span className="metadata-value domain">{selectedReport.referenceDomain}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Overall Status */}
                    <div className="overall-status">
                      <span className="status-label">Overall Status:</span>
                      <span className={`status-value ${selectedReport.overallStatus?.toLowerCase()}`}>
                        {selectedReport.overallStatus || 'COMPLETED'}
                      </span>
                    </div>
                    
                    {/* Combined Metrics */}
                    {fixedReportMetrics()}
                  </div>
                  
                  <div className="report-actions">
                    <button className="action-button" onClick={handleExportReport}>
                      <i className="fas fa-download"></i> Export Combined Report
                    </button>
                  </div>
                </div>
                
                {/* Combined Results Sections - Replace tab buttons with modern TabNavigation */}
                <div className="combined-results-tabs">
                  <div className="tabs-container">
                    <TabNavigation 
                      activeTab={selectedTab} 
                      onTabChange={setSelectedTab} 
                      resultCounts={{
                        dom: selectedReport?.domResult?.summary?.totalTests || 0,
                        visual: selectedReport?.visualResult?.summary?.totalTests || 0
                      }}
                    />
                  </div>
                  
                  <div className="tab-content">
                    {selectedTab === 'overview' && (
                      <div className="overview-section modern-overview">
                        {/* Enhanced Executive Summary */}
                        <div className="executive-summary">
                          <div className="summary-header">
                            <div className="summary-title">
                              <h4>
                                <i className="fas fa-chart-line"></i>
                                Executive Summary
                              </h4>
                              <div className="summary-subtitle">
                                Comprehensive analysis of combined DOM and Visual testing results
                              </div>
                            </div>
                            <div className="test-status-indicator">
                              <span className={`status-badge ${(() => {
                                const domSummary = selectedReport.domResult?.summary || {};
                                const visualSummary = selectedReport.visualResult?.summary || {};
                                const totalTests = (domSummary.totalTests || 0) + (visualSummary.totalTests || 0);
                                const passedTests = (domSummary.passedTests || 0) + (visualSummary.passedTests || 0);
                                const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
                                if (successRate >= 95) return 'excellent';
                                if (successRate >= 85) return 'good';
                                if (successRate >= 70) return 'warning';
                                return 'critical';
                              })()}`}>
                                {(() => {
                                  const domSummary = selectedReport.domResult?.summary || {};
                                  const visualSummary = selectedReport.visualResult?.summary || {};
                                  const totalTests = (domSummary.totalTests || 0) + (visualSummary.totalTests || 0);
                                  const passedTests = (domSummary.passedTests || 0) + (visualSummary.passedTests || 0);
                                  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
                                  if (successRate >= 95) return 'Excellent Quality';
                                  if (successRate >= 85) return 'Good Quality';
                                  if (successRate >= 70) return 'Needs Improvement';
                                  return 'Critical Issues';
                                })()}
                              </span>
                            </div>
                          </div>
                          <div className="summary-content">
                            <div className="key-metrics-grid">
                              {/* Overall Success Rate Circle */}
                              <div className="metric-showcase">
                                <div className="showcase-circle">
                                  <svg width="140" height="140" viewBox="0 0 140 140">
                                    <defs>
                                      <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#059669" />
                                      </linearGradient>
                                    </defs>
                                    <circle
                                      cx="70"
                                      cy="70"
                                      r="60"
                                      fill="none"
                                      stroke="#f1f5f9"
                                      strokeWidth="12"
                                    />
                                    <circle
                                      cx="70"
                                      cy="70"
                                      r="60"
                                      fill="none"
                                      stroke="url(#successGradient)"
                                      strokeWidth="12"
                                      strokeLinecap="round"
                                      strokeDasharray="377"
                                      strokeDashoffset={(() => {
                                        const domSummary = selectedReport.domResult?.summary || {};
                                        const visualSummary = selectedReport.visualResult?.summary || {};
                                        const totalTests = (domSummary.totalTests || 0) + (visualSummary.totalTests || 0);
                                        const passedTests = (domSummary.passedTests || 0) + (visualSummary.passedTests || 0);
                                        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
                                        return 377 - (377 * successRate / 100);
                                      })()}
                                      transform="rotate(-90 70 70)"
                                    />
                                  </svg>
                                  <div className="showcase-content">
                                    <div className="showcase-value">
                                      {(() => {
                                        const domSummary = selectedReport.domResult?.summary || {};
                                        const visualSummary = selectedReport.visualResult?.summary || {};
                                        const totalTests = (domSummary.totalTests || 0) + (visualSummary.totalTests || 0);
                                        const passedTests = (domSummary.passedTests || 0) + (visualSummary.passedTests || 0);
                                        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
                                        return successRate.toFixed(1);
                                      })()}%
                                    </div>
                                    <div className="showcase-label">Overall Success</div>
                                  </div>
                                </div>
                              </div>
                              {/* Quick Stats */}
                              <div className="quick-stats-panel">
                                <div className="stat-row">
                                  <div className="stat-item">
                                    <div className="stat-icon">
                                      <i className="fas fa-clipboard-check"></i>
                                    </div>
                                    <div className="stat-details">
                                      <span className="stat-value">
                                        {((selectedReport.domResult?.summary?.totalTests || 0) + 
                                         (selectedReport.visualResult?.summary?.totalTests || 0)).toLocaleString()}
                                      </span>
                                      <span className="stat-label">Total Tests</span>
                                    </div>
                                  </div>
                                  <div className="stat-item">
                                    <div className="stat-icon success">
                                      <i className="fas fa-check-circle"></i>
                                    </div>
                                    <div className="stat-details">
                                      <span className="stat-value">
                                        {((selectedReport.domResult?.summary?.passedTests || 0) + 
                                         (selectedReport.visualResult?.summary?.passedTests || 0)).toLocaleString()}
                                      </span>
                                      <span className="stat-label">Passed</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="stat-row">
                                  <div className="stat-item">
                                    <div className="stat-icon failed">
                                      <i className="fas fa-times-circle"></i>
                                    </div>
                                    <div className="stat-details">
                                      <span className="stat-value">
                                        {((selectedReport.domResult?.summary?.failedTests || 0) + 
                                         (selectedReport.visualResult?.summary?.failedTests || 0)).toLocaleString()}
                                      </span>
                                      <span className="stat-label">Failed</span>
                                    </div>
                                  </div>
                                  <div className="stat-item">
                                    <div className="stat-icon performance">
                                      <i className="fas fa-stopwatch"></i>
                                    </div>
                                    <div className="stat-details">
                                      <span className="stat-value">
                                        {(selectedReport.executionTimeMs / 1000).toFixed(1)}s
                                      </span>
                                      <span className="stat-label">Duration</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Test Coverage Breakdown */}
                              <div className="coverage-breakdown">
                                <h6>Test Coverage Analysis</h6>
                                <div className="coverage-items">
                                  <div className="coverage-item dom">
                                    <div className="coverage-header">
                                      <span className="coverage-type">DOM Structure</span>
                                      <span className="coverage-percentage">
                                        {selectedReport.domResult?.summary?.successRate || 0}%
                                      </span>
                                    </div>
                                    <div className="coverage-bar">
                                      <div className="coverage-fill dom" style={{width: `${selectedReport.domResult?.summary?.successRate || 0}%`}}></div>
                                    </div>
                                    <div className="coverage-details">
                                      {selectedReport.domResult?.summary?.totalTests || 0} tests • 
                                      {selectedReport.domResult?.summary?.failedTests || 0} issues
                                    </div>
                                  </div>
                                  <div className="coverage-item visual">
                                    <div className="coverage-header">
                                      <span className="coverage-type">Visual Regression</span>
                                      <span className="coverage-percentage">
                                        {selectedReport.visualResult?.summary?.successRate || 0}%
                                      </span>
                                    </div>
                                    <div className="coverage-bar">
                                      <div className="coverage-fill visual" style={{width: `${selectedReport.visualResult?.summary?.successRate || 0}%`}}></div>
                                    </div>
                                    <div className="coverage-details">
                                      {selectedReport.visualResult?.summary?.totalTests || 0} tests • 
                                      {selectedReport.visualResult?.summary?.failedTests || 0} issues
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedTab === 'visual' && (
                      <div className="visual-section">
                        <div className="section-header">
                          <h4><i className="fas fa-eye"></i> Visual Regression Testing Results</h4>
                          <div className="section-controls">
                            <div className="sort-controls">
                              <label>Sort by:</label>
                              <select value={visualSortBy} onChange={(e) => setVisualSortBy(e.target.value)}>
                                <option value="status">Status</option>
                                <option value="url">URL</option>
                                <option value="viewport">Viewport</option>
                                <option value="mismatch">Mismatch %</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        {(selectedReport.visualResult?.report?.tests || selectedReport.visualResult?.results) ? (
                          <div className="visual-results">
                            <div className="results-summary-bar">
                              <div className="summary-metric">
                                <span className="metric-value">{selectedReport.visualResult?.summary?.totalTests || 0}</span>
                                <span className="metric-label">Total Tests</span>
                              </div>
                              <div className="summary-metric passed">
                                <span className="metric-value">{selectedReport.visualResult?.summary?.passedTests || 0}</span>
                                <span className="metric-label">Passed</span>
                              </div>
                              <div className="summary-metric failed">
                                <span className="metric-value">{selectedReport.visualResult?.summary?.failedTests || 0}</span>
                                <span className="metric-label">Failed</span>
                              </div>
                              <div className="summary-metric success-rate">
                                <span className="metric-value">{selectedReport.visualResult?.summary?.successRate || 0}%</span>
                                <span className="metric-label">Success Rate</span>
                              </div>
                            </div>
                            

                            <div className="results-list">
                              {getFilteredAndSortedResults(selectedReport.visualResult?.report?.tests || selectedReport.visualResult?.results, 'visual').map((result, index) => (
                                <div key={index} className={`result-item ${result.status?.toLowerCase() === "pass" ? 'pass' : result.status?.toLowerCase() === "fail" ? 'fail' : ''}`}>
                                  <div className="result-header" onClick={() => toggleExpanded(`visual-${index}`)}>
                                    <div className="result-info">
                                      <span className="status-icon">{result.status?.toLowerCase() === "pass" ? 
                                        <i className="fas fa-check-circle success-icon"></i> : 
                                        <i className="fas fa-times-circle error-icon"></i>}
                                      </span>
                                      <div className="result-details">
                                        <span className="result-url">
                                          {result.pair?.label || result.pair?.url?.split('/').pop() || 'Visual Test'}
                                        </span>
                                        {result.pair?.viewportLabel && (
                                          <span className="viewport-label">
                                            <i className="fas fa-desktop"></i> {result.pair.viewportLabel}
                                          </span>
                                        )}
                                      </div>
                                      <div className="result-status-info">
                                        <span className={`result-status ${result.status?.toLowerCase()}`}>{result.status}</span>
                                        {result.pair?.diff?.misMatchPercentage && (
                                          <span className="mismatch-percentage">
                                            <i className="fas fa-percentage"></i> {result.pair.diff.misMatchPercentage}% difference
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="expand-icon">
                                      <i className={`fas fa-chevron-${expandedResults[`visual-${index}`] ? 'up' : 'down'}`}></i>
                                    </div>
                                  </div>
                                  {expandedResults[`visual-${index}`] && (
                                    <div className="result-details-expanded animated fadeIn">
                                      <div className="result-urls">
                                        <div className="url-item">
                                          <span className="url-label">Testing URL:</span>
                                          <span className="url-value">{result.pair?.url || 'N/A'}</span>
                                        </div>
                                        {result.pair?.referenceUrl && (
                                          <div className="url-item">
                                            <span className="url-label">Reference URL:</span>
                                            <span className="url-value">{result.pair.referenceUrl || 'N/A'}</span>
                                          </div>
                                        )}
                                        {result.pair?.viewportLabel && (
                                          <div className="url-item">
                                            <span className="url-label">Viewport:</span>
                                            <span className="url-value highlight">{result.pair.viewportLabel}</span>
                                          </div>
                                        )}
                                      </div>
                                      {renderVisualDifferences(result)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="no-results">
                            <i className="fas fa-image"></i>
                            <p>No visual results available</p>
                            <p className="help-text">Visual comparison results would appear here when available.</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedTab === 'dom' && (
                      <div className="dom-section">
                        <div className="section-header">
                          <h4><i className="fas fa-code"></i> DOM Structure Testing Results</h4>
                          <div className="section-controls">
                            <div className="sort-controls">
                              <label>Sort by:</label>
                              <select value={domSortBy} onChange={(e) => setDomSortBy(e.target.value)}>
                                <option value="status">Status</option>
                                <option value="url">URL</option>
                                <option value="differences">Differences</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        {(selectedReport.domResult?.report?.results || selectedReport.domResult?.results) ? (
                          <div className="dom-results">
                            <div className="results-summary-bar">
                              <div className="summary-metric">
                                <span className="metric-value">{selectedReport.domResult?.summary?.totalTests || 0}</span>
                                <span className="metric-label">Total Tests</span>
                              </div>
                              <div className="summary-metric passed">
                                <span className="metric-value">{selectedReport.domResult?.summary?.passedTests || 0}</span>
                                <span className="metric-label">Passed</span>
                              </div>
                              <div className="summary-metric failed">
                                <span className="metric-value">{selectedReport.domResult?.summary?.failedTests || 0}</span>
                                <span className="metric-label">Failed</span>
                              </div>
                              <div className="summary-metric success-rate">
                                <span className="metric-value">{selectedReport.domResult?.summary?.successRate || 0}%</span>
                                <span className="metric-label">Success Rate</span>
                              </div>
                            </div>
                            
                            <div className="results-list">
                              {getFilteredAndSortedResults(selectedReport.domResult?.report?.results || selectedReport.domResult?.results, 'dom').map((result, index) => (
                                <div key={index} className={`result-item ${result.status?.toUpperCase() === 'PASS' ? 'pass' : 'fail'}`}>
                                  <div className="result-header" onClick={() => toggleExpanded(`dom-${index}`)}>
                                    <div className="result-info">
                                      <span className="status-icon">{result.status?.toUpperCase() === "PASS" ? 
                                        <i className="fas fa-check-circle success-icon"></i> : 
                                        <i className="fas fa-times-circle error-icon"></i>}
                                      </span>
                                      <div className="result-details">
                                        <span className="result-url">
                                          {result.testingUrl ? new URL(result.testingUrl).pathname.split('/').pop() || new URL(result.testingUrl).pathname : `Test ${index + 1}`}
                                        </span>
                                        <span className="page-path">
                                          {result.testingUrl ? new URL(result.testingUrl).pathname : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="result-status-info">
                                        <span className={`result-status ${result.status?.toLowerCase()}`}>{result.status}</span>
                                        {result.differencesCount > 0 && (
                                          <span className="differences-count">
                                            <i className="fas fa-code-branch"></i> {result.differencesCount} differences
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="expand-icon">
                                      <i className={`fas fa-chevron-${expandedResults[`dom-${index}`] ? 'up' : 'down'}`}></i>
                                    </div>
                                  </div>
                                  {expandedResults[`dom-${index}`] && (
                                    <div className="result-details-expanded animated fadeIn">
                                      <div className="result-urls">
                                        <div className="url-item">
                                          <span className="url-label">Testing URL:</span>
                                          <span className="url-value">{result.testingUrl || 'N/A'}</span>
                                        </div>
                                        <div className="url-item">
                                          <span className="url-label">Reference URL:</span>
                                          <span className="url-value">{result.referenceUrl || 'N/A'}</span>
                                        </div>
                                        <div className="url-item">
                                          <span className="url-label">Differences Found:</span>
                                          <span className="url-value highlight">{result.differencesCount || '0'}</span>
                                        </div>
                                      </div>
                                      {renderDomDiffView(result)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="no-results">
                            <i className="fas fa-code"></i>
                            <p>No DOM comparison results available</p>
                            <p className="help-text">DOM structure comparison results would appear here when available.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-mouse-pointer"></i>
                <p>Select a report to view details</p>
                <p className="empty-state-hint">
                  {compareMode 
                    ? 'Select 2 or more reports to compare them side-by-side.' 
                    : showTrends
                    ? 'Trends analysis shows performance over time for all available reports.'
                    : 'Click on a report from the list to see detailed combined results.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CombinedResults;
