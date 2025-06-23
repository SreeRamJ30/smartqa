const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Serve static files from the VISUAL directory
app.use('/VISUAL', express.static(path.join(__dirname)));

// Serve reports
app.use('/visual-reports', express.static(path.join(__dirname, 'reports')));

// Main route to display the latest visual report
app.get('/', (req, res) => {
  const reportsDir = path.join(__dirname, 'reports');
  
  try {
    const files = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith('visual-test-html-report-') && file.endsWith('.html'))
      .sort()
      .reverse(); // Get the latest report
    
    if (files.length > 0) {
      const latestReport = files[0];
      res.redirect(`/visual-reports/${latestReport}`);
    } else {
      res.send(`
        <h1>No Visual Reports Found</h1>
        <p>Run visual tests to generate reports.</p>
        <p>Available endpoints:</p>
        <ul>
          <li><a href="/test">Run Test</a></li>
          <li><a href="/reports">View All Reports</a></li>
        </ul>
      `);
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// List all reports
app.get('/reports', (req, res) => {
  const reportsDir = path.join(__dirname, 'reports');
  
  try {
    const files = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith('visual-test-html-report-') && file.endsWith('.html'))
      .sort()
      .reverse();
    
    const reportList = files.map(file => {
      const stats = fs.statSync(path.join(reportsDir, file));
      return {
        name: file,
        date: stats.mtime.toLocaleString(),
        size: Math.round(stats.size / 1024) + ' KB'
      };
    });
    
    const html = `
      <h1>Visual Test Reports</h1>
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr>
          <th style="padding: 10px;">Report</th>
          <th style="padding: 10px;">Generated</th>
          <th style="padding: 10px;">Size</th>
          <th style="padding: 10px;">Actions</th>
        </tr>
        ${reportList.map(report => `
          <tr>
            <td style="padding: 10px;">${report.name}</td>
            <td style="padding: 10px;">${report.date}</td>
            <td style="padding: 10px;">${report.size}</td>
            <td style="padding: 10px;">
              <a href="/visual-reports/${report.name}" target="_blank">View</a>
            </td>
          </tr>
        `).join('')}
      </table>
      <br>
      <a href="/test">Run New Test</a> | <a href="/">Latest Report</a>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Run test endpoint
app.get('/test', async (req, res) => {
  try {
    const { testVisualReportGeneration } = require('./testVisualReport');
    const result = await testVisualReportGeneration();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Visual test completed successfully!',
        reportUrl: result.reportPath,
        failures: result.failures
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Visual Testing Server running on http://localhost:${PORT}`);
  console.log(`Latest report: http://localhost:${PORT}`);
  console.log(`All reports: http://localhost:${PORT}/reports`);
  console.log(`Run test: http://localhost:${PORT}/test`);
});

module.exports = app;