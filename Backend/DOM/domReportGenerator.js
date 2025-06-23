const path = require('path');
const fs = require('fs');

/**
 * Generates an HTML report for DOM comparison results
 * @param {Array} comparisonResults - Array of comparison result objects
 * @param {string} outputPath - Path where the report should be saved
 * @param {Object} extraDetails - Additional details to be included in the report
 * @returns {string} - Path to the generated report
 */
function generateDomReport(comparisonResults, outputPath, extraDetails = {}) {
  const templatePath = path.join(__dirname, './templates/dom-report-template.html');
  const totalTests = comparisonResults.length;
  const failedTests = comparisonResults.filter(result => (result.diffCount || result.differencesCount || 0) > 0).length;
  const passedTests = totalTests - failedTests;

  // Collect extra details for the report (e.g., user, domains, execution time)
  const details = {
    user: extraDetails.user || {},
    testingDomain: extraDetails.testingDomain || '',
    referenceDomain: extraDetails.referenceDomain || '',
    executionTimeMs: extraDetails.executionTimeMs || '',
    generatedAt: extraDetails.generatedAt || '',
    ...extraDetails
  };

  try {
    let templateHtml = fs.readFileSync(templatePath, 'utf-8');
    // Inject the results as const comparisonResults for compatibility with the template
    templateHtml = templateHtml
      .replace('const comparisonResults = [];', `const comparisonResults = ${JSON.stringify(comparisonResults)};`)
      .replace('window.REPORT_DETAILS = {}', `window.REPORT_DETAILS = ${JSON.stringify(details)}`)
      .replace('{{PASSED}}', passedTests)
      .replace('{{FAILED}}', failedTests)
      .replace('{{TOTAL}}', totalTests);
    // {{COMPARISON_RESULTS}} is not needed, as the JS will render

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, templateHtml);
    return outputPath;
  } catch (error) {
    console.error('Error generating DOM report:', error);
    throw error;
  }
}

module.exports = {
  generateDomReport
};