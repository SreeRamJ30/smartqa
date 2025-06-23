const express = require('express');
const cors = require('cors');
const auth = require('./auth'); // Import our authentication module
const { runDomTests } = require('./DOM/domCompare'); // Import our DOM comparison module from DOM directory
const { runVisualTests } = require('./VISUAL/visualCompare'); // Import our visual comparison module from VISUAL directory
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const domReportGenerator = require('./DOM/domReportGenerator');
const { generateCombinedReport } = require('./reports/combinedReportGenerator');
const { getActivities, addActivity } = require('./activityLog');


const app = express();
const port = 3001; // You can choose any port that's not in use

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// Serve static files from the reports directory
app.use('/reports', express.static(path.resolve(__dirname, './reports')));
// Serve static files from DOM reports directory
app.use('/dom-reports', express.static(path.resolve(__dirname, './DOM/reports')));
// Serve static files from VISUAL reports directory  
app.use('/visual-reports', express.static(path.resolve(__dirname, './VISUAL/reports')));
// Serve static files from reports/DOM directory for sitemap DOM tests
app.use('/reports/DOM', express.static(path.resolve(__dirname, './reports/DOM')));
// Serve static files from reports/Visual directory for sitemap Visual tests
app.use('/reports/Visual', express.static(path.resolve(__dirname, './reports/Visual')));
// Serve VISUAL backstop data for regular visual tests
app.use('/VISUAL', express.static(path.resolve(__dirname, './VISUAL')));
// Serve VISUAL backstop data for combined tests separately
app.use('/VISUAL/combined', express.static(path.resolve(__dirname, './VISUAL/combined')));
// Serve static files from reports/backstop_data for combined BackstopJS assets
app.use('/reports/backstop_data', express.static(path.resolve(__dirname, './reports/backstop_data')));

// A simple test route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the Backend!' });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  const user = auth.authenticateUser(email, password);
  
  if (user) {
    return res.json({
      message: 'Login successful',
      user
    });
  } else {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
});

// Registration endpoint
app.post('/api/register', (req, res) => {
  const { email, password, fullName } = req.body;
  
  if (!email || !password || !fullName) {
    return res.status(400).json({ message: 'Email, password and full name are required' });
  }
  
  const user = auth.registerUser({ email, password, fullName });
  
  if (user) {
    return res.status(201).json({
      message: 'Registration successful',
      user
    });
  } else {
    return res.status(409).json({ message: 'User with this email already exists' });
  }
});

// DOM Testing endpoint
app.post('/api/test/dom', async (req, res) => {
  try {
    const { testingSitemap, referenceSitemap, user, fromFrontend } = req.body;
    
    if (!testingSitemap || !referenceSitemap) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both testing and reference sitemaps are required' 
      });
    }
    
    console.log('Starting DOM comparison test...');
    console.log('User information received:', user ? JSON.stringify(user) : 'No user information');
    
    // Ensure we have user information even if it wasn't passed
    const testUser = user || { 
      email: 'system@automation.com', 
      fullName: 'System Automation' 
    };
    
    // --- DOM Running Lock ---
    const domLockPath = path.resolve(__dirname, './DOM/reports/dom-running.lock');
    try { await fs.writeFile(domLockPath, 'running'); } catch {}
    // ---
    let result;
    try {
      // Pass the user object to the runDomTests function
      result = await runDomTests(testingSitemap, referenceSitemap, testUser, { fromFrontend });
    } finally {
      // Remove lock file after test completes (success or fail)
      try { await fs.unlink(domLockPath); } catch {}
    }
    if (result.success) {
      // Log activity for DOM test
      await addActivity({
        id: Date.now(),
        type: result.success ? 'success' : 'error',
        message: result.success
          ? `DOM Test completed by ${testUser.fullName || testUser.email}`
          : `DOM Test failed by ${testUser.fullName || testUser.email}`,
        time: new Date().toLocaleString(),
        user: testUser
      });
      return res.json({
        success: true,
        message: 'DOM testing completed successfully',
        report: result.summary,
        reportPath: result.reportPath,
        testId: result.testId,
        user: result.user
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'DOM testing failed',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error in DOM testing endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during DOM testing',
      error: error.message 
    });
  }
});

// Get list of DOM test reports (with optional source filter)
app.get('/api/reports/dom', async (req, res) => {
  try {
    let reportsDir;
    
    // Determine which directory to search based on source filter
    if (req.query.source === 'sitemap') {
      // Sitemap tests are stored in main reports directory
      reportsDir = path.resolve(__dirname, './reports');
    } else if (req.query.source === 'domtests') {
      // DOM tests are stored in DOM/reports directory
      reportsDir = path.resolve(__dirname, './DOM/reports');
    } else {
      // If no source specified, check both directories
      const sitemapReports = await getDomReportsFromDirectory(path.resolve(__dirname, './reports'), 'sitemap');
      const domTestReports = await getDomReportsFromDirectory(path.resolve(__dirname, './DOM/reports'), 'domtests');
      const allReports = [...sitemapReports, ...domTestReports];
      allReports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return res.json({ reports: allReports });
    }
    
    // Get reports from specific directory
    const reports = await getDomReportsFromDirectory(reportsDir, req.query.source);
    reports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return res.json({ reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching DOM reports', error: error.message });
  }
});

// Helper function to get DOM reports from a specific directory
async function getDomReportsFromDirectory(reportsDir, testSource) {
  try {
    await fs.access(reportsDir);
  } catch (error) {
    return []; // Directory doesn't exist, return empty array
  }
  
  const files = await fs.readdir(reportsDir);
  
  const domReports = files
    .filter(file => file.startsWith('dom-test-report-') && file.endsWith('.json'))
    .map(async file => {
      // Extract timestamp and testId from filename
      const filenameParts = file.replace('dom-test-report-', '').replace('.json', '').split('-');
      let testId = filenameParts.pop(); // Last part is the testId
      const timestamp = filenameParts.join('-'); // Rejoin the rest as timestamp
      let userInfo = null;
      let fromFrontend = false;
      
      // Try to read the report to get the ID, user info, and source from content
      try {
        const reportPath = path.resolve(reportsDir, file);
        const content = await fs.readFile(reportPath, 'utf8');
        const reportData = JSON.parse(content);
        if (reportData.id) testId = reportData.id;
        if (reportData.user) userInfo = reportData.user;
        if (reportData.fromFrontend !== undefined) fromFrontend = reportData.fromFrontend;
      } catch (err) {
        // Continue with the ID extracted from filename
      }
      
      return {
        id: file,
        testId,
        timestamp,
        user: userInfo,
        fromFrontend,
        testSource: testSource || (fromFrontend ? 'domtests' : 'sitemap'),
        path: `/api/reports/dom/${file}`
      };
    });
    
  return await Promise.all(domReports);
}

// Get a specific DOM test report by ID
app.get('/api/reports/dom/:reportId', async (req, res) => {
  try {
    const reportId = req.params.reportId;
    
    // Updated regex to allow for user IDs in filenames
    if (!reportId.match(/^dom-test-report-.*\.json$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format'
      });
    }
    
    // Try to find the report in both possible directories
    const possiblePaths = [
      path.resolve(__dirname, './reports', reportId), // Sitemap reports
      path.resolve(__dirname, './DOM/reports', reportId) // DOM test reports
    ];
    
    let reportPath = null;
    for (const possiblePath of possiblePaths) {
      try {
        await fs.access(possiblePath);
        reportPath = possiblePath;
        break;
      } catch (error) {
        // Continue checking other paths
      }
    }
    
    if (!reportPath) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Read and parse report
    const reportContent = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportContent);
    
    return res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error(`Error fetching report ${req.params.reportId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching report',
      error: error.message
    });
  }
});

// Endpoint to get all DOM test reports
app.get('/api/test/dom/reports', async (req, res) => {
  try {
    const reportsDir = path.resolve(__dirname, './reports');
    
    // Check if reports directory exists
    try {
      await fs.access(reportsDir);
    } catch (error) {
      return res.json({ success: true, reports: [] });
    }
    
    // Get all files in the reports directory
    const files = await fs.readdir(reportsDir);
    
    const domReports = files
      .filter(file => file.startsWith('dom-test-report-') && file.endsWith('.json'))
      .map(async file => {
        // Extract timestamp and testId from filename
        const filenameParts = file.replace('dom-test-report-', '').replace('.json', '').split('-');
        let testId = filenameParts.pop(); // Last part is the testId
        const timestamp = filenameParts.join('-'); // Rejoin the rest as timestamp
        
        let userInfo = null;
        
        // Try to read the report to get the ID and user info from content
        try {
          const reportPath = path.resolve(reportsDir, file);
          const content = await fs.readFile(reportPath, 'utf8');
          const reportData = JSON.parse(content);
          
          // Use ID from file content if available
          if (reportData.id) {
            testId = reportData.id;
          }
          
          // Extract user information if available
          if (reportData.user) {
            userInfo = reportData.user;
          }
        } catch (err) {
          console.error(`Error reading report file ${file}:`, err);
          // Continue with the ID extracted from filename
        }
        
        return {
          id: file,
          testId: testId,
          filename: file,
          timestamp: timestamp,
          date: timestamp, // Keeping this for backward compatibility
          user: userInfo,
          path: `/api/reports/dom/${file}`
        };
      });
      
    // Wait for all async file reads to complete
    const resolvedReports = await Promise.all(domReports);
    
    // Sort by timestamp, newest first
    resolvedReports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    res.json({ success: true, reports: resolvedReports });
  } catch (error) {
    console.error('Error reading reports directory:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve DOM test reports' });
  }
});

// Endpoint to get a specific DOM test report
app.get('/api/test/dom/reports/:reportId', async (req, res) => {
  try {
    const reportId = req.params.reportId;
    
    // Updated regex to allow for user IDs in filenames
    if (!reportId.match(/^dom-test-report-.*\.json$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format'
      });
    }
    
    const reportPath = path.resolve(__dirname, './reports', reportId);
    
    try {
      // Check if report exists
      await fs.access(reportPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Read and parse report
    const reportContent = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportContent);
    
    res.json({ success: true, report: report });
  } catch (error) {
    console.error('Error reading report file:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve DOM test report' });
  }
});

// Endpoint to download a report file
app.get('/api/reports/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security validation - only allow downloading HTML report files
    if (!filename.match(/^dom-test-html-report-.*\.html$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report filename format'
      });
    }
    
    const filePath = path.resolve(__dirname, './reports', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Report file not found'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Send the file
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error downloading report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error downloading report',
      error: error.message
    });
  }
});

// Combined Testing endpoint (DOM first, then Visual) - ONLY for sitemap screen
app.post('/api/test/combined', async (req, res) => {
  try {
    const { testingSitemap, referenceSitemap, viewports, threshold, hideSelectors, captureDelay, user, fromFrontend } = req.body;
    
    if (!testingSitemap || !referenceSitemap) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both testing and reference sitemaps are required' 
      });
    }
    
    console.log('Starting combined DOM and Visual testing via SITEMAP screen...');
    console.log('User information received:', user ? JSON.stringify(user) : 'No user information');
    
    // Ensure we have user information even if it wasn't passed
    const testUser = user || { 
      email: 'system@automation.com', 
      fullName: 'System Automation' 
    };
    
    // Set default visual testing parameters if not provided
    const testViewports = viewports || [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];
    
    const testThreshold = threshold || 0.1;
    const testHideSelectors = hideSelectors || [];
    const testCaptureDelay = captureDelay || 2000;
    
    // Generate a single shared test ID for the combined test run - ONLY for sitemap tests
    const crypto = require('crypto');
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const userId = testUser?.email?.split('@')[0] || testUser?.fullName?.replace(/\s+/g, '') || 'anonymous';
    const randomId = crypto.randomBytes(6).toString('hex');
    const sharedTestId = `${userId}-${randomId}`;
    
    console.log(`Generated shared test ID for SITEMAP combined run: ${sharedTestId}`);
    
    // --- Combined Running Lock ---
    const combinedLockPath = path.resolve(__dirname, './reports/CombinedReport/combined-running.lock');
    try { await fs.writeFile(combinedLockPath, 'running'); } catch {}
    // ---
    let combinedResult = {
      success: false,
      domResult: null,
      visualResult: null,
      testId: sharedTestId, // Use the shared test ID
      user: testUser,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Step 1: Run DOM tests first with shared test ID - ONLY for combined sitemap tests
      console.log('Running DOM tests for SITEMAP...');
      const domResult = await runDomTests(testingSitemap, referenceSitemap, testUser, { 
        fromFrontend: false, // This is NOT from frontend DOM Tests page
        isCombinedTest: true, // This IS a combined sitemap test
        sharedTestId: sharedTestId // Pass the shared test ID
      });
      combinedResult.domResult = domResult;
      
      if (!domResult.success) {
        console.error('DOM testing failed:', domResult.error);
        combinedResult.error = `DOM testing failed: ${domResult.error}`;
        return res.status(500).json(combinedResult);
      }
      
      console.log('DOM tests completed successfully');
      
      // Step 2: Run Visual tests after DOM tests complete with shared test ID - ONLY for combined sitemap tests
      console.log('Running Visual tests for SITEMAP...');
      const visualResult = await runVisualTests({
        testingSitemap,
        referenceSitemap,
        viewports: testViewports,
        threshold: testThreshold,
        hideSelectors: testHideSelectors,
        captureDelay: testCaptureDelay,
        user: testUser,
        isCombinedTest: true, // This IS a combined sitemap test
        sharedTestId: sharedTestId, // Pass the shared test ID
        backstopDataDir: path.resolve(__dirname, './reports/backstop_data') // Use reports/backstop_data for combined only
      });
      
      combinedResult.visualResult = visualResult;
      
      if (!visualResult.success) {
        console.error('Visual testing failed:', visualResult.error);
        combinedResult.error = `Visual testing failed: ${visualResult.error}`;
        return res.status(500).json(combinedResult);
      }
      
      console.log('Visual tests completed successfully');
      
      // Step 3: Get the full DOM report data
      let domReportData = null;
      
      // For combined tests, the DOM result should already include the report data
      if (domResult.report) {
        // Report data is already available from the DOM test
        domReportData = domResult.report;
      } else if (domResult.reportPath) {
        // Fallback: read from file if reportPath is available
        try {
          const domReportContent = await fs.readFile(domResult.reportPath, 'utf8');
          domReportData = JSON.parse(domReportContent);
        } catch (error) {
          console.error('Error reading DOM report:', error);
        }
      }
      
      // Step 4: Get the full Visual report data
      let visualReportData = null;
      
      if (visualResult.report) {
        // Visual report data is already available
        visualReportData = visualResult.report;
      } else if (visualResult.jsonPath) {
        // Read from the BackstopJS JSON report
        try {
          const visualReportContent = await fs.readFile(visualResult.jsonPath, 'utf8');
          visualReportData = JSON.parse(visualReportContent);
        } catch (error) {
          console.error('Error reading Visual report:', error);
        }
      }
      
      const combinedReportData = {
        id: combinedResult.testId,
        timestamp: combinedResult.timestamp,
        user: testUser,
        testType: 'combined',
        domResult: {
          success: domResult.success,
          summary: domResult.summary,
          reportPath: domResult.reportPath,
          testId: domResult.testId,
          // Include the full DOM report data for frontend display
          report: domReportData ? {
            results: domReportData.results || [],
            totalTests: domReportData.totalTests,
            passedTests: domReportData.passedTests,
            failedTests: domReportData.failedTests,
            user: domReportData.user,
            environment: domReportData.environment,
            executionTimeMs: domReportData.executionTimeMs
          } : null
        },
        visualResult: {
          success: visualResult.success,
          summary: visualResult.summary,
          reportPath: visualResult.reportPath,
          jsonPath: visualResult.jsonPath,
          testId: visualResult.testId,
          hasVisualDifferences: visualResult.hasVisualDifferences,
          failures: visualResult.failures || [],
          // Include visual report data if available
          report: visualReportData ? {
            tests: visualReportData.results || visualReportData.tests || [],
            summary: visualReportData.summary || {},
            testSuite: visualReportData.testSuite || 'BackstopJS'
          } : null
        },
        overallStatus: domResult.success && visualResult.success ? 'COMPLETED' : 'COMPLETED_WITH_ISSUES',
        testingSitemap,
        referenceSitemap
      };
      
      // Save combined report
      const reportsDir = path.resolve(__dirname, './reports');
      const domReportsDir = path.resolve(__dirname, './reports/DOM');
      const visualReportsDir = path.resolve(__dirname, './reports/Visual');
      
      // Create all necessary directories
      try {
        await fs.access(reportsDir);
      } catch (error) {
        await fs.mkdir(reportsDir, { recursive: true });
      }
      
      try {
        await fs.access(domReportsDir);
      } catch (error) {
        await fs.mkdir(domReportsDir, { recursive: true });
      }
      
      try {
        await fs.access(visualReportsDir);
      } catch (error) {
        await fs.mkdir(visualReportsDir, { recursive: true });
      }
      
      // Save individual DOM report in reports/DOM/ directory for sitemap tests
      if (domReportData) {
        const domReportPath = path.join(domReportsDir, `dom-test-report-${combinedResult.timestamp.replace(/[:.]/g, '-')}-${testUser.fullName?.replace(/\s+/g, '') || 'user'}.json`);
        await fs.writeFile(domReportPath, JSON.stringify(domReportData, null, 2));
        console.log(`DOM report saved to: ${domReportPath}`);
      }
      
      // Save individual Visual report in reports/Visual/ directory for sitemap tests
      if (visualReportData) {
        const visualReportPath = path.join(visualReportsDir, `visual-test-report-${combinedResult.timestamp.replace(/[:.]/g, '-')}-${testUser.fullName?.replace(/\s+/g, '') || 'user'}.json`);
        await fs.writeFile(visualReportPath, JSON.stringify(visualReportData, null, 2));
        console.log(`Visual report saved to: ${visualReportPath}`);
      }
      
      // Save combined report in reports/CombinedReport/ directory
      const combinedReportsDir = path.resolve(__dirname, './reports/CombinedReport');
      try {
        await fs.access(combinedReportsDir);
      } catch (error) {
        await fs.mkdir(combinedReportsDir, { recursive: true });
      }
      const combinedReportPath = path.join(combinedReportsDir, `combined-test-report-${combinedResult.timestamp.replace(/[:.]/g, '-')}-${testUser.fullName?.replace(/\s+/g, '') || 'user'}.json`);
      await fs.writeFile(combinedReportPath, JSON.stringify(combinedReportData, null, 2));
      
      // Save BackstopJS raw report in CombinedReport directory for combined tests
      if (visualResult.jsonPath) {
        try {
          const backstopJsonSource = path.resolve(__dirname, '../reports/backstop_data/json_report/jsonReport.json');
          const backstopJsonDest = path.join(combinedReportsDir, `backstopjs-report-${combinedResult.timestamp.replace(/[:.]/g, '-')}-${testUser.fullName?.replace(/\s+/g, '') || 'user'}.json`);
          await fs.copyFile(backstopJsonSource, backstopJsonDest);
          console.log(`BackstopJS raw report copied to: ${backstopJsonDest}`);
        } catch (err) {
          console.error('Failed to copy BackstopJS raw report:', err);
        }
      }
      
      combinedResult.success = true;
      combinedResult.message = 'Combined DOM and Visual testing completed successfully';
      combinedResult.reportPath = combinedReportPath;
      combinedResult.summary = {
        domSummary: domResult.summary,
        visualSummary: visualResult.summary,
        overallStatus: combinedReportData.overallStatus,
        executionTime: {
          domTime: domResult.summary?.executionTimeMs || 0,
          visualTime: visualResult.summary?.executionTimeMs || 0,
          totalTime: (domResult.summary?.executionTimeMs || 0) + (visualResult.summary?.executionTimeMs || 0)
        }
      };
      
      // Log activity for Visual test
      await addActivity({
        id: Date.now(),
        type: visualResult.success ? 'success' : 'error',
        message: visualResult.success
          ? `Combined Test completed by ${testUser.fullName || testUser.email}`
          : `Combined Test failed by ${testUser.fullName || testUser.email}`,
        time: new Date().toLocaleString(),
        user: testUser,
        testType: 'Combined'
      });
      
      return res.json(combinedResult);
      
    } catch (error) {
      console.error('Error during combined testing:', error);
      combinedResult.error = error.message;
      return res.status(500).json(combinedResult);
    } finally {
      // Remove lock file after test completes (success or fail)
      try { await fs.unlink(combinedLockPath); } catch {}
    }
    
  } catch (error) {
    console.error('Error in combined testing endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during combined testing',
      error: error.message 
    });
  }
});

// Get list of combined test reports
app.get('/api/reports/combined', async (req, res) => {
  try {
    const combinedReportsDir = path.resolve(__dirname, './reports/CombinedReport');
    // Check if combined reports directory exists
    try {
      await fs.access(combinedReportsDir);
    } catch (error) {
      return res.json({ reports: [] });
    }
    // Get all files in the combined reports directory
    const files = await fs.readdir(combinedReportsDir);
    // Filter for combined test reports
    const combinedReports = files
      .filter(file => file.startsWith('combined-test-report-') && file.endsWith('.json'))
      .map(async file => {
        // Extract timestamp and testId from filename
        const filenameParts = file.replace('combined-test-report-', '').replace('.json', '').split('-');
        let testId = filenameParts.pop(); // Last part is the testId/user
        const timestamp = filenameParts.join('-'); // Rejoin the rest as timestamp
        let userInfo = null;
        let summary = null;
        // Try to read the report to get the ID and user info from content
        try {
          const reportPath = path.resolve(combinedReportsDir, file);
          const content = await fs.readFile(reportPath, 'utf8');
          const reportData = JSON.parse(content);
          if (reportData.id) {
            testId = reportData.id;
          }
          if (reportData.user) {
            userInfo = reportData.user;
          }
          if (reportData.domResult || reportData.visualResult) {
            summary = {
              domSummary: reportData.domResult?.summary,
              visualSummary: reportData.visualResult?.summary,
              overallStatus: reportData.overallStatus
            };
          }
        } catch (err) {
          console.error(`Error reading report file ${file}:`, err);
        }
        return {
          id: file,
          testId: testId,
          timestamp: timestamp,
          user: userInfo,
          summary: summary,
          testType: 'combined',
          path: `/api/reports/combined/${file}`
        };
      });
    const resolvedReports = await Promise.all(combinedReports);
    resolvedReports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return res.json({ reports: resolvedReports });
  } catch (error) {
    console.error('Error fetching combined reports:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error fetching combined reports',
      error: error.message 
    });
  }
});

// Get a specific combined test report by ID
app.get('/api/reports/combined/:reportId', async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const combinedReportsDir = path.resolve(__dirname, './reports/CombinedReport');
    let reportPath = null;
    if (reportId.match(/^combined-test-report-.*\.json$/)) {
      const directPath = path.resolve(combinedReportsDir, reportId);
      try {
        await fs.access(directPath);
        reportPath = directPath;
      } catch (error) {
        // File doesn't exist, continue to search by ID
      }
    }
    if (!reportPath) {
      try {
        const files = await fs.readdir(combinedReportsDir);
        const combinedFiles = files.filter(file => 
          file.startsWith('combined-test-report-') && file.endsWith('.json')
        );
        for (const file of combinedFiles) {
          try {
            const filePath = path.resolve(combinedReportsDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const reportData = JSON.parse(content);
            if (reportData.id === reportId) {
              reportPath = filePath;
              break;
            }
          } catch (err) {
            continue;
          }
        }
      } catch (error) {
        // Directory doesn't exist or can't be read
      }
    }
    if (!reportPath) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    const reportContent = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportContent);
    return res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error(`Error fetching combined report ${req.params.reportId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching combined report',
      error: error.message
    });
  }
});

// Visual Testing endpoint
app.post('/api/test/visual', async (req, res) => {
  try {
    const { 
      testingUrl, 
      referenceUrl, 
      testingSitemap, 
      referenceSitemap, 
      viewports,
      threshold,
      hideSelectors,
      captureDelay,
      user 
    } = req.body;
    
    // Validate inputs
    const hasSingleUrlPair = testingUrl && referenceUrl;
    const hasSitemapPair = testingSitemap && referenceSitemap;
    
    if (!hasSingleUrlPair && !hasSitemapPair) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either URL pairs or sitemap pairs are required' 
      });
    }
    
    if (!viewports || viewports.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one viewport is required'
      });
    }
    
    console.log('Starting visual regression test...');
    console.log('User information received:', user ? JSON.stringify(user) : 'No user information');
    
    // Ensure we have user information even if it wasn't passed
    const testUser = user || { 
      email: 'system@automation.com', 
      fullName: 'System Automation' 
    };
    
    // --- Visual Running Lock ---
    const visualLockPath = path.resolve(__dirname, './VISUAL/reports/visual-running.lock');
    try { await fs.writeFile(visualLockPath, 'running'); } catch {}
    // ---
    let result;
    try {
      // Run the visual tests
      result = await runVisualTests({
        testingUrl,
        referenceUrl,
        testingSitemap,
        referenceSitemap,
        viewports,
        threshold,
        hideSelectors,
        captureDelay,
        user: testUser
      });
    } finally {
      // Remove lock file after test completes (success or fail)
      try { await fs.unlink(visualLockPath); } catch {}
    }
    // Handle the response based on the test completion status
    if (result.success) {
      // Visual testing completed successfully (even if differences were found)
      const responseData = {
        success: true,
        message: result.message || 'Visual testing completed successfully',
        report: result.summary,
        reportPath: result.reportPath,
        jsonPath: result.jsonPath,
        testId: result.testId,
        user: result.user,
        testStatus: result.testStatus,
        hasVisualDifferences: result.hasVisualDifferences,
        failures: result.failures || [],
      };
      return res.json(responseData);
    } else {
      // Actual error occurred during testing process
      return res.status(500).json({
        success: false,
        message: result.message || 'Visual testing process failed',
        error: result.error,
        testStatus: 'ERROR'
      });
    }
  } catch (error) {
    console.error('Error in visual testing endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during visual testing',
      error: error.message,
      testStatus: 'ERROR'
    });
  }
});

// Get list of visual test reports
app.get('/api/reports/visual', async (req, res) => {
  try {
    const reportsDir = path.resolve(__dirname, './VISUAL/reports');
    
    // Check if reports directory exists
    try {
      await fs.access(reportsDir);
    } catch (error) {
      return res.json({ reports: [] });
    }
    
    // Get all files in the reports directory
    const files = await fs.readdir(reportsDir);
    
    // Filter for visual test reports
    const visualReports = files
      .filter(file => file.startsWith('visual-test-report-') && file.endsWith('.json'))
      .map(async file => {
        // Extract timestamp and testId from filename
        const filenameParts = file.replace('visual-test-report-', '').replace('.json', '').split('-');
        let testId = filenameParts.pop(); // Last part is the testId
        const timestamp = filenameParts.join('-'); // Rejoin the rest as timestamp
        
        let userInfo = null;
        let summary = null;
        
        // Try to read the report to get the ID and user info from content
        try {
          const reportPath = path.resolve(reportsDir, file);
          const content = await fs.readFile(reportPath, 'utf8');
          const reportData = JSON.parse(content);
          
          // Use ID from file content if available
          if (reportData.id) {
            testId = reportData.id;
          }
          
          // Extract user information if available
          if (reportData.user) {
            userInfo = reportData.user;
          }
          
          // Extract summary information
          if (reportData.summary) {
            summary = reportData.summary;
          }
        } catch (err) {
          console.error(`Error reading report file ${file}:`, err);
          // Continue with the ID extracted from filename
        }
        
        return {
          id: file,
          testId: testId,
          timestamp: timestamp,
          user: userInfo,
          summary: summary,
          path: `/api/reports/visual/${file}`
        };
      });
    
    // Wait for all async file reads to complete
    const resolvedReports = await Promise.all(visualReports);
    
    // Sort by timestamp, newest first
    resolvedReports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    return res.json({ reports: resolvedReports });
  } catch (error) {
    console.error('Error fetching visual reports:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error fetching visual reports',
      error: error.message 
    });
  }
});

// Get a specific visual test report by ID
app.get('/api/reports/visual/:reportId', async (req, res) => {
  try {
    const reportId = req.params.reportId;
    
    // Validate report ID format
    if (!reportId.match(/^visual-test-report-.*\.json$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format'
      });
    }
    
    const reportPath = path.resolve(__dirname, './VISUAL/reports', reportId);
    
    try {
      // Check if report exists
      await fs.access(reportPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Read and parse report
    const reportContent = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportContent);
    
    return res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error(`Error fetching report ${req.params.reportId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching report',
      error: error.message
    });
  }
});

// Endpoint to fetch XML sitemaps from URLs (proxy to avoid CORS issues)
app.get('/api/fetch-sitemap', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL parameter is required' 
      });
    }

    console.log(`Fetching sitemap from URL: ${url}`);

    // Use node-fetch or axios to fetch the sitemap
    const fetch = require('node-fetch');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AutomationTestingBot/1.0; +http://example.com)'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Check if the response is XML
    if (contentType && !contentType.includes('xml')) {
      console.warn(`Warning: Content-Type is not XML: ${contentType}`);
    }
    
    const sitemapContent = await response.text();
    
    // Do a simple validation to check if it's likely XML
    if (!sitemapContent.includes('<?xml') && !sitemapContent.includes('<urlset')) {
      return res.status(400).json({
        success: false,
        message: 'The fetched content does not appear to be a valid sitemap'
      });
    }
    
    // Return the sitemap XML content
    res.header('Content-Type', 'application/xml');
    res.send(sitemapContent);
    
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Error fetching sitemap: ${error.message}` 
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});



app.post('/api/export-combined-report', async (req, res) => {
  try {
    // Find the latest combined, dom, and visual report files dynamically
    function getLatestFile(dir, prefix) {
      const files = fsSync.readdirSync(dir)
        .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
        .map(f => ({ name: f, time: fsSync.statSync(path.join(dir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);
        console.log(`Found ${files.length} files matching prefix "${prefix}" in directory "${dir}"`);
      return files.length > 0 ? path.join(dir, files[0].name) : null;
    }

    const combinedReportPath = getLatestFile(path.resolve(__dirname, './reports/CombinedReport'), 'combined-test-report');
    const domReportPath = getLatestFile(path.resolve(__dirname, './reports/DOM'), 'dom-test-report');
    const visualReportPath = getLatestFile(path.resolve(__dirname, './reports/Visual'), 'visual-test-report');

    if (!combinedReportPath || !domReportPath || !visualReportPath) {
      return res.status(404).json({ success: false, message: 'One or more report files not found.' });
    }

    // Read report data
    const combinedData = JSON.parse(await fs.readFile(combinedReportPath, 'utf8'));
    const domData = JSON.parse(await fs.readFile(domReportPath, 'utf8'));
    const visualData = JSON.parse(await fs.readFile(visualReportPath, 'utf8'));
    console.log('Combined, DOM, and Visual report data loaded successfully.');

    // Prepare reportData for generator
    const reportData = {
      ...combinedData,
      domResult: { ...combinedData.domResult, ...domData },
      visualResult: { ...combinedData.visualResult, ...visualData }
    };

    // Generate a unique HTML filename based on test/user ID
    const testId = combinedData.id || 'unknown';
    const userId = (combinedData.user && combinedData.user.fullName) ? combinedData.user.fullName.replace(/\s+/g, '') : 'user';
    const htmlFilename = `combined-test-html-report-${testId}.html`;
    const outputHtmlPath = path.resolve(__dirname, `./reports/CombinedReport/${htmlFilename}`);
    console.log('Generated HTML report path:', outputHtmlPath);
    await generateCombinedReport(reportData, outputHtmlPath);

    // Return the URL to the generated report
    const reportUrl = `/reports/CombinedReport/${htmlFilename}`;
    res.json({ success: true, url: reportUrl });
  } catch (error) {
    console.error('Error generating combined report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API endpoint to export/download a DOM HTML report by filename
app.get('/api/export/dom-report/:htmlReportId', async (req, res) => {
  try {
    const htmlReportId = req.params.htmlReportId;
    if (!htmlReportId.match(/^dom-test-html-report-.*\.html$/)) {
      return res.status(400).json({ success: false, message: 'Invalid HTML report filename' });
    }
    // Derive the JSON report filename from the HTML filename
    const jsonReportId = htmlReportId.replace('html-report', 'report').replace('.html', '.json');
    const jsonReportPath = path.resolve(__dirname, './DOM/reports', jsonReportId);
    const htmlReportPath = path.resolve(__dirname, './DOM/reports', htmlReportId);
    // Check if JSON report exists
    if (!fsSync.existsSync(jsonReportPath)) {
      return res.status(404).json({ success: false, message: 'Source JSON report not found' });
    }
    // Read comparison results from JSON
    const reportData = JSON.parse(fsSync.readFileSync(jsonReportPath, 'utf-8'));
    const comparisonResults = reportData.comparisonResults || reportData.results || [];
    // Generate HTML report on-demand
    const { generateDomReport } = require('./DOM/domReportGenerator');
    generateDomReport(comparisonResults, htmlReportPath);
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${htmlReportId}"`);
    res.setHeader('Content-Type', 'text/html');
    // Stream the file to the response
    fsSync.createReadStream(htmlReportPath).pipe(res);
  } catch (error) {
    console.error('Error exporting DOM HTML report:', error);
    return res.status(500).json({ success: false, message: 'Server error exporting HTML report', error: error.message });
  }
});

// API endpoint to export/generate a DOM HTML report and return its URL (POST)
app.post('/api/export/dom-report', async (req, res) => {
  try {
    let { reportId } = req.body;
    console.log('Exporting DOM HTML report for reportId:', reportId);
    if (!reportId) {
      return res.status(400).json({ success: false, message: 'Invalid or missing report ID' });
    }
    // If only the unique part is sent, find the full filename
    const domReportsDir = path.resolve(__dirname, './DOM/reports');
    if (!reportId.startsWith('dom-test-report-')) {
      // Find the file that ends with the given id
      const files = fsSync.readdirSync(domReportsDir);
      const match = files.find(f => f.startsWith('dom-test-report-') && f.endsWith(reportId));
      console.log('Matching report file found:', match);
      if (match) {
        reportId = match;
      } else {
        return res.status(404).json({ success: false, message: 'No matching report file found' });
      }
    }
    // Derive the HTML report filename from the JSON filename
    const htmlReportFileName = reportId.replace('dom-test-report-', 'dom-test-html-report-').replace('.json', '.html');
    const jsonReportPath = path.resolve(domReportsDir, reportId);
    const htmlReportPath = path.resolve(domReportsDir, htmlReportFileName);
    // Check if JSON report exists
    if (!fsSync.existsSync(jsonReportPath)) {
      return res.status(404).json({ success: false, message: 'Source JSON report not found' });
    }
    // Read comparison results from JSON
    const reportData = JSON.parse(fsSync.readFileSync(jsonReportPath, 'utf-8'));
    const comparisonResults = reportData.comparisonResults || reportData.results || [];
    console.log('Exporting DOM report:', {
      jsonReportPath,
      htmlReportPath,
      comparisonResultsLength: comparisonResults.length,
      keys: Object.keys(reportData)
    });
    // Generate HTML report on-demand
    const { generateDomReport } = require('./DOM/domReportGenerator');
    generateDomReport(comparisonResults, htmlReportPath);
    // Return the URL to the generated report
    const reportUrl = `/dom-reports/${htmlReportFileName}`;
    res.json({ success: true, url: reportUrl });
  } catch (error) {
    console.error('Error exporting DOM HTML report:', error);
    return res.status(500).json({ success: false, message: 'Server error exporting HTML report', error: error.message });
  }
});

// Utility to count JSON files in a directory
async function countJsonFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

// Utility to check if a test is running (by lock file)
async function isTestRunning(lockFile) {
  try {
    await fs.access(lockFile);
    return 1;
  } catch {
    return 0;
  }
}

// API to get test counts (running and completed)
app.get('/api/test-counts', async (req, res) => {
  const domDir = path.resolve(__dirname, './DOM/reports');
  const visualDir = path.resolve(__dirname, './VISUAL/reports');
  const combinedDir = path.resolve(__dirname, './reports/CombinedReport');

  const [domCompleted, visualCompleted, combinedCompleted] = await Promise.all([
    countJsonFiles(domDir),
    countJsonFiles(visualDir),
    countJsonFiles(combinedDir)
  ]);

  // For running, check for lock files (create/delete lock file in your test start/finish logic)
  const domRunning = await isTestRunning(path.join(domDir, 'dom-running.lock'));
  const visualRunning = await isTestRunning(path.join(visualDir, 'visual-running.lock'));
  const combinedRunning = await isTestRunning(path.join(combinedDir, 'combined-running.lock'));

  // Console log for debugging
  console.log('--- Test Status Counts ---');
  console.log(`DOM     | Running: ${domRunning} | Completed: ${domCompleted}`);
  console.log(`Visual  | Running: ${visualRunning} | Completed: ${visualCompleted}`);
  console.log(`Combined| Running: ${combinedRunning} | Completed: ${combinedCompleted}`);
  console.log('--------------------------');

  // Return counts
  res.json({
    dom: { running: domRunning, completed: domCompleted },
    visual: { running: visualRunning, completed: visualCompleted },
    combined: { running: combinedRunning, completed: combinedCompleted }
  });
});

// Get recent activities
app.get('/api/activity', async (req, res) => {
  try {
    const activities = await getActivities();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activities' });
  }
});

// Add a new activity (for backend use)
app.post('/api/activity', async (req, res) => {
  const { type, message, time } = req.body;
  if (!type || !message || !time) {
    return res.status(400).json({ message: 'type, message, and time are required' });
  }
  try {
    await addActivity({ type, message, time, id: Date.now() });
    res.status(201).json({ message: 'Activity added' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add activity' });
  }
});