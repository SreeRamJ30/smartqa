import React, { useState, useRef, useEffect } from 'react';
import './VisualTests.css';

function VisualTests() {
  // State for URL inputs
  const [testingUrl, setTestingUrl] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  
  // State for sitemap uploads
  const [testingSitemap, setTestingSitemap] = useState({
    fileName: '',
    content: null,
    urlCount: 0
  });
  const [referenceSitemap, setReferenceSitemap] = useState({
    fileName: '',
    content: null,
    urlCount: 0
  });
  
  // State for viewport settings
  const [viewports, setViewports] = useState({
    desktop: { selected: true, width: 1920, height: 1080 },
    tablet: { selected: true, width: 768, height: 1024 },
    mobile: { selected: true, width: 375, height: 667 }
  });
  
  // State for custom viewport
  const [customViewport, setCustomViewport] = useState({
    width: '',
    height: '',
    name: ''
  });
  const [showCustomViewport, setShowCustomViewport] = useState(false);
  
  // State for advanced settings
  const [threshold, setThreshold] = useState(0.1); // 0.1 = 10% difference threshold
  const [hideSelectors, setHideSelectors] = useState('');
  const [captureDelay, setCaptureDelay] = useState(500); // ms delay before capture
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // State for URL input section
  const [showUrlInputs, setShowUrlInputs] = useState(false);
  const [generatingTestingSitemap, setGeneratingTestingSitemap] = useState(false);
  const [generatingReferenceSitemap, setGeneratingReferenceSitemap] = useState(false);
  const [testingUrls, setTestingUrls] = useState('');
  const [referenceUrls, setReferenceUrls] = useState('');

  // Refs for file inputs
  const testingSitemapRef = useRef();
  const referenceSitemapRef = useRef();

  // Add loading state for test progress
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testProgress, setTestProgress] = useState({
    status: '',
    progress: 0,
    message: ''
  });
  
  // State for modal
  const [modal, setModal] = useState({ open: false, type: '', message: '' });

  // Handle URL input changes
  const handleTestingUrlChange = (e) => {
    setTestingUrl(e.target.value);
  };

  const handleReferenceUrlChange = (e) => {
    setReferenceUrl(e.target.value);
  };

  // Handle viewport checkbox changes
  const handleViewportChange = (viewport) => {
    setViewports({
      ...viewports,
      [viewport]: {
        ...viewports[viewport],
        selected: !viewports[viewport].selected
      }
    });
  };

  // Handle custom viewport inputs
  const handleCustomViewportChange = (field, value) => {
    setCustomViewport({
      ...customViewport,
      [field]: value
    });
  };

  // Toggle advanced settings visibility
  const toggleAdvancedSettings = () => {
    setShowAdvancedSettings(!showAdvancedSettings);
  };
  
  // Toggle custom viewport input visibility
  const toggleCustomViewport = () => {
    setShowCustomViewport(!showCustomViewport);
  };

  // Handle threshold change
  const handleThresholdChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      setThreshold(value);
    }
  };

  // Handle hide selectors change
  const handleHideSelectorsChange = (e) => {
    setHideSelectors(e.target.value);
  };

  // Handle capture delay change
  const handleCaptureDelayChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setCaptureDelay(value);
    }
  };

  // Handle sitemap file upload
  const handleFileUpload = (e, sitemapType) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const urlCount = countUrlsInSitemap(content);
      
      if (sitemapType === 'testing') {
        setTestingSitemap({
          fileName: file.name,
          content: content,
          urlCount: urlCount
        });
      } else {
        setReferenceSitemap({
          fileName: file.name,
          content: content,
          urlCount: urlCount
        });
      }
    };
    
    reader.readAsText(file);
  };

  // Count URLs in sitemap content
  const countUrlsInSitemap = (content) => {
    if (!content) return 0;
    
    // Simple counting for XML sitemaps
    const urlMatches = content.match(/<loc>(.*?)<\/loc>/g);
    return urlMatches ? urlMatches.length : 0;
  };

  // Reset file input when clicking "Choose File" again
  const resetFileInput = (sitemapType) => {
    if (sitemapType === 'testing') {
      testingSitemapRef.current.value = "";
    } else {
      referenceSitemapRef.current.value = "";
    }
  };

  // Function to toggle URL input visibility
  const toggleUrlInputs = () => {
    setShowUrlInputs(!showUrlInputs);
    if (!showUrlInputs) {
      setGeneratingTestingSitemap(false);
      setGeneratingReferenceSitemap(false);
    }
  };

  // Function to handle URL input changes for testing site
  const handleTestingUrlsChange = (e) => {
    setTestingUrls(e.target.value);
  };

  // Function to handle URL input changes for reference site
  const handleReferenceUrlsChange = (e) => {
    setReferenceUrls(e.target.value);
  };

  // Generate sitemap from pasted URLs
  const generateSitemapFromUrls = (urls, sitemapType) => {
    // Split the input by new lines, commas, or semicolons
    const urlList = urls.split(/[\n,;]/)
      .map(url => url.trim())
      .filter(url => url !== '');
    
    if (urlList.length === 0) {
      alert('Please enter at least one URL');
      return;
    }

    // Create XML sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    urlList.forEach(url => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${url}</loc>\n`;
      sitemap += `  </url>\n`;
    });
    
    sitemap += `</urlset>`;
    
    // Set the sitemap content
    const urlCount = urlList.length;
    const fileName = `generated-${sitemapType}-sitemap.xml`;
    
    if (sitemapType === 'testing') {
      setTestingSitemap({
        fileName: fileName,
        content: sitemap,
        urlCount: urlCount
      });
      setGeneratingTestingSitemap(false);
    } else {
      setReferenceSitemap({
        fileName: fileName,
        content: sitemap,
        urlCount: urlCount
      });
      setGeneratingReferenceSitemap(false);
    }
  };

  // Start visual testing with enhanced progress tracking
  const handleStartVisualTest = () => {
    // Validate inputs
    const usingSitemap = testingSitemap.content || referenceSitemap.content;
    const usingSingleUrl = testingUrl || referenceUrl;
    
    if (!usingSitemap && !usingSingleUrl) {
      alert('Please enter at least one URL or upload a sitemap.');
      return;
    }

    // For sitemap testing, require both maps
    if ((testingSitemap.content && !referenceSitemap.content) || 
        (!testingSitemap.content && referenceSitemap.content)) {
      alert('When using sitemaps, please provide both testing and reference sitemaps.');
      return;
    }
    
    // Validate that at least one viewport is selected
    const hasViewport = viewports.desktop.selected || viewports.tablet.selected || viewports.mobile.selected;
    if (!hasViewport) {
      alert('Please select at least one viewport size.');
      return;
    }
    
    // Get user from local storage
    const user = JSON.parse(localStorage.getItem('user')) || 
                JSON.parse(sessionStorage.getItem('user'));
                
    if (!user) {
      alert('You need to be logged in to run tests.');
      return;
    }
    
    // Create selected viewports array
    const selectedViewports = [];
    if (viewports.desktop.selected) {
      selectedViewports.push({
        name: 'desktop',
        width: viewports.desktop.width,
        height: viewports.desktop.height
      });
    }
    if (viewports.tablet.selected) {
      selectedViewports.push({
        name: 'tablet',
        width: viewports.tablet.width,
        height: viewports.tablet.height
      });
    }
    if (viewports.mobile.selected) {
      selectedViewports.push({
        name: 'mobile',
        width: viewports.mobile.width,
        height: viewports.mobile.height
      });
    }
    
    // Add custom viewport if defined and shown
    if (showCustomViewport && 
        customViewport.width && 
        customViewport.height && 
        customViewport.name) {
      selectedViewports.push({
        name: customViewport.name,
        width: parseInt(customViewport.width),
        height: parseInt(customViewport.height)
      });
    }
    
    // Prepare test data
    const testData = {
      // URLs or sitemaps
      testingUrl: testingUrl,
      referenceUrl: referenceUrl,
      testingSitemap: testingSitemap.content,
      referenceSitemap: referenceSitemap.content,
      
      // Settings
      viewports: selectedViewports,
      threshold: threshold,
      hideSelectors: hideSelectors.split(',').map(s => s.trim()).filter(s => s !== ''),
      captureDelay: captureDelay,
      
      // User
      user: user
    };
    
    // Show loading state
    setIsRunningTest(true);
    setTestProgress({
      status: 'starting',
      progress: 10,
      message: 'Initializing visual test...'
    });
    
    // API call to backend to start visual testing
    fetch('http://localhost:3001/api/test/visual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    .then(response => {
      setTestProgress({
        status: 'processing',
        progress: 50,
        message: 'Processing test results...'
      });
      return response.json();
    })
    .then((data) => {
      setIsRunningTest(false);
      let modalType = 'success';
      let modalMsg = 'All visual tests passed! No differences detected.';
      if (data.hasVisualDifferences && data.failures) {
        modalType = 'error';
        modalMsg = `Visual differences detected! ${data.failures.length} test(s) failed with visual changes.`;
      } else if (!data.success) {
        modalType = 'error';
        modalMsg = `Testing failed: ${data.error || data.message}`;
      } else if (data.message) {
        modalMsg = data.message;
      }
      setModal({ open: true, type: modalType, message: modalMsg });
      setTimeout(() => {
        setModal({ open: false, type: '', message: '' });
        window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'visual-results' }));
      }, 2000);
    })
    .catch((error) => {
      setIsRunningTest(false);
      setModal({ open: true, type: 'error', message: 'Error connecting to testing service. Please try again.' });
      setTimeout(() => setModal({ open: false, type: '', message: '' }), 2500);
    });
  };

  // Add this section above the return statement
  // Function to extract a sitemap URL from a base URL
  const extractSitemapUrl = (url) => {
    try {
      const baseUrl = new URL(url);
      return `${baseUrl.protocol}//${baseUrl.hostname}/sitemap.xml`;
    } catch (e) {
      return '';
    }
  };

  // Auto-suggest sitemap URLs when base URLs are entered
  useEffect(() => {
    if (testingUrl && !testingSitemap.content) {
      setTestingSitemap(prev => ({
        ...prev,
        suggestedSitemapUrl: extractSitemapUrl(testingUrl)
      }));
    }
    
    if (referenceUrl && !referenceSitemap.content) {
      setReferenceSitemap(prev => ({
        ...prev,
        suggestedSitemapUrl: extractSitemapUrl(referenceUrl)
      }));
    }
  }, [testingUrl, referenceUrl]);

  return (
    <div className="visual-testing-section">
      <h2>Visual Testing</h2>
      <p>Test your web application's visual appearance by comparing screenshots from different environments.</p>
      
      {/* Testing Progress Indicator */}
      {isRunningTest && (
        <div className="dom-test-loader">
          <div className="spinner"></div>
          <div className="loader-text">Visual Testing is running...</div>
        </div>
      )}
      
      {modal.open && (
        <div className={`custom-modal ${modal.type}`}>
          <div className="modal-content">
            <span className="modal-icon">{modal.type === 'success' ? '✔️' : '❌'}</span>
            <div className="modal-message">{modal.message}</div>
          </div>
        </div>
      )}
      
      <div className="sitemap-upload-container">
        <div className="sitemap-upload-section">
          <h3>Upload Sitemaps</h3>
          <p>Upload XML sitemaps for your testing and reference sites, or generate them from URLs.</p>
          
          <div className="upload-panels">
            <div className="upload-panel">
              <h4>Testing Site Sitemap</h4>
              <div className="file-upload-wrapper">
                <input 
                  type="file" 
                  id="testing-sitemap" 
                  accept=".xml,.txt"
                  ref={testingSitemapRef}
                  onChange={(e) => handleFileUpload(e, 'testing')}
                />
                <label 
                  htmlFor="testing-sitemap" 
                  className="file-upload-label"
                  onClick={() => resetFileInput('testing')}
                >
                  <i className="fas fa-upload"></i> Choose Testing Sitemap
                </label>
                <span className="file-name">
                  {testingSitemap.fileName || 'No file chosen'}
                </span>
                {testingSitemap.fileName && (
                  <div className="url-count">
                    <i className="fas fa-link"></i> {testingSitemap.urlCount} URLs
                  </div>
                )}
              </div>
            </div>
            
            <div className="upload-panel">
              <h4>Reference Site Sitemap</h4>
              <div className="file-upload-wrapper">
                <input 
                  type="file" 
                  id="reference-sitemap" 
                  accept=".xml,.txt"
                  ref={referenceSitemapRef}
                  onChange={(e) => handleFileUpload(e, 'reference')}
                />
                <label 
                  htmlFor="reference-sitemap" 
                  className="file-upload-label"
                  onClick={() => resetFileInput('reference')}
                >
                  <i className="fas fa-upload"></i> Choose Reference Sitemap
                </label>
                <span className="file-name">
                  {referenceSitemap.fileName || 'No file chosen'}
                </span>
                {referenceSitemap.fileName && (
                  <div className="url-count">
                    <i className="fas fa-link"></i> {referenceSitemap.urlCount} URLs
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              className="secondary-button"
              onClick={toggleUrlInputs}
            >
              <i className={`fas fa-${showUrlInputs ? 'minus' : 'plus'}-circle`}></i>
              {showUrlInputs ? 'Hide URL Input' : 'Generate From URLs'}
            </button>
            
            <button 
              className="primary-button"
              disabled={(!testingSitemap.content && !referenceSitemap.content && !testingUrl && !referenceUrl) || isRunningTest}
              onClick={handleStartVisualTest}
            >
              <i className="fas fa-camera"></i> Start Visual Testing
            </button>
          </div>
          
          {/* URL Input Section */}
          {showUrlInputs && (
            <div className="url-input-section">
              <h4>Generate Sitemaps from URLs</h4>
              <p>Enter URLs one per line, or separate them with commas or semicolons</p>

              <div className="url-input-container">
                <div className="url-input-column">
                  <div className="form-group">
                    <label>Testing Site URLs</label>
                    <textarea 
                      placeholder="Enter URLs, e.g.:
https://test-site.com/page1
https://test-site.com/page2
or comma separated"
                      value={testingUrls}
                      onChange={handleTestingUrlsChange}
                    ></textarea>
                    <button 
                      className={`url-generate-btn ${generatingTestingSitemap ? 'generating' : ''}`}
                      onClick={() => {
                        setGeneratingTestingSitemap(true);
                        generateSitemapFromUrls(testingUrls, 'testing');
                      }}
                      disabled={generatingTestingSitemap || !testingUrls}
                    >
                      {generatingTestingSitemap ? 'Generating...' : 'Generate Testing Sitemap'}
                    </button>
                  </div>
                </div>

                <div className="url-input-column">
                  <div className="form-group">
                    <label>Reference Site URLs</label>
                    <textarea 
                      placeholder="Enter URLs, e.g.:
https://reference-site.com/page1
https://reference-site.com/page2
or comma separated"
                      value={referenceUrls}
                      onChange={handleReferenceUrlsChange}
                    ></textarea>
                    <button 
                      className={`url-generate-btn ${generatingReferenceSitemap ? 'generating' : ''}`}
                      onClick={() => {
                        setGeneratingReferenceSitemap(true);
                        generateSitemapFromUrls(referenceUrls, 'reference');
                      }}
                      disabled={generatingReferenceSitemap || !referenceUrls}
                    >
                      {generatingReferenceSitemap ? 'Generating...' : 'Generate Reference Sitemap'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      
        <div className="sitemap-preview-container">
          <h3>Sitemap Preview</h3>
          <div className="preview-panels">
            <div className="preview-panel">
              <h4>Testing Sitemap</h4>
              {testingSitemap.content ? (
                <div className="sitemap-content">
                  <pre>{testingSitemap.content.substring(0, 300)}
                    {testingSitemap.content.length > 300 ? '...' : ''}
                  </pre>
                </div>
              ) : (
                <div className="empty-preview">
                  <i className="fas fa-file-code"></i>
                  <p>No sitemap uploaded yet</p>
                </div>
              )}
            </div>
            
            <div className="preview-panel">
              <h4>Reference Sitemap</h4>
              {referenceSitemap.content ? (
                <div className="sitemap-content">
                  <pre>{referenceSitemap.content.substring(0, 300)}
                    {referenceSitemap.content.length > 300 ? '...' : ''}
                  </pre>
                </div>
              ) : (
                <div className="empty-preview">
                  <i className="fas fa-file-code"></i>
                  <p>No sitemap uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Advanced Options */}
      <div className="advanced-options">
        <h3>Visual Testing Options</h3>
        <div className="options-grid">
          <div className="option-item">
            <label>
              <input 
                type="checkbox" 
                checked={viewports.desktop.selected}
                onChange={() => handleViewportChange('desktop')}
              />
              Desktop (1920×1080)
            </label>
            <p>Test on desktop viewport</p>
          </div>
          <div className="option-item">
            <label>
              <input 
                type="checkbox" 
                checked={viewports.tablet.selected}
                onChange={() => handleViewportChange('tablet')}
              />
              Tablet (768×1024)
            </label>
            <p>Test on tablet viewport</p>
          </div>
          <div className="option-item">
            <label>
              <input 
                type="checkbox" 
                checked={viewports.mobile.selected}
                onChange={() => handleViewportChange('mobile')}
              />
              Mobile (375×667)
            </label>
            <p>Test on mobile viewport</p>
          </div>
          <div className="option-item">
            <label>
              <input 
                type="checkbox" 
                checked={showAdvancedSettings}
                onChange={() => setShowAdvancedSettings(!showAdvancedSettings)}
              />
              Advanced Settings
            </label>
            <p>Configure threshold, delays, and selectors</p>
          </div>
        </div>
        
        {/* Advanced Settings */}
        {showAdvancedSettings && (
          <div className="advanced-settings">
            <div className="form-group">
              <label>Difference Threshold (0 - 1)</label>
              <div className="threshold-input">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                />
                <div className="threshold-value">{threshold} ({Math.round(threshold * 100)}%)</div>
              </div>
              <div className="settings-help">
                Higher values are more tolerant of differences
              </div>
            </div>
            
            <div className="form-group">
              <label>Hide Elements (CSS Selectors)</label>
              <input 
                type="text" 
                placeholder=".ad-banner, #cookie-notice, .dynamic-content"
                value={hideSelectors}
                onChange={(e) => setHideSelectors(e.target.value)}
              />
              <div className="settings-help">
                Comma-separated list of elements to ignore
              </div>
            </div>
            
            <div className="form-group">
              <label>Capture Delay (ms)</label>
              <input 
                type="number" 
                placeholder="500"
                min="0"
                value={captureDelay}
                onChange={(e) => setCaptureDelay(parseInt(e.target.value))}
              />
              <div className="settings-help">
                Wait time before capturing screenshot (for animations/loading)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VisualTests;