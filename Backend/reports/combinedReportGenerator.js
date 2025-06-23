const fs = require('fs').promises;
const path = require('path');

async function generateCombinedReport(reportData, outputPath, options = {}) {
    try {
        const templatePath = path.resolve(__dirname, '../combinedtemplate/combined-report-template.html');
        let template = await fs.readFile(templatePath, 'utf8');

        // Ensure reportData is an object to prevent errors on undefined properties
        reportData = reportData || {};
        
        const domResult = reportData.domResult || {};
        const visualResult = reportData.visualResult || {};
        
        const domSummary = domResult.summary || {};
        const visualSummary = visualResult.summary || {};
        
        const domReport = domResult.report || {};
        const visualReport = visualResult.report || {};

        const reportDir = path.dirname(outputPath);

        // Helper function to convert BackstopJS relative paths to proper URLs
        async function convertImagePath(imagePath) {
            if (!imagePath) return '';
            
            // Replace backslashes with forward slashes and remove any '../' from the start
            const cleanPath = imagePath.replace(/\\/g, '/').replace(/^\.\.[\\/]+/, '');
            console.log('Converting image path:', imagePath, 'to', cleanPath);
            
            // For reference images, try alternative naming patterns
            let alternativePaths = [cleanPath];
            
            // If this is a reference image with user prefix, try the simple numbered version
            if (cleanPath.includes('bitmaps_reference/') && cleanPath.includes('-')) {
                const fileName = path.basename(cleanPath);
                // Extract the part after the user prefix (e.g., "Sreeram1-1c1831086e69_Page_abouthtml..." -> "Page_abouthtml...")
                const simpleFileName = fileName.replace(/^[^_]*-[^_]*_/, '0_');
                const simplePath = cleanPath.replace(fileName, simpleFileName);
                alternativePaths.push(simplePath);
                console.log('Added alternative reference path:', simplePath);
            }
            
            // For test and diff images, try multiple naming patterns
            if (cleanPath.includes('bitmaps_test/')) {
                const fileName = path.basename(cleanPath);
                // Create simple versions without user prefixes for new backstop setup
                const simpleFileName = fileName.replace(/^[^_]*-[^_]*_/, '0_').replace(/^failed_diff_[^_]*-[^_]*_/, 'failed_diff_0_');
                // Try to find the most recent timestamped folder in the correct backstop_data location
                const backstopDir = path.resolve(__dirname, './backstop_data/bitmaps_test');
                try {
                    const testFolders = await fs.readdir(backstopDir);
                    // Sort folders to get the most recent timestamp first
                    const sortedFolders = testFolders
                        .filter(folder => folder.match(/^[0-9]{8}-[0-9]{6}$/)) // Match YYYYMMDD-HHMMSS pattern
                        .sort()
                        .reverse();
                    console.log(`Found timestamped test folders in backstop_data:`, sortedFolders);
                    // Try both original filename and simple filename in each timestamped folder
                    for (const folder of sortedFolders) {
                        // Original filename pattern
                        const originalPath = `bitmaps_test/${folder}/${fileName}`;
                        alternativePaths.push(originalPath);
                        // Simple filename pattern (for new backstop setup)
                        const simplePath = `bitmaps_test/${folder}/${simpleFileName}`;
                        alternativePaths.push(simplePath);
                        console.log('Added timestamped test paths:', originalPath, simplePath);
                    }
                } catch (error) {
                    console.log(`Error checking timestamped folders in backstop_data:`, error);
                }
            }
            // Check only the correct backstop_data location for images
            const baseLocation = {
                basePath: path.resolve(__dirname, './backstop_data'),
                urlBase: `http://localhost:3001/reports/backstop_data`
            };
            // Try each alternative path
            for (const altPath of alternativePaths) {
                const fullPath = path.resolve(baseLocation.basePath, altPath);
                const urlPath = `${baseLocation.urlBase}/${altPath}`;
                console.log(`Checking if file exists: ${fullPath}`);
                try {
                    await fs.access(fullPath);
                    console.log('Found image at:', fullPath);
                    return urlPath;
                } catch (error) {
                    console.log(`Not found at: ${fullPath}`);
                    continue;
                }
            }
            // If image not found, default to backstop_data path
            console.warn('Image not found in backstop_data location:', cleanPath);
            return `http://localhost:3001/reports/backstop_data/${cleanPath}`;
        }

        // Generate enhanced visual results HTML with new card structure
        const visualResultsHtml = (visualReport && visualReport.tests && Array.isArray(visualReport.tests)) ? 
            await Promise.all(visualReport.tests.map(async (result) => {
                const status = result.status.toLowerCase();
                const statusClass = status === 'pass' ? 'test-passed' : 'test-failed';
                const pageName = result.pair.label || 'Unknown Page';
                const viewport = result.pair.viewportLabel || 'desktop';
                // Dynamically get image paths from report data
                const referencePath = result.pair.reference;
                const testPath = result.pair.test;
                const diffPath = result.pair.diffImage;

                console.log(referencePath, testPath, diffPath);
                // Build screenshot grid with enhanced structure
                let screenshotGrid = '<div class="screenshot-grid">';
                // Reference image
                if (referencePath) {
                    const referenceUrl = await convertImagePath(referencePath);
                    screenshotGrid += `
                        <div class="screenshot-card reference" onclick="openImageModal('${referenceUrl}')">
                            <div class="screenshot-header">Reference</div>
                            <img src="${referenceUrl}" alt="Reference" class="screenshot-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div style="display:none; padding:20px; text-align:center; color:#666;">Image not found</div>
                        </div>
                    `;
                }
                // Test image
                if (testPath) {
                    const testUrl = await convertImagePath(testPath);
                    screenshotGrid += `
                        <div class="screenshot-card test" onclick="openImageModal('${testUrl}')">
                            <div class="screenshot-header">Test</div>
                            <img src="${testUrl}" alt="Test" class="screenshot-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div style="display:none; padding:20px; text-align:center; color:#666;">Image not found</div>
                        </div>
                    `;
                }
                // Difference image (only for failed tests)
                if (status === 'fail' && diffPath) {
                    const diffUrl = await convertImagePath(diffPath);
                    screenshotGrid += `
                        <div class="screenshot-card difference" onclick="openImageModal('${diffUrl}')">
                            <div class="screenshot-header">Difference</div>
                            <img src="${diffUrl}" alt="Difference" class="screenshot-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div style="display:none; padding:20px; text-align:center; color:#666;">Image not found</div>
                        </div>
                    `;
                }
                screenshotGrid += '</div>';
                
                // Add action buttons
                let actionButtons = '<div class="visual-actions">';
                actionButtons += `
                    <button class="visual-action-btn" onclick="openImageModal('${await convertImagePath(result.pair.reference)}')">
                        <span>🔍</span> View Full Size
                    </button>
                `;
                
                if (status === 'fail') {
                    actionButtons += `
                        <button class="visual-action-btn secondary" onclick="downloadDiffImage('${result.pair.diffImage}')">
                            <span>💾</span> Download Diff
                        </button>
                    `;
                    
                    // Add comparison details for failed tests
                    const mismatchPercentage = result.pair.diff?.misMatchPercentage || 0;
                    const threshold = result.pair.misMatchThreshold || 0.1;
                    
                    actionButtons += `
                        <div style="margin-top: 1rem; padding: 1rem; background: var(--error-light); border-radius: 8px; text-align: center;">
                            <strong>Mismatch: ${mismatchPercentage}%</strong> | Threshold: ${(threshold * 100).toFixed(1)}%
                        </div>
                    `;
                }
                
                actionButtons += '</div>';

                return `
                    <div class="visual-test-card ${statusClass}" data-page="${pageName.toLowerCase()}" data-viewport="${viewport.toLowerCase()}" data-status="${status}">
                        <div class="visual-test-header">
                            <div class="visual-test-title">${pageName} - ${viewport}</div>
                            <div class="visual-status-badge ${status}">${status.toUpperCase()}</div>
                        </div>
                        <div class="visual-test-content">
                            ${screenshotGrid}
                            ${actionButtons}
                        </div>
                    </div>
                `;
            })).then(results => results.join('')) : '<div class="empty-state"><p>No visual test results available.</p></div>';

        // Calculate visual success rate
        const visualSuccessRate = visualSummary.totalTests > 0 ? 
            Math.round((visualSummary.passedTests / visualSummary.totalTests) * 100) : 0;

        console.log('Visual success rate:', visualSuccessRate);

        template = template.replace(/{{reportId}}/g, reportData.id || 'N/A');
        template = template.replace(/{{timestamp}}/g, reportData.timestamp ? new Date(reportData.timestamp).toLocaleString() : 'N/A');
        template = template.replace(/{{user}}/g, (reportData.user && reportData.user.fullName) ? reportData.user.fullName : 'N/A');
        
        template = template.replace(/{{domTotalTests}}/g, domSummary.totalTests || 0);
        template = template.replace(/{{domPassedTests}}/g, domSummary.passedTests || 0);
        template = template.replace(/{{domFailedTests}}/g, domSummary.failedTests || 0);
        template = template.replace(/{{domOverallStatus}}/g, (domSummary.failedTests || 0) > 0 ? 'fail' : 'pass');

        template = template.replace(/{{visualTotalTests}}/g, visualSummary.totalTests || 0);
        template = template.replace(/{{visualPassedTests}}/g, visualSummary.passedTests || 0);
        template = template.replace(/{{visualFailedTests}}/g, visualSummary.failedTests || 0);
        template = template.replace(/{{visualSuccessRate}}/g, visualSuccessRate);
        template = template.replace(/{{visualOverallStatus}}/g, (visualSummary.failedTests || 0) > 0 ? 'fail' : 'pass');

        // Inject DOM results data for client-side rendering
        if (domReport && domReport.results && Array.isArray(domReport.results)) {
            template = template.replace('const domComparisonResults = [];', `const domComparisonResults = ${JSON.stringify(domReport.results)};`);
        } else {
            template = template.replace('const domComparisonResults = [];', 'const domComparisonResults = [];');
        }

        template = template.replace('{{visualResults}}', visualResultsHtml);

        await fs.writeFile(outputPath, template);
        console.log(`Combined report generated at: ${outputPath}`);
    } catch (error) {
        console.error('Error generating combined report:', error);
        // For debugging, log the data that caused the issue
        console.error('Report data that caused error:', JSON.stringify(reportData, null, 2));
        throw error;
    }
}

async function exportToCsv(reportData, outputPath) {
    try {
       let csvContent = 'Test Type,URL/Label,Status,Details\n';
        
        // DOM Results
        if (reportData.domResult && reportData.domResult.report && reportData.domResult.report.results) {
            reportData.domResult.report.results.forEach(result => {
                const details = result.diff.map(d => `${d.added ? 'ADDED' : 'REMOVED'}: ${d.value.replace(/,/g, ';')}`).join(' | ');
                csvContent += `DOM,${result.testingUrl},${result.status},"${details}"\n`;
            });
        }

        // Visual Results
        if (reportData.visualResult && reportData.visualResult.report && reportData.visualResult.report.tests) {
            reportData.visualResult.report.tests.forEach(result => {
                const details = `Mismatch: ${result.pair.diff.misMatchPercentage}%`;
                csvContent += `Visual,${result.pair.label} (${result.pair.viewportLabel}),${result.status},"${details}"\n`;
            });
        }

        await fs.writeFile(outputPath, csvContent);
        console.log(`CSV report generated at: ${outputPath}`);
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        throw error;
    }
}

module.exports = { generateCombinedReport, exportToCsv };
