const backstop = require('backstopjs');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');
const xml2js = require('xml2js');
const { generateVisualReport } = require('./visualReportGenerator');

/**
 * Runs visual regression tests using BackstopJS
 * @param {Object} options - Test configuration options
 * @param {string} options.testingUrl - URL of the testing site (for single URL test)
 * @param {string} options.referenceUrl - URL of the reference site (for single URL test)
 * @param {string} options.testingSitemap - XML sitemap content of the testing site
 * @param {string} options.referenceSitemap - XML sitemap content of the reference site
 * @param {Array} options.viewports - Array of viewport configurations
 * @param {number} options.threshold - Mismatch threshold percentage (0-1)
 * @param {Array} options.hideSelectors - Elements to hide during testing
 * @param {number} options.captureDelay - Delay before capturing screenshot
 * @param {Object} options.user - User information
 * @returns {Object} Test results
 */
async function runVisualTests(options) {
  const startTime = Date.now(); // Track start time
  
  try {
    console.log('Starting visual regression tests...');
    
    // Generate a unique test ID using timestamp and random string, or use shared test ID if provided
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const userId = options.user?.email?.split('@')[0] || 'anonymous';
    const randomId = crypto.randomBytes(6).toString('hex');
    const testId = options.sharedTestId || `${userId}-${randomId}`;
    
    console.log(`Using test ID: ${testId}${options.sharedTestId ? ' (shared from combined test)' : ' (generated)'}`);
    
    // Create directory for reports if it doesn't exist
    const reportsDir = path.resolve(__dirname, './reports');
    try {
      await fs.access(reportsDir);
    } catch (error) {
      await fs.mkdir(reportsDir, { recursive: true });
    }
    
    // Create assets directory in reports
    const reportAssetsDir = path.resolve(reportsDir, 'assets');
    try {
      await fs.access(reportAssetsDir);
    } catch (error) {
      await fs.mkdir(reportAssetsDir, { recursive: true });
    }
    
    // Use custom backstopDataDir if provided (for combined tests), else default to VISUAL/backstop_data
    const backstopDataDir = options.backstopDataDir
      ? options.backstopDataDir
      : path.resolve(__dirname, './backstop_data');
    try {
      await fs.access(backstopDataDir);
    } catch (error) {
      await fs.mkdir(backstopDataDir, { recursive: true });
      await fs.mkdir(path.resolve(backstopDataDir, 'bitmaps_reference'), { recursive: true });
      await fs.mkdir(path.resolve(backstopDataDir, 'bitmaps_test'), { recursive: true });
      await fs.mkdir(path.resolve(backstopDataDir, 'engine_scripts'), { recursive: true });
      await fs.mkdir(path.resolve(backstopDataDir, 'html_report'), { recursive: true });
      await fs.mkdir(path.resolve(backstopDataDir, 'ci_report'), { recursive: true });
      await fs.mkdir(path.resolve(backstopDataDir, 'json_report'), { recursive: true });
    }
    
    // Save the sitemap files temporarily if they exist
    const testingSitemapPath = path.resolve(backstopDataDir, 'testing-sitemap.xml');
    const referenceSitemapPath = path.resolve(backstopDataDir, 'reference-sitemap.xml');
    
    if (options.testingSitemap) {
      await fs.writeFile(testingSitemapPath, options.testingSitemap);
    }
    
    if (options.referenceSitemap) {
      await fs.writeFile(referenceSitemapPath, options.referenceSitemap);
    }
    
    // Define scenarios based on input type (URLs or sitemaps)
    const scenarios = [];
    
    if (options.testingUrl && options.referenceUrl) {
      // Single URL test
      scenarios.push({
        label: 'Single URL Test',
        url: options.testingUrl,
        referenceUrl: options.referenceUrl,
        delay: options.captureDelay || 500,
        hideSelectors: options.hideSelectors || [],
        readyEvent: null,
        readySelector: 'body',
        requireSameDimensions: true,
        misMatchThreshold: options.threshold || 0.1,
      });
    } else if (options.testingSitemap && options.referenceSitemap) {
      try {
        // Use more robust sitemap parsing
        const testingUrls = await parseXmlSitemap(options.testingSitemap);
        const referenceUrls = await parseXmlSitemap(options.referenceSitemap);
        
        console.log(`Extracted ${testingUrls.length} URLs from testing sitemap`);
        console.log(`Extracted ${referenceUrls.length} URLs from reference sitemap`);
        
        if (testingUrls.length === 0 || referenceUrls.length === 0) {
          throw new Error('Failed to extract URLs from sitemaps');
        }
        
        // Log the first few URLs for debugging
        console.log('Sample testing URLs:', testingUrls.slice(0, 3));
        console.log('Sample reference URLs:', referenceUrls.slice(0, 3));
        
        // Match URLs between the two sitemaps
        const maxTests = Math.min(testingUrls.length, referenceUrls.length, options.maxUrls || 20); // Limit to 20 URLs by default
        
        for (let i = 0; i < maxTests; i++) {
          const testingUrl = testingUrls[i];
          const referenceUrl = referenceUrls[i];
          
          // Try to get a meaningful label from the URL
          let label;
          try {
            const urlObj = new URL(testingUrl);
            const pathname = urlObj.pathname;
            // Use the last part of the path as label, or 'homepage' for root
            label = pathname === '/' ? 'homepage' : pathname.split('/').filter(Boolean).pop() || urlObj.hostname;
          } catch (e) {
            label = `page-${i+1}`;
          }
          
          scenarios.push({
            label: `Page: ${label}`,
            url: testingUrl,
            referenceUrl: referenceUrl,
            delay: options.captureDelay || 500,
            hideSelectors: options.hideSelectors || [],
            readyEvent: null,
            readySelector: 'body',
            requireSameDimensions: true,
            misMatchThreshold: options.threshold || 0.1,
            scrollToSelector: options.scrollToSelector || null,
            selectors: options.selectors || ['viewport'],
            selectorExpansion: options.selectorExpansion || true,
          });
        }
      } catch (sitemapError) {
        console.error('Error processing sitemaps:', sitemapError);
        throw new Error(`Failed to process sitemaps: ${sitemapError.message}`);
      }
    } else {
      throw new Error('Neither URL nor sitemap pairs were provided');
    }
    
    if (scenarios.length === 0) {
      throw new Error('No valid scenarios could be created from the provided inputs');
    }
    
    // Create BackstopJS configuration
    const config = {
      id: `visual-test-${timestamp}`,
      viewports: options.viewports.map(viewport => ({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height
      })),
      scenarios: scenarios,
      paths: {
        bitmaps_reference: path.resolve(backstopDataDir, 'bitmaps_reference'),
        bitmaps_test: path.resolve(backstopDataDir, 'bitmaps_test'),
        engine_scripts: path.resolve(backstopDataDir, 'engine_scripts'),
        html_report: path.resolve(backstopDataDir, 'html_report'),
        ci_report: path.resolve(backstopDataDir, 'ci_report'),
        json_report: path.resolve(backstopDataDir, 'json_report')
      },
      report: ['json'], // Remove 'browser' to prevent auto-opening the HTML report
      engine: 'puppeteer',
      engineOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      },
      asyncCaptureLimit: options.asyncCaptureLimit || 3,
      asyncCompareLimit: 50,
      debug: false,
      debugWindow: false,
    };
    
    // Save the config for debugging purposes
    await fs.writeFile(
      path.resolve(backstopDataDir, 'last-config.json'), 
      JSON.stringify(config, null, 2)
    );
    
    // Generate reference images
    console.log('Generating reference images...');
    await backstop('reference', { config });
    
    // Run tests and compare with reference
    console.log('Running tests and comparing with references...');
    let testResults;
    try {
      testResults = await backstop('test', { config });
    } catch (backstopError) {
      // BackstopJS throws an error when tests fail, but we still want to process the results
      console.log('BackstopJS completed with visual differences detected');
      testResults = backstopError; // BackstopJS puts results in the error object when tests fail
    }
    
    // Process results from BackstopJS - try multiple possible paths
    const possibleJsonPaths = [
      path.resolve(backstopDataDir, 'json_report/jsonReport.json'),
      path.resolve(backstopDataDir, 'ci_report/jsonReport.json'),
      path.resolve(backstopDataDir, 'ci_report/xunit.xml')
    ];
    
    let backstopReport;
    let reportFound = false;
    
    for (const jsonPath of possibleJsonPaths) {
      try {
        console.log(`Trying to read report from: ${jsonPath}`);
        const backstopReportContent = await fs.readFile(jsonPath, 'utf8');
        backstopReport = JSON.parse(backstopReportContent);
        reportFound = true;
        console.log(`Successfully read report from: ${jsonPath}`);
        break;
      } catch (error) {
        console.log(`Failed to read from ${jsonPath}: ${error.message}`);
        continue;
      }
    }
    
    // If no JSON report found, read from config.js file in html_report
    if (!reportFound) {
      try {
        const configJsPath = path.resolve(backstopDataDir, 'html_report/config.js');
        console.log(`Trying to read BackstopJS config.js from: ${configJsPath}`);
        const configContent = await fs.readFile(configJsPath, 'utf8');
        
        // Extract the report data from the config.js file
        // The file contains: report({...});
        const reportMatch = configContent.match(/report\((.+)\);/s);
        if (reportMatch) {
          backstopReport = JSON.parse(reportMatch[1]);
          reportFound = true;
          console.log(`Successfully extracted report from config.js`);
        }
      } catch (configError) {
        console.log(`Failed to read from config.js: ${configError.message}`);
      }
    }
    
    // If still no report found, create from testResults
    if (!reportFound) {
      console.log('No JSON report found, creating from testResults...');
      backstopReport = {
        testSuite: "BackstopJS",
        tests: testResults?.tests || [],
        id: `visual-test-${timestamp}`
      };
    }

    // Ensure we have tests data
    if (!backstopReport.tests || backstopReport.tests.length === 0) {
      throw new Error('No test results found in BackstopJS report');
    }

    console.log(`Found ${backstopReport.tests.length} test results`);
    
    // Calculate results summary
    const passedTests = backstopReport.tests.filter(t => t.status === 'pass').length;
    const failedTests = backstopReport.tests.filter(t => t.status === 'fail').length;
    const totalTests = backstopReport.tests.length;
    
    console.log('Test results summary:', {
      passed: passedTests,
      failed: failedTests,
      total: totalTests
    });

    // Skip saving individual reports if this is part of a combined test
    if (options.isCombinedTest) {
      console.log('Skipping individual Visual report generation - this is part of a combined test');
      
      // Determine overall test status
      const hasFailures = failedTests > 0;
      const executionTimeMs = Date.now() - startTime;
      
      return {
        success: true, // Testing process completed successfully
        testId: testId,
        timestamp: timestamp,
        summary: {
          totalTests: totalTests,
          passedTests: passedTests,
          failedTests: failedTests,
          successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
          executionTimeMs: executionTimeMs,
          status: hasFailures ? 'DIFFERENCES_DETECTED' : 'PASSED'
        },
        user: options.user,
        
        // Include failure details for analysis
        failures: backstopReport.tests
          .filter(t => t.status === 'fail')
          .map(t => ({
            page: t.pair?.label,
            viewport: t.pair?.viewportLabel,
            mismatch: t.pair?.diff?.misMatchPercentage,
            threshold: (t.pair?.misMatchThreshold || 0.1) * 100
          })),
        
        // Status information
        hasVisualDifferences: hasFailures,
        testStatus: hasFailures ? 'DIFFERENCES_DETECTED' : 'PASSED',
        message: hasFailures 
          ? `Visual differences detected in ${failedTests} out of ${totalTests} tests`
          : `All ${totalTests} visual tests passed`,
        
        // Return the report data for combined report generation
        report: backstopReport
      };
    }

    // Generate the visual report using our new generator
    const reportResult = await generateVisualReport(backstopReport, {
      user: options.user,
      timestamp: timestamp,
      testId: testId
    });

    if (!reportResult.success) {
      throw new Error(`Failed to generate visual report: ${reportResult.error}`);
    }

    // Clean up temporary files
    try {
      if (options.testingSitemap) await fs.unlink(testingSitemapPath).catch(() => {});
      if (options.referenceSitemap) await fs.unlink(referenceSitemapPath).catch(() => {});
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
    
    // Determine overall test status
    // Visual testing is "successful" even if there are visual differences detected
    // The success indicates that the testing process completed successfully
    const hasFailures = failedTests > 0;
    const executionTimeMs = Date.now() - startTime;
    
    console.log(`Visual testing completed in ${executionTimeMs}ms`);
    console.log(`Status: ${hasFailures ? 'DIFFERENCES_DETECTED' : 'PASSED'}`);
    
    return {
      success: true, // Testing process completed successfully
      testId: testId,
      timestamp: timestamp,
      summary: {
        totalTests: totalTests,
        passedTests: passedTests,
        failedTests: failedTests,
        successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
        executionTimeMs: executionTimeMs,
        status: hasFailures ? 'DIFFERENCES_DETECTED' : 'PASSED'
      },
      reportPath: reportResult.reportPath,
      jsonPath: reportResult.jsonPath,
      user: options.user,
      
      // Include failure details for analysis
      failures: backstopReport.tests
        .filter(t => t.status === 'fail')
        .map(t => ({
          page: t.pair?.label,
          viewport: t.pair?.viewportLabel,
          mismatch: t.pair?.diff?.misMatchPercentage,
          threshold: (t.pair?.misMatchThreshold || 0.1) * 100
        })),
      
      // Status information
      hasVisualDifferences: hasFailures,
      testStatus: hasFailures ? 'DIFFERENCES_DETECTED' : 'PASSED',
      message: hasFailures 
        ? `Visual differences detected in ${failedTests} out of ${totalTests} tests`
        : `All ${totalTests} visual tests passed`
    };
    
  } catch (error) {
    console.error('Error running visual tests:', error);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message,
      details: error.stack,
      testStatus: 'ERROR',
      message: `Visual testing failed: ${error.message}`
    };
  }
}

/**
 * Extract URLs from XML sitemap content using a more robust XML parser
 * @param {string} sitemapContent - XML sitemap content
 * @returns {Promise<Array>} Promise resolving to array of URLs
 */
async function parseXmlSitemap(sitemapContent) {
  if (!sitemapContent) return [];
  
  try {
    // First try to parse as XML using xml2js
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(sitemapContent);
    
    if (result && result.urlset && result.urlset.url) {
      // Standard sitemap format
      return result.urlset.url
        .filter(url => url && url.loc && url.loc.length > 0)
        .map(url => url.loc[0].trim());
    } else if (result && result.sitemapindex && result.sitemapindex.sitemap) {
      // This is a sitemap index, just extract the first few sitemap URLs
      // In a real implementation, you would fetch each sitemap and combine them
      console.log('Detected sitemap index, using first few entries');
      return result.sitemapindex.sitemap
        .filter(sitemap => sitemap && sitemap.loc && sitemap.loc.length > 0)
        .map(sitemap => sitemap.loc[0].trim())
        .slice(0, 5); // Limit to first 5 sitemaps
    }
    
    // If xml2js parsing succeeds but doesn't find expected structure,
    // fall back to regex (might be custom/invalid XML format)
    console.log('XML parsed but no standard sitemap structure found, trying regex fallback');
  } catch (xmlError) {
    console.error('XML parsing failed, using regex fallback:', xmlError.message);
  }
  
  // Fallback to regex extraction
  const urlRegex = /<loc>(.*?)<\/loc>/g;
  const urls = [];
  let match;
  
  while ((match = urlRegex.exec(sitemapContent)) !== null) {
    const url = match[1].trim();
    if (isValidUrl(url)) {
      urls.push(url);
    }
  }
  
  return urls;
}

/**
 * Check if a URL is valid
 * @param {string} url - URL to check
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a file exists
 * @param {string} path - Path to the file
 * @returns {boolean} True if file exists, false otherwise
 */
async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { runVisualTests };