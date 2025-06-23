import React, { useState, useRef } from 'react';
import './DOMTests.css';

function DOMTests() {
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
  
  // URL input states
  const [testingUrls, setTestingUrls] = useState('');
  const [referenceUrls, setReferenceUrls] = useState('');
  const [showUrlInputs, setShowUrlInputs] = useState(false);
  const [generatingTestingSitemap, setGeneratingTestingSitemap] = useState(false);
  const [generatingReferenceSitemap, setGeneratingReferenceSitemap] = useState(false);
  const [isRunningDomTest, setIsRunningDomTest] = useState(false);
  const [modal, setModal] = useState({ open: false, type: '', message: '' });

  // Refs for file inputs
  const testingSitemapRef = useRef();
  const referenceSitemapRef = useRef();

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

  // Function to handle URL input changes for testing site
  const handleTestingUrlsChange = (e) => {
    setTestingUrls(e.target.value);
  };

  // Function to handle URL input changes for reference site
  const handleReferenceUrlsChange = (e) => {
    setReferenceUrls(e.target.value);
  };

  // Function to toggle URL input visibility
  const toggleUrlInputs = () => {
    setShowUrlInputs(!showUrlInputs);
    if (!showUrlInputs) {
      setGeneratingTestingSitemap(false);
      setGeneratingReferenceSitemap(false);
    }
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

  // Start testing with both sitemaps
  const handleStartTesting = () => {
    if (!testingSitemap.content || !referenceSitemap.content) {
      alert('Please upload both testing and reference sitemaps before starting tests.');
      return;
    }
    
    // Get user from local storage or session storage
    const user = JSON.parse(localStorage.getItem('user')) || 
                JSON.parse(sessionStorage.getItem('user'));
                
    if (!user) {
      alert('You need to be logged in to run tests.');
      return;
    }
    
    setIsRunningDomTest(true);
    fetch('http://localhost:3001/api/test/dom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testingSitemap: testingSitemap.content,
        referenceSitemap: referenceSitemap.content,
        user: user,
        fromFrontend: true
      })
    })
    .then(response => response.json())
    .then((data) => {
      setIsRunningDomTest(false);
      if (data.success) {
        setModal({ open: true, type: 'success', message: `Testing started successfully! ${data.message}` });
        setTimeout(() => {
          setModal({ open: false, type: '', message: '' });
          window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'dom-results' }));
        }, 2000);
      } else {
        setModal({ open: true, type: 'error', message: `Testing failed: ${data.error || data.message}` });
        setTimeout(() => setModal({ open: false, type: '', message: '' }), 2500);
      }
    })
    .catch((error) => {
      setIsRunningDomTest(false);
      setModal({ open: true, type: 'error', message: 'Error connecting to testing service. Please try again.' });
      setTimeout(() => setModal({ open: false, type: '', message: '' }), 2500);
    });
  };

  return (
    <div className="dom-testing-section">
      <h2>DOM Testing</h2>
      <p>Test your web application's DOM structure and elements by comparing two versions of your site.</p>
      
      {isRunningDomTest && (
        <div className="dom-test-loader">
          <div className="spinner"></div>
          <div className="loader-text">DOM Testing is running...</div>
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
              disabled={!testingSitemap.content || !referenceSitemap.content}
              onClick={handleStartTesting}
            >
              <i className="fas fa-play"></i> Start DOM Testing
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
      
      <div className="advanced-options">
        <h3>Advanced Testing Options</h3>
        <div className="options-grid">
          <div className="option-item">
            <label>
              <input type="checkbox" /> Compare CSS styles
            </label>
            <p>Include CSS style differences in the comparison</p>
          </div>
          <div className="option-item">
            <label>
              <input type="checkbox" /> Ignore dynamic content
            </label>
            <p>Skip comparing content that changes between page loads</p>
          </div>
          <div className="option-item">
            <label>
              <input type="checkbox" /> Compare text content
            </label>
            <p>Check for differences in visible text</p>
          </div>
          <div className="option-item">
            <label>
              <input type="checkbox" /> Compare attributes
            </label>
            <p>Check for differences in HTML attributes</p>
          </div>
        </div>
      </div>
      
      <div className="saved-test-suites">
        <h3>Saved Test Suites</h3>
        <div className="suite-list">
          <div className="suite-item">
            <h4>Homepage Elements Suite</h4>
            <p>Tests critical elements on the homepage</p>
            <div className="suite-actions">
              <span className="suite-info">8 URLs</span>
              <button>Run</button>
            </div>
          </div>
          <div className="suite-item">
            <h4>Login Flow Suite</h4>
            <p>Tests login page and authentication elements</p>
            <div className="suite-actions">
              <span className="suite-info">3 URLs</span>
              <button>Run</button>
            </div>
          </div>
          <div className="suite-item">
            <h4>Product Pages</h4>
            <p>Tests product detail page variations</p>
            <div className="suite-actions">
              <span className="suite-info">12 URLs</span>
              <button>Run</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Modal for DOM Test Result */}
      {modal.open && (
        <div className={`custom-modal ${modal.type}`}>
          <div className="modal-content">
            <span className="modal-icon">{modal.type === 'success' ? '✔️' : '❌'}</span>
            <div className="modal-message">{modal.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DOMTests;