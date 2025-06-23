const { generateVisualReport } = require('./visualReportGenerator');
const fs = require('fs').promises;
const path = require('path');

async function testVisualReportGeneration() {
  try {
    console.log('Testing visual report generation with current BackstopJS results...');
    
    // Read the current BackstopJS config.js file
    const configJsPath = path.resolve(__dirname, './backstop_data/html_report/config.js');
    const configContent = await fs.readFile(configJsPath, 'utf8');
    
    // Extract the report data from the config.js file
    const reportMatch = configContent.match(/report\((.+)\);/s);
    if (!reportMatch) {
      throw new Error('Could not extract report data from config.js');
    }
    
    const backstopData = JSON.parse(reportMatch[1]);
    console.log(`Found ${backstopData.tests.length} test results`);
    
    // Analyze the results
    const failedTests = backstopData.tests.filter(t => t.status === 'fail');
    const passedTests = backstopData.tests.filter(t => t.status === 'pass');
    
    console.log('\n=== VISUAL TEST RESULTS ANALYSIS ===');
    console.log(`Total Tests: ${backstopData.tests.length}`);
    console.log(`Passed: ${passedTests.length}`);
    console.log(`Failed: ${failedTests.length}`);
    
    if (failedTests.length > 0) {
      console.log('\n=== FAILED TESTS DETAILS ===');
      failedTests.forEach(test => {
        console.log(`❌ ${test.pair.label} - ${test.pair.viewportLabel}`);
        console.log(`   Mismatch: ${test.pair.diff.misMatchPercentage}%`);
        console.log(`   Threshold: ${(test.pair.misMatchThreshold * 100).toFixed(1)}%`);
        console.log(`   Testing URL: ${test.pair.url}`);
        console.log(`   Reference URL: ${test.pair.referenceUrl}`);
        if (test.pair.diffImage) {
          console.log(`   Diff Image: ${test.pair.diffImage}`);
        }
        console.log('');
      });
    }
    
    // Generate the visual report
    const reportResult = await generateVisualReport(backstopData, {
      user: {
        email: 'test@example.com',
        fullName: 'Test User'
      }
    });
    
    if (reportResult.success) {
      console.log('\n=== REPORT GENERATION SUCCESS ===');
      console.log(`Report saved to: ${reportResult.reportPath}`);
      console.log(`JSON data saved to: ${reportResult.jsonPath}`);
      console.log('\nSummary:');
      console.log(`  Total Tests: ${reportResult.summary.totalTests}`);
      console.log(`  Passed: ${reportResult.summary.passedTests}`);
      console.log(`  Failed: ${reportResult.summary.failedTests}`);
      console.log(`  Success Rate: ${reportResult.summary.successRate}%`);
      
      return {
        success: true,
        reportPath: reportResult.reportPath,
        failures: failedTests.map(t => ({
          page: t.pair.label,
          viewport: t.pair.viewportLabel,
          mismatch: t.pair.diff.misMatchPercentage,
          threshold: (t.pair.misMatchThreshold * 100).toFixed(1) + '%'
        }))
      };
    } else {
      console.error('Failed to generate report:', reportResult.error);
      return { success: false, error: reportResult.error };
    }
    
  } catch (error) {
    console.error('Error testing visual report generation:', error);
    return { success: false, error: error.message };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testVisualReportGeneration()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Visual report test completed successfully!');
        if (result.failures && result.failures.length > 0) {
          console.log('\n⚠️  The following visual differences were detected:');
          result.failures.forEach(failure => {
            console.log(`   • ${failure.page} (${failure.viewport}): ${failure.mismatch}% difference (threshold: ${failure.threshold})`);
          });
        }
      } else {
        console.log('\n❌ Visual report test failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testVisualReportGeneration };