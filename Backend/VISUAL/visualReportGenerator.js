const fs = require('fs').promises;
const path = require('path');

/**
 * Generate Visual Test HTML Report from BackstopJS results
 * @param {Object} backstopData - BackstopJS test results
 * @param {Object} options - Report generation options
 * @returns {Object} Report generation result
 */
async function generateVisualReport(backstopData, options = {}) {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const userId = options.user?.email?.split('@')[0] || 'anonymous';
    const randomId = Math.random().toString(36).substring(7);
    const testId = `${userId}-${randomId}`;
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.resolve(__dirname, './reports');
    try {
      await fs.access(reportsDir);
    } catch (error) {
      await fs.mkdir(reportsDir, { recursive: true });
    }
    
    // Process BackstopJS data
    const processedResults = processBackstopResults(backstopData);
    
    // Generate HTML report
    const htmlContent = await generateHTML(processedResults, testId, options);
    
    // Save the HTML report
    const reportFileName = `visual-test-html-report-${timestamp}-${testId}.html`;
    const reportPath = path.resolve(reportsDir, reportFileName);
    await fs.writeFile(reportPath, htmlContent);
    
    // Save JSON data for API access
    const jsonFileName = `visual-test-report-${timestamp}-${testId}.json`;
    const jsonPath = path.resolve(reportsDir, jsonFileName);
    const reportData = {
      id: testId,
      timestamp: timestamp,
      user: options.user,
      summary: processedResults.summary,
      results: processedResults.scenarios,
      generatedAt: new Date().toISOString()
    };
    await fs.writeFile(jsonPath, JSON.stringify(reportData, null, 2));
    
    return {
      success: true,
      reportPath: `/visual-reports/${reportFileName}`,
      jsonPath: `/visual-reports/${jsonFileName}`,
      testId: testId,
      summary: processedResults.summary
    };
    
  } catch (error) {
    console.error('Error generating visual report:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process BackstopJS results into structured format
 * @param {Object} backstopData - Raw BackstopJS data
 * @returns {Object} Processed results
 */
function processBackstopResults(backstopData) {
  const tests = backstopData.tests || [];
  
  // Group tests by page and viewport
  const scenarioMap = new Map();
  
  tests.forEach(test => {
    const pageName = test.pair?.label || 'Unknown Page';
    const viewport = test.pair?.viewportLabel || 'Unknown Viewport';
    const scenarioKey = `${pageName}_${viewport}`;
    
    // Extract threshold and mismatch values with proper type handling
    const thresholdDecimal = test.pair?.misMatchThreshold || 0.1; // Keep as decimal (0.1 = 10%)
    const mismatchString = test.pair?.diff?.misMatchPercentage || '0.00';
    const mismatchNumber = parseFloat(mismatchString) || 0;
    
    scenarioMap.set(scenarioKey, {
      pageName: pageName,
      viewport: viewport,
      status: test.status === 'pass' ? 'PASS' : 'FAIL',
      misMatchPercentage: mismatchNumber, // Store as number
      rawMisMatchPercentage: test.pair?.diff?.rawMisMatchPercentage || 0,
      threshold: thresholdDecimal, // Store as decimal for consistency
      testingUrl: test.pair?.url || '',
      referenceUrl: test.pair?.referenceUrl || '',
      
      // Image paths - convert Windows paths to web paths
      referencePath: test.pair?.reference ? convertToWebPath(test.pair.reference) : null,
      testPath: test.pair?.test ? convertToWebPath(test.pair.test) : null,
      diffPath: test.pair?.diffImage ? convertToWebPath(test.pair.diffImage) : null,
      
      // Additional metadata
      dimensions: test.pair?.diff?.dimensionDifference || { width: 0, height: 0 },
      isSameDimensions: test.pair?.diff?.isSameDimensions || true,
      analysisTime: test.pair?.diff?.analysisTime || 0,
      
      // For consistency with existing format
      differences: test.status === 'fail' ? [{
        type: 'VISUAL_MISMATCH',
        path: pageName,
        testing: `${mismatchNumber.toFixed(2)}% different`,
        reference: 'baseline',
        issue: `Visual difference of ${mismatchNumber.toFixed(2)}% detected in ${viewport} viewport (threshold: ${(thresholdDecimal * 100).toFixed(1)}%)`
      }] : [],
      differencesCount: test.status === 'fail' ? 1 : 0
    });
  });
  
  const scenarios = Array.from(scenarioMap.values());
  
  // Calculate summary
  const summary = {
    totalTests: scenarios.length,
    passedTests: scenarios.filter(s => s.status === 'PASS').length,
    failedTests: scenarios.filter(s => s.status === 'FAIL').length,
    successRate: scenarios.length > 0 ? 
      Math.round((scenarios.filter(s => s.status === 'PASS').length / scenarios.length) * 100) : 0
  };
  
  return {
    scenarios,
    summary,
    viewports: [...new Set(scenarios.map(s => s.viewport))],
    pages: [...new Set(scenarios.map(s => s.pageName))]
  };
}

/**
 * Convert Windows file path to web-accessible path
 * @param {string} filePath - Windows file path
 * @param {string} baseDir - Base directory for the visual testing
 * @returns {string} Web-accessible path
 */
function convertToWebPath(filePath, baseDir = __dirname) {
  if (!filePath) return null;
  
  // Convert Windows backslashes to forward slashes
  let webPath = filePath.replace(/\\/g, '/');
  
  // Remove the ".." parent directory references
  webPath = webPath.replace(/\.\.\//g, '');
  
  // Create a relative path from the reports directory to the image
  const reportsDir = path.resolve(baseDir, 'reports');
  const backstopDataDir = path.resolve(baseDir, 'backstop_data');
  
  // Calculate relative path from reports to backstop_data
  const relativePath = path.relative(reportsDir, backstopDataDir).replace(/\\/g, '/');
  
  // Ensure the path starts correctly
  if (!webPath.startsWith('bitmaps_')) {
    // Extract just the filename part if it has full path
    const parts = webPath.split('/');
    const bitmapsIndex = parts.findIndex(part => part.startsWith('bitmaps_'));
    if (bitmapsIndex >= 0) {
      webPath = parts.slice(bitmapsIndex).join('/');
    }
  }
  
  return `${relativePath}/${webPath}`;
}

/**
 * Generate HTML report content
 * @param {Object} results - Processed results
 * @param {string} testId - Test ID
 * @param {Object} options - Generation options
 * @returns {string} HTML content
 */
async function generateHTML(results, testId, options = {}) {
  const templatePath = path.resolve(__dirname, './templates/visual-report-template.html');
  let template;
  
  try {
    template = await fs.readFile(templatePath, 'utf8');
  } catch (error) {
    console.error('Could not read template, using enhanced default:', error);
    template = getEnhancedTemplate();
  }
  
  // Replace template placeholders
  let html = template
    .replace(/{{PASSED}}/g, results.summary.passedTests)
    .replace(/{{FAILED}}/g, results.summary.failedTests)
    .replace(/{{TOTAL}}/g, results.summary.totalTests)
    .replace(/{{SUCCESS_RATE}}/g, results.summary.successRate)
    .replace(/{{TEST_ID}}/g, testId)
    .replace(/{{TIMESTAMP}}/g, new Date().toLocaleString())
    .replace(/{{USER_NAME}}/g, options.user?.fullName || options.user?.email || 'Unknown User')
    .replace(/{{USER_EMAIL}}/g, options.user?.email || 'N/A')
    .replace(/{{GENERATED_DATE}}/g, new Date().toISOString());
  
  // Generate properly formatted scenario data for the enhanced JavaScript functionality
  const scenariosData = {
    scenarios: results.scenarios.map(scenario => ({
      pageName: scenario.pageName,
      viewport: scenario.viewport,
      status: scenario.status,
      mismatchPercentage: parseFloat(scenario.misMatchPercentage) || 0,
      threshold: (scenario.threshold || 10) / 100, // Convert back to decimal for consistency
      testUrl: scenario.testingUrl || '',
      referenceUrl: scenario.referenceUrl || '',
      
      // Ensure image paths work in standalone HTML
      referencePath: scenario.referencePath ? `./backstop_data/${scenario.referencePath.split('backstop_data/')[1] || scenario.referencePath}` : null,
      testPath: scenario.testPath ? `./backstop_data/${scenario.testPath.split('backstop_data/')[1] || scenario.testPath}` : null,
      diffPath: scenario.diffPath ? `./backstop_data/${scenario.diffPath.split('backstop_data/')[1] || scenario.diffPath}` : null,
      
      // Additional metadata for enhanced functionality
      dimensions: scenario.dimensions || { width: 0, height: 0 },
      isSameDimensions: scenario.isSameDimensions !== false,
      analysisTime: scenario.analysisTime || 0,
      differences: scenario.differences || [],
      differencesCount: scenario.differencesCount || 0
    })),
    summary: results.summary,
    viewports: results.viewports,
    pages: results.pages,
    testId: testId,
    generatedAt: new Date().toISOString()
  };
  
  // Replace the scenarios data placeholder in the template
  html = html.replace(/{{SCENARIOS_DATA}}/g, JSON.stringify(scenariosData));
  
  // Enhanced JavaScript functionality with proper data injection
  const enhancedScript = `
    <script>
      // Replace the default data with actual scenario data
      window.visualTestData = ${JSON.stringify({
        scenarios: results.scenarios.map(scenario => {
          const backstopDataPart = scenario.referencePath ? scenario.referencePath.split('backstop_data/')[1] || scenario.referencePath : null;
          const testBackstopDataPart = scenario.testPath ? scenario.testPath.split('backstop_data/')[1] || scenario.testPath : null;
          const diffBackstopDataPart = scenario.diffPath ? scenario.diffPath.split('backstop_data/')[1] || scenario.diffPath : null;
          
          return {
            pageName: scenario.pageName,
            viewport: scenario.viewport,
            status: scenario.status,
            mismatchPercentage: parseFloat(scenario.misMatchPercentage) || 0,
            threshold: (scenario.threshold || 10) / 100,
            testUrl: scenario.testingUrl || '',
            referenceUrl: scenario.referenceUrl || '',
            referencePath: backstopDataPart ? `../backstop_data/${backstopDataPart}` : null,
            testPath: testBackstopDataPart ? `../backstop_data/${testBackstopDataPart}` : null,
            diffPath: diffBackstopDataPart ? `../backstop_data/${diffBackstopDataPart}` : null,
            dimensions: scenario.dimensions || { width: 0, height: 0 },
            isSameDimensions: scenario.isSameDimensions !== false,
            analysisTime: scenario.analysisTime || 0,
            differences: scenario.differences || [],
            differencesCount: scenario.differencesCount || 0
          };
        }),
        summary: results.summary,
        viewports: results.viewports,
        pages: results.pages,
        testId: testId,
        generatedAt: new Date().toISOString()
      })};
    </script>
  `;
  
  // Insert the enhanced script before closing body tag
  html = html.replace('</body>', enhancedScript + '</body>');
  
  return html;
}

/**
 * Default HTML template if file template is not available
 * @returns {string} Default HTML template
 */
function getDefaultTemplate() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Report</title>
  <style>
    :root {
      --primary-color: #2563eb;
      --primary-hover: #1d4ed8;
      --success-color: #22c55e;
      --error-color: #ef4444;
      --text-color: #1e293b;
      --text-light: #64748b;
      --border-color: #e2e8f0;
      --bg-color: #f8fafc;
    }
    
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: var(--bg-color);
      color: var(--text-color);
    }
    
    .header {
      background-color: var(--primary-color);
      color: white;
      padding: 2rem 1rem;
      text-align: center;
    }
    
    .header-title {
      font-size: 2rem;
      font-weight: bold;
      margin: 0;
    }
    
    .header-subtitle {
      font-size: 1rem;
      margin: 0.5rem 0 0 0;
      opacity: 0.9;
    }
    
    .status-bar {
      background: white;
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: center;
      gap: 2rem;
    }
    
    .status-item {
      text-align: center;
    }
    
    .status-number {
      font-size: 2rem;
      font-weight: bold;
      display: block;
    }
    
    .status-item.passed .status-number {
      color: var(--success-color);
    }
    
    .status-item.failed .status-number {
      color: var(--error-color);
    }
    
    .status-item.total .status-number {
      color: var(--primary-color);
    }
    
    .content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    
    .search-container {
      margin-bottom: 2rem;
    }
    
    .search-input {
      width: 100%;
      max-width: 400px;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 1rem;
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .modal-content {
      background: white;
      border-radius: 0.5rem;
      overflow: hidden;
      width: 90%;
      max-width: 1000px;
      max-height: 90%;
      overflow-y: auto;
    }
    
    .modal-header {
      padding: 1rem;
      background: var(--primary-color);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-title {
      font-size: 1.25rem;
      font-weight: bold;
    }
    
    .modal-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
    }
    
    .modal-img-stack {
      padding: 1rem;
    }
    
    .modal-img-container {
      margin-bottom: 1rem;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .modal-img {
      width: 100%;
      display: block;
    }
    
    .image-type-label {
      padding: 0.5rem;
      background: #f8f9fa;
      font-weight: 600;
      text-align: center;
      color: var(--text-color);
    }
    
    .image-error {
      color: var(--error-color);
      text-align: center;
      padding: 1rem;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="header-title">Visual Regression Report</h1>
    <p class="header-subtitle">Generated on {{TIMESTAMP}} for {{USER_NAME}}</p>
  </div>
  
  <div class="status-bar">
    <div class="status-item total">
      <span class="status-number">{{TOTAL}}</span>
      <span>Total Tests</span>
    </div>
    <div class="status-item passed">
      <span class="status-number">{{PASSED}}</span>
      <span>Passed</span>
    </div>
    <div class="status-item failed">
      <span class="status-number">{{FAILED}}</span>
      <span>Failed</span>
    </div>
  </div>
  
  <div class="content">
    <div class="search-container">
      <input id="searchInput" type="text" placeholder="Search by page name..." class="search-input">
    </div>
    
    <div id="scenario-cards"></div>
  </div>
  
  <div class="modal-overlay" id="diffModal">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <div class="modal-title">Visual Comparison</div>
          <div id="modalPageName"></div>
        </div>
        <button class="modal-close" id="modalCloseBtn">&times;</button>
      </div>
      <div class="modal-img-stack" id="sideBySideView">
        <!-- Image containers will be injected by JavaScript -->
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function getEnhancedTemplate() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Report</title>
  <style>
    :root {
      --primary-color: #2563eb;
      --primary-hover: #1d4ed8;
      --success-color: #22c55e;
      --error-color: #ef4444;
      --text-color: #1e293b;
      --text-light: #64748b;
      --border-color: #e2e8f0;
      --bg-color: #f8fafc;
    }
    
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: var(--bg-color);
      color: var(--text-color);
    }
    
    .header {
      background-color: var(--primary-color);
      color: white;
      padding: 2rem 1rem;
      text-align: center;
    }
    
    .header-title {
      font-size: 2rem;
      font-weight: bold;
      margin: 0;
    }
    
    .header-subtitle {
      font-size: 1rem;
      margin: 0.5rem 0 0 0;
      opacity: 0.9;
    }
    
    .status-bar {
      background: white;
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: center;
      gap: 2rem;
    }
    
    .status-item {
      text-align: center;
    }
    
    .status-number {
      font-size: 2rem;
      font-weight: bold;
      display: block;
    }
    
    .status-item.passed .status-number {
      color: var(--success-color);
    }
    
    .status-item.failed .status-number {
      color: var(--error-color);
    }
    
    .status-item.total .status-number {
      color: var(--primary-color);
    }
    
    .content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    
    .search-container {
      margin-bottom: 2rem;
    }
    
    .search-input {
      width: 100%;
      max-width: 400px;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 1rem;
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .modal-content {
      background: white;
      border-radius: 0.5rem;
      overflow: hidden;
      width: 90%;
      max-width: 1000px;
      max-height: 90%;
      overflow-y: auto;
    }
    
    .modal-header {
      padding: 1rem;
      background: var(--primary-color);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-title {
      font-size: 1.25rem;
      font-weight: bold;
    }
    
    .modal-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
    }
    
    .modal-img-stack {
      padding: 1rem;
    }
    
    .modal-img-container {
      margin-bottom: 1rem;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .modal-img {
      width: 100%;
      display: block;
    }
    
    .image-type-label {
      padding: 0.5rem;
      background: #f8f9fa;
      font-weight: 600;
      text-align: center;
      color: var(--text-color);
    }
    
    .image-error {
      color: var(--error-color);
      text-align: center;
      padding: 1rem;
      font-weight: 500;
    }
    
    .scenario-card {
      background: white;
      border-radius: 8px;
      margin: 1rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .scenario-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .scenario-card.success {
      border-left: 4px solid var(--success-color);
    }
    
    .scenario-card.error {
      border-left: 4px solid var(--error-color);
    }
    
    .scenario-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
    }
    
    .scenario-info .scenario-title {
      font-weight: 600;
      font-size: 1.1rem;
      color: var(--text-color);
    }
    
    .scenario-info .scenario-subtitle {
      color: var(--text-light);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
    
    .scenario-status {
      text-align: right;
    }
    
    .status-icon {
      font-size: 1.5rem;
      margin-right: 0.5rem;
    }
    
    .scenario-card.success .status-icon {
      color: var(--success-color);
    }
    
    .scenario-card.error .status-icon {
      color: var(--error-color);
    }
    
    .status-text {
      font-weight: 600;
    }
    
    .mismatch-text {
      color: var(--error-color);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
    
    .scenario-details {
      padding: 0 1rem 1rem 1rem;
      background: #f8f9fa;
      border-top: 1px solid var(--border-color);
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 0.5rem 0;
    }
    
    .detail-label {
      color: var(--text-light);
    }
    
    .detail-value {
      font-weight: 600;
    }
    
    .action-buttons {
      margin-top: 1rem;
      display: flex;
      gap: 0.5rem;
    }
    
    .btn-primary {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.3s ease;
    }
    
    .btn-primary:hover {
      background: var(--primary-hover);
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .modal-content {
      background: white;
      border-radius: 0.5rem;
      overflow: hidden;
      width: 90%;
      max-width: 1000px;
      max-height: 90%;
      overflow-y: auto;
    }
    
    .modal-header {
      padding: 1rem;
      background: var(--primary-color);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-title {
      font-size: 1.25rem;
      font-weight: bold;
    }
    
    .modal-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
    }
    
    .modal-img-stack {
      padding: 1rem;
    }
    
    .modal-img-container {
      margin-bottom: 1rem;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .modal-img {
      width: 100%;
      display: block;
    }
    
    .image-type-label {
      padding: 0.5rem;
      background: #f8f9fa;
      font-weight: 600;
      text-align: center;
      color: var(--text-color);
    }
    
    .image-error {
      color: var(--error-color);
      text-align: center;
      padding: 1rem;
      font-weight: 500;
    }
    
    .empty-state {
      text-align: center;
      color: var(--text-light);
      padding: 2rem;
      font-size: 1.125rem;
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    
    .detail-section {
      background: #fff;
      padding: 1rem;
      border-radius: 0.375rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .detail-section h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-color);
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 0.375rem;
    }
    
    .info-label {
      color: var(--text-light);
      font-weight: 500;
    }
    
    .info-value {
      color: var(--text-color);
      font-weight: 600;
    }
    
    .url-section {
      margin-top: 1rem;
    }
    
    .url-item {
      margin-bottom: 0.5rem;
    }
    
    .url-label {
      font-weight: 500;
      color: var(--text-light);
    }
    
    .url-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 600;
    }
    
    .url-link:hover {
      text-decoration: underline;
    }
    
    .mismatch-info {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .threshold-text {
      color: var(--text-light);
      font-size: 0.875rem;
    }
    
    .expand-icon {
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    
    .expanded .expand-icon {
      transform: rotate(180deg);
    }
    
    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      
      .header, .status-bar, .content {
        page-break-inside: avoid;
      }
      
      .scenario-card {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      .modal-overlay {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="header-title">Visual Regression Report</h1>
    <p class="header-subtitle">Generated on {{TIMESTAMP}} for {{USER_NAME}}</p>
  </div>
  
  <div class="status-bar">
    <div class="status-item total">
      <span class="status-number">{{TOTAL}}</span>
      <span>Total Tests</span>
    </div>
    <div class="status-item passed">
      <span class="status-number">{{PASSED}}</span>
      <span>Passed</span>
    </div>
    <div class="status-item failed">
      <span class="status-number">{{FAILED}}</span>
      <span>Failed</span>
    </div>
  </div>
  
  <div class="content">
    <div class="search-container">
      <input id="searchInput" type="text" placeholder="Search by page name..." class="search-input">
    </div>
    
    <div id="scenario-cards"></div>
  </div>
  
  <div class="modal-overlay" id="diffModal">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <div class="modal-title">Visual Comparison</div>
          <div id="modalPageName"></div>
        </div>
        <button class="modal-close" id="modalCloseBtn">&times;</button>
      </div>
      <div class="modal-img-stack" id="sideBySideView">
        <!-- Image containers will be injected by JavaScript -->
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = { generateVisualReport };