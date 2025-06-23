const { remote } = require('webdriverio');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const crypto = require('crypto');
const jsdiff = require('diff');
const { generateDomReport } = require('./domReportGenerator');
const fsSync = require('fs');
const os = require('os');

// Function to generate a unique test ID with user reference
const generateTestId = (user) => {
  // Extract user identifier - use email or fullName or a combination
  // If no user info is provided, use 'system' as the default reference
  const userRef = user ? (user.email || user.fullName || 'anonymous').split('@')[0] : 'system';
  // Clean up the user reference to make it URL and filename-friendly
  const cleanUserRef = userRef.replace(/[^a-z0-9]/gi, '').toLowerCase();
  // Combine user reference with random bytes
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `${cleanUserRef}-${randomPart}`;
};

// Function to parse sitemap XML content
const parseSitemap = async (sitemapContent) => {
  const parser = new xml2js.Parser();
  try {
    const result = await parser.parseStringPromise(sitemapContent);
    if (result && result.urlset && result.urlset.url) {
      // Extract URLs from sitemap
      return result.urlset.url.map(urlObj => urlObj.loc[0]);
    }
    return [];
  } catch (error) {
    console.error('Error parsing sitemap:', error);
    return [];
  }
};

// Helper function to extract page name from URL
const getPageName = (url) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Get the last part of the path, or 'index' if it ends with /
    const lastPart = pathname.endsWith('/') ? 'index' : pathname.split('/').filter(Boolean).pop();
    return lastPart || urlObj.hostname || 'page';
  } catch (e) {
    // If URL parsing fails, use a fallback
    return url.split('/').pop() || 'page';
  }
};

// Function to generate a formatted HTML diff view
function generateHtmlDiffView(testingContent, referenceContent) {
  if (!testingContent || !referenceContent) {
    return '<div class="no-diff-data">No data available for diff visualization</div>';
  }

  // Convert to string if objects
  const testingString = typeof testingContent === 'string' ? 
    testingContent : 
    JSON.stringify(testingContent, null, 2);
  
  const referenceString = typeof referenceContent === 'string' ? 
    referenceContent : 
    JSON.stringify(referenceContent, null, 2);

  // Split into lines for comparison
  const testingLines = testingString.split('\n');
  const referenceLines = referenceString.split('\n');
  
  // Create a formatted diff view
  let diffHtml = '<div class="dom-diff-container">';
  
  // Simple line-by-line diff visualization
  const maxLen = Math.max(testingLines.length, referenceLines.length);
  
  for (let i = 0; i < maxLen; i++) {
    const testingLine = i < testingLines.length ? testingLines[i] : '';
    const referenceLine = i < referenceLines.length ? referenceLines[i] : '';
    
    if (testingLine !== referenceLine) {
      // Lines are different - show both with appropriate styling
      if (referenceLine) {
        diffHtml += formatDiffLine(referenceLine, true); // Removed line (red)
      }
      if (testingLine) {
        diffHtml += formatDiffLine(testingLine, false); // Added line (green)
      }
    } else {
      // Lines are the same - show as context
      diffHtml += `<div class="diff-context-line">${escapeHtml(testingLine)}</div>`;
    }
  }
  
  diffHtml += '</div>';
  return diffHtml;
}

// Helper function to format each line in the diff
function formatDiffLine(content, isRemoved) {
  if (!content) return '';
  
  const className = isRemoved ? 'diff-removed-line' : 'diff-added-line';
  const prefix = isRemoved ? '- ' : '+ ';
  
  return `<div class="${className}">${prefix}${escapeHtml(content)}</div>`;
}

// Helper function to escape HTML for safe display
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Compare two DOM structures and identify differences
 * @param {Object} testingDom - DOM structure from testing environment
 * @param {Object} referenceDom - DOM structure from reference environment
 * @returns {Object} Comparison results with differences
 */
function compareDomStructures(testingDom, referenceDom) {
  const startTime = Date.now();
  
  // Initialize result object
  const result = {
    status: 'PASS',
    differences: [],
    differencesCount: 0,
    executionTimeMs: 0,
    htmlDiffView: '' // New property for HTML visualization
  };

  try {
    // Generate HTML diff view
    result.htmlDiffView = generateHtmlDiffView(testingDom, referenceDom);
    
    // Basic string comparison of whole DOM structure
    const testingString = JSON.stringify(testingDom);
    const referenceString = JSON.stringify(referenceDom);
    
    if (testingString !== referenceString) {
      result.status = 'FAIL';
      
      // Find specific differences - this is a simple implementation
      // In production, you would want more sophisticated difference detection
      const differences = findDifferences(testingDom, referenceDom);
      result.differences = differences;
      result.differencesCount = differences.length;
    }
  } catch (error) {
    console.error('Error comparing DOM structures:', error);
    result.status = 'ERROR';
    result.error = error.message;
  }
  
  // Calculate execution time
  result.executionTimeMs = Date.now() - startTime;
  
  return result;
}

/**
 * Find differences between two DOM structures
 * @param {Object} testing - Testing DOM
 * @param {Object} reference - Reference DOM
 * @param {String} path - Current path in DOM tree
 * @returns {Array} Array of differences
 */
function findDifferences(testing, reference, path = '') {
  const differences = [];
  
  // If types are different, that's a difference
  if (typeof testing !== typeof reference) {
    differences.push({
      path,
      type: 'TYPE_DIFFERENT',
      testing: typeof testing,
      reference: typeof reference
    });
    return differences;
  }
  
  // If both are null or undefined, no difference
  if (testing === null || testing === undefined) {
    if (reference === null || reference === undefined) {
      return differences;
    }
    // If we reach here, one is null/undefined but not both
    differences.push({
      path,
      type: 'VALUE_DIFFERENT',
      testing: testing,
      reference: reference
    });
    return differences;
  }
  
  // For primitive types, do a direct comparison
  if (typeof testing !== 'object') {
    if (testing !== reference) {
      differences.push({
        path,
        type: 'VALUE_DIFFERENT',
        testing: testing,
        reference: reference
      });
    }
    return differences;
  }
  
  // For arrays, compare each element
  if (Array.isArray(testing) && Array.isArray(reference)) {
    // Different length is a difference
    if (testing.length !== reference.length) {
      differences.push({
        path,
        type: 'ARRAY_LENGTH_DIFFERENT',
        testing: testing.length,
        reference: reference.length
      });
    }
    
    // Compare each element
    const maxLength = Math.max(testing.length, reference.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < testing.length && i < reference.length) {
        differences.push(...findDifferences(testing[i], reference[i], `${path}[${i}]`));
      } else if (i < testing.length) {
        differences.push({
          path: `${path}[${i}]`,
          type: 'ARRAY_ELEMENT_MISSING_IN_REFERENCE',
          testing: testing[i],
          reference: undefined
        });
      } else {
        differences.push({
          path: `${path}[${i}]`,
          type: 'ARRAY_ELEMENT_MISSING_IN_TESTING',
          testing: undefined,
          reference: reference[i]
        });
      }
    }
    return differences;
  }
  
  // For objects, compare each property
  const testingKeys = Object.keys(testing);
  const referenceKeys = Object.keys(reference);
  
  // Find keys in testing but not in reference
  for (const key of testingKeys) {
    if (!referenceKeys.includes(key)) {
      differences.push({
        path: path ? `${path}.${key}` : key,
        type: 'PROPERTY_MISSING_IN_REFERENCE',
        testing: testing[key],
        reference: undefined
      });
    } else {
      // Key exists in both, compare values
      differences.push(...findDifferences(
        testing[key],
        reference[key],
        path ? `${path}.${key}` : key
      ));
    }
  }
  
  // Find keys in reference but not in testing
  for (const key of referenceKeys) {
    if (!testingKeys.includes(key)) {
      differences.push({
        path: path ? `${path}.${key}` : key,
        type: 'PROPERTY_MISSING_IN_TESTING',
        testing: undefined,
        reference: reference[key]
      });
    }
    // We already compared keys that exist in both
  }
  
  return differences;
}

/**
 * Main function to run DOM comparison tests
 */
const runDomTests = async (testingSitemapContent, referenceSitemapContent, user, options = {}) => {
  // Record start time for performance tracking
  const startTime = Date.now();
  
  // Parse sitemaps to get URLs
  const testingUrls = await parseSitemap(testingSitemapContent);
  const referenceUrls = await parseSitemap(referenceSitemapContent);
  
  // Validate URL counts
  if (testingUrls.length === 0 || referenceUrls.length === 0) {
    return {
      success: false,
      error: 'Invalid sitemaps or no URLs found',
      testingUrlCount: testingUrls.length,
      referenceUrlCount: referenceUrls.length
    };
  }
  
  if (testingUrls.length !== referenceUrls.length) {
    console.warn(`Warning: Different number of URLs in sitemaps. Testing: ${testingUrls.length}, Reference: ${referenceUrls.length}`);
  }
  
  // Generate a unique test ID with user reference, or use shared test ID if provided
  const testId = options.sharedTestId || generateTestId(user);
  
  console.log(`Using test ID: ${testId}${options.sharedTestId ? ' (shared from combined test)' : ' (generated)'}`);
  
  // Array to store comparison results
  const results = [];
  
  // Maximum number of URLs to test (for limiting testing)
  const maxUrlsToTest = Math.min(testingUrls.length, referenceUrls.length);
  let totalDiffs = 0;
  
  // Determine output directory based on test source
  let reportBaseDir;
  if (options.fromFrontend) {
    // DOM Tests go to DOM/reports directory
    reportBaseDir = path.resolve(__dirname, './reports');
  } else {
    // Sitemap tests go to main reports directory
    reportBaseDir = path.resolve(__dirname, '../reports');
  }
  await fs.mkdir(reportBaseDir, { recursive: true });
  
  // Run tests for each URL pair
  for (let i = 0; i < maxUrlsToTest; i++) {
    const testingUrl = testingUrls[i];
    const referenceUrl = referenceUrls[i];
    
    console.log(`Testing URL pair ${i+1}/${maxUrlsToTest}: ${testingUrl} vs ${referenceUrl}`);
    
    let browser1 = null;
    let browser2 = null;
    
    try {
      console.log(`Launching browsers for: ${testingUrl} vs ${referenceUrl}`);
      browser1 = await remote({ 
        logLevel: 'error', 
        capabilities: { 
          browserName: 'chrome',
          'goog:chromeOptions': {
            args: ['--headless', '--disable-gpu', '--window-size=1920,1080']
          } 
        } 
      });
      browser2 = await remote({ 
        logLevel: 'error', 
        capabilities: { 
          browserName: 'chrome',
          'goog:chromeOptions': {
            args: ['--headless', '--disable-gpu', '--window-size=1920,1080']
          } 
        } 
      });

      console.log('Navigating to testing URL:', testingUrl);
      await browser1.url(testingUrl);
      console.log('Navigating to reference URL:', referenceUrl);
      await browser2.url(referenceUrl);
      
      // Wait for pages to load completely
      await browser1.waitUntil(
        () => browser1.execute(() => document.readyState === 'complete'),
        { timeout: 10000, timeoutMsg: 'Testing page did not finish loading' }
      );
      await browser2.waitUntil(
        () => browser2.execute(() => document.readyState === 'complete'),
        { timeout: 10000, timeoutMsg: 'Reference page did not finish loading' }
      );

      console.log('Extracting DOM HTML for both pages...');
      const dom1 = await browser1.execute(() => document.documentElement.outerHTML);
      const dom2 = await browser2.execute(() => document.documentElement.outerHTML);
      console.log('DOM extraction complete. Running diff...');
      // Use jsdiff to compare DOMs
      const diff = jsdiff.diffLines(dom1, dom2);
      let diffCount = 0;
      let diffLines = [];
      let differences = [];
      
      diff.forEach(part => {
        const escaped = part.value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
          
        if (part.added) {
          diffCount++;
          diffLines.push({ type: 'added', value: escaped });
          differences.push({
            path: `/html[${diffCount}]`,
            testing: 'missing',
            reference: part.value.substring(0, 100) + (part.value.length > 100 ? '...' : ''),
            issue: 'Content only in reference DOM'
          });
        } else if (part.removed) {
          diffCount++;
          diffLines.push({ type: 'removed', value: escaped });
          differences.push({
            path: `/html[${diffCount}]`,
            testing: part.value.substring(0, 100) + (part.value.length > 100 ? '...' : ''),
            reference: 'missing',
            issue: 'Content only in testing DOM'
          });
        } else {
          diffLines.push({ type: 'unchanged', value: escaped });
        }
      });
      
      // Get simplified DOM structures for detailed comparison
      const testingDom = await browser1.execute(() => {
        // Helper function to get a simplified DOM structure
        const getSimplifiedNode = (node, depth = 0, maxDepth = 10) => {
          if (depth > maxDepth) return { type: node.nodeName, truncated: true };
          
          const result = {
            type: node.nodeName,
            id: node.id || undefined,
            class: node.className || undefined,
          };
          
          // Only add children if this is an element node with children
          if (node.nodeType === 1 && node.childNodes.length > 0) {
            result.children = Array.from(node.childNodes)
              .filter(child => child.nodeType === 1 || (child.nodeType === 3 && child.textContent.trim().length > 0))
              .map(child => getSimplifiedNode(child, depth + 1, maxDepth));
          }
          
          // Add attributes to the result
          if (node.nodeType === 1 && node.attributes) {
            result.attributes = {};
            for (let i = 0; i < node.attributes.length; i++) {
              const attr = node.attributes[i];
              result.attributes[attr.name] = attr.value;
            }
          }
          
          // Add text content for element nodes
          if (node.nodeType === 1 && node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
            result.text = node.childNodes[0].textContent.trim();
          }
          
          return result;
        };
        
        return getSimplifiedNode(document.documentElement);
      });
      
      const referenceDom = await browser2.execute(() => {
        // Helper function to get a simplified DOM structure
        const getSimplifiedNode = (node, depth = 0, maxDepth = 10) => {
          if (depth > maxDepth) return { type: node.nodeName, truncated: true };
          
          const result = {
            type: node.nodeName,
            id: node.id || undefined,
            class: node.className || undefined,
          };
          
          // Only add children if this is an element node with children
          if (node.nodeType === 1 && node.childNodes.length > 0) {
            result.children = Array.from(node.childNodes)
              .filter(child => child.nodeType === 1 || (child.nodeType === 3 && child.textContent.trim().length > 0))
              .map(child => getSimplifiedNode(child, depth + 1, maxDepth));
          }
          
          // Add attributes to the result
          if (node.nodeType === 1 && node.attributes) {
            result.attributes = {};
            for (let i = 0; i < node.attributes.length; i++) {
              const attr = node.attributes[i];
              result.attributes[attr.name] = attr.value;
            }
          }
          
          // Add text content for element nodes
          if (node.nodeType === 1 && node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
            result.text = node.childNodes[0].textContent.trim();
          }
          
          return result;
        };
        
        return getSimplifiedNode(document.documentElement);
      });
      
      // Store comparison result
      const pageName = getPageName(testingUrl);
      results.push({
        testingUrl,
        referenceUrl,
        testingDom,
        referenceDom,
        differencesCount: diffCount,
        differences,
        diffLines, // Store the formatted diff lines
        status: diffCount === 0 ? 'PASS' : 'FAIL',
        pageName
      });
      
      // Log result
      if (diffCount > 0) {
        totalDiffs++;
        console.error(`❌ ${diffCount} difference${diffCount === 1 ? '' : 's'} found in ${pageName}`);
      } else {
        console.log(`✅ DOMs are identical for ${pageName}`);
      }
    } catch (error) {
      console.error(`Error comparing URLs: ${testingUrl} vs ${referenceUrl}:`, error);
      results.push({
        testingUrl,
        referenceUrl,
        differencesCount: 0,
        differences: null, // Set to null to indicate error
        diffLines: null,   // Set to null to indicate error
        error: error && error.stack ? error.stack : (error.message || String(error)),
        status: 'ERROR'
      });
    } finally {
      // Clean up browser sessions
      if (browser1) await browser1.deleteSession().catch(() => {});
      if (browser2) await browser2.deleteSession().catch(() => {});
    }
  }
  
  // Generate report timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Create report object with user information
  const report = {
    id: testId,
    generatedAt: new Date().toISOString(),
    user: user ? {
      email: user.email,
      fullName: user.fullName
    } : { email: 'anonymous', fullName: 'Anonymous User' },
    testingSitesCount: testingUrls.length,
    referenceSitesCount: referenceUrls.length,
    testingDomain: testingUrls.length > 0 ? new URL(testingUrls[0]).hostname : 'unknown',
    referenceDomain: referenceUrls.length > 0 ? new URL(referenceUrls[0]).hostname : 'unknown',
    executionTimeMs: Date.now() - startTime,
    browser: 'Chrome Headless',
    environment: {
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      platform: process.platform,
      nodeVersion: process.version
    },
    totalTests: maxUrlsToTest,
    passedTests: results.filter(r => r.status === 'PASS').length,
    failedTests: results.filter(r => r.status === 'FAIL').length,
    results: results,
    fromFrontend: options.fromFrontend === true // Store the source in the report
  };
  
  // Skip saving individual reports if this is part of a combined test
  if (options.isCombinedTest) {
    console.log('Skipping individual DOM report generation - this is part of a combined test');
    return {
      success: true,
      testId,
      user: report.user,
      summary: {
        id: testId,
        user: report.user,
        totalTests: report.totalTests,
        passedTests: report.passedTests,
        failedTests: report.failedTests
      },
      report: report // Return the report data for combined report generation
    };
  }
  
  // Create reports directory if it doesn't exist
  try {
    // Save report as JSON with testId in the filename
    const reportFilename = `dom-test-report-${timestamp}-${testId}.json`;
    const reportPath = path.join(reportBaseDir, reportFilename);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Remove HTML report generation here; only generate on export API call
    // const { generateDomReport } = require('./domReportGenerator');
    // generateDomReport(comparisonResults, htmlReportPath);
    // console.log(`HTML report generated: ${htmlReportPath}`);
    
    return {
      success: true,
      reportPath,
      reportFilename,
      testId,
      user: report.user,
      summary: {
        id: testId,
        user: report.user,
        totalTests: report.totalTests,
        passedTests: report.passedTests,
        failedTests: report.failedTests
      }
    };
  } catch (error) {
    console.error('Error saving report:', error);
    return {
      success: false,
      error: `Error saving report: ${error.message}`,
      report
    };
  }
};

module.exports = {
  runDomTests
};