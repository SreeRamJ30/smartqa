import React, { useState, useEffect } from 'react';
import './compare.css';

const Compare = ({ 
  selectedReports = [], 
  onClose, 
  combinedReports = [],
  formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString()
}) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedReports.length >= 2) {
      generateComparisonData();
    }
  }, [selectedReports]);

  // Generate comparison data from selected reports
  const generateComparisonData = () => {
    setLoading(true);
    
    if (!selectedReports || selectedReports.length < 2) {
      setLoading(false);
      return null;
    }

    const sortedReports = [...selectedReports].sort((a, b) => 
      new Date(a.timestamp || a.id) - new Date(b.timestamp || b.id)
    );

    // Extract data for comparison
    const domComparison = {
      successRates: sortedReports.map(r => r.domResult?.summary?.successRate || 0),
      totalTests: sortedReports.map(r => r.domResult?.summary?.totalTests || 0),
      failedTests: sortedReports.map(r => r.domResult?.summary?.failedTests || 0)
    };

    const visualComparison = {
      successRates: sortedReports.map(r => r.visualResult?.summary?.successRate || 0),
      totalTests: sortedReports.map(r => r.visualResult?.summary?.totalTests || 0),
      failedTests: sortedReports.map(r => r.visualResult?.summary?.failedTests || 0)
    };

    const performanceComparison = {
      executionTimes: sortedReports.map(r => r.executionTimeMs || 0)
    };

    // Calculate trends
    const calculateTrend = (values) => {
      if (values.length < 2) return 'neutral';
      const first = values[0];
      const last = values[values.length - 1];
      const change = ((last - first) / first) * 100;
      
      if (Math.abs(change) < 5) return 'neutral';
      return change > 0 ? 'positive' : 'negative';
    };

    // Calculate summary data
    const summary = {
      totalReports: selectedReports.length,
      timeRange: {
        earliest: Math.min(...sortedReports.map(r => new Date(r.timestamp || r.id).getTime())),
        latest: Math.max(...sortedReports.map(r => new Date(r.timestamp || r.id).getTime()))
      },
      averageExecutionTime: performanceComparison.executionTimes.reduce((sum, time) => sum + time, 0) / performanceComparison.executionTimes.length,
      overallTrends: {
        dom: calculateTrend(domComparison.successRates),
        visual: calculateTrend(visualComparison.successRates),
        performance: calculateTrend(performanceComparison.executionTimes)
      }
    };

    const data = {
      summary,
      domComparison,
      visualComparison,
      performanceComparison,
      reports: sortedReports
    };

    setComparisonData(data);
    setLoading(false);
  };

  // Export comparison report
  const exportComparisonReport = () => {
    if (!comparisonData) {
      alert('No comparison data available to export');
      return;
    }

    const reportData = {
      type: 'comparison-analysis',
      timestamp: new Date().toISOString(),
      summary: comparisonData.summary,
      domComparison: comparisonData.domComparison,
      visualComparison: comparisonData.visualComparison,
      performanceComparison: comparisonData.performanceComparison,
      reports: comparisonData.reports?.map(report => ({
        id: report.id,
        timestamp: report.timestamp,
        domSuccessRate: report.domResult?.summary?.successRate || 0,
        visualSuccessRate: report.visualResult?.summary?.successRate || 0,
        totalTests: (report.domResult?.summary?.totalTests || 0) + (report.visualResult?.summary?.totalTests || 0),
        executionTime: report.executionTimeMs || 0,
        user: report.user
      })) || []
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparison-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="comparison-view">
        <div className="comparison-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Generating comparison analysis...</p>
        </div>
      </div>
    );
  }

  if (!comparisonData || selectedReports.length < 2) {
    return (
      <div className="comparison-view">
        <div className="comparison-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Please select at least 2 reports to compare.</p>
          <button className="control-btn" onClick={onClose}>
            Close Comparison
          </button>
        </div>
      </div>
    );
  }

  const { reports } = comparisonData;
  const chartWidth = 600;
  const chartHeight = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const xScale = (index) => margin.left + (reports.length > 1 ? index * (innerWidth / (reports.length - 1)) : innerWidth / 2);
  const yScale = (value) => chartHeight - margin.bottom - ((value || 0) * innerHeight / 100);

  const domLinePath = reports.length > 1 ?
    'M ' + reports.map((report, index) =>
      `${xScale(index)} ${yScale(report.domResult?.summary?.successRate)}`
    ).join(' L ') : '';

  const visualLinePath = reports.length > 1 ?
    'M ' + reports.map((report, index) =>
      `${xScale(index)} ${yScale(report.visualResult?.summary?.successRate)}`
    ).join(' L ') : '';

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <h4>
          <i className="fas fa-balance-scale"></i>
          Comparison Analysis
        </h4>
        <div className="comparison-controls">
          <button
            className="control-btn"
            onClick={exportComparisonReport}
            title="Export comparison analysis"
          >
            <i className="fas fa-download"></i> Export
          </button>
          <button
            className="control-btn"
            onClick={onClose}
            title="Exit comparison mode"
          >
            <i className="fas fa-times"></i> Close
          </button>
        </div>
      </div>

      <div className="comparison-content">
        <div className="comparison-summary">
          <div className="summary-card">
            <h6>Reports Compared</h6>
            <p>{comparisonData?.summary?.totalReports}</p>
          </div>
          <div className="summary-card">
            <h6>Time Range</h6>
            <p>
              {formatTimestamp(comparisonData?.summary?.timeRange?.earliest)} - {formatTimestamp(comparisonData?.summary?.timeRange?.latest)}
            </p>
          </div>
          <div className="summary-card">
            <h6>Avg. Execution Time</h6>
            <p>{(comparisonData?.summary?.averageExecutionTime / 1000).toFixed(2)}s</p>
          </div>
        </div>

        <div className="comparison-details-grid">
          <div className="comparison-column">
            <h5>DOM Comparison</h5>
            <div className="comparison-metrics">
              <div className="metric-item">
                <span>Success Rate Trend</span>
                <span className={`trend-${comparisonData?.summary?.overallTrends?.dom}`}>
                  {comparisonData?.summary?.overallTrends?.dom}
                </span>
              </div>
              <div className="metric-item">
                <span>Avg. Success Rate</span>
                <span>{(comparisonData?.domComparison?.successRates?.reduce((a, b) => a + b, 0) / comparisonData?.domComparison?.successRates?.length).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div className="comparison-column">
            <h5>Visual Comparison</h5>
            <div className="comparison-metrics">
              <div className="metric-item">
                <span>Success Rate Trend</span>
                <span className={`trend-${comparisonData?.summary?.overallTrends?.visual}`}>
                  {comparisonData?.summary?.overallTrends?.visual}
                </span>
              </div>
              <div className="metric-item">
                <span>Avg. Success Rate</span>
                <span>{(comparisonData?.visualComparison?.successRates?.reduce((a, b) => a + b, 0) / comparisonData?.visualComparison?.successRates?.length).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trend Visualization */}
        <div className="comparison-charts">
          <h5>Performance Trends</h5>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color dom"></span>
              <span className="legend-label">DOM Success Rate</span>
            </div>
            <div className="legend-item">
              <span className="legend-color visual"></span>
              <span className="legend-label">Visual Success Rate</span>
            </div>
          </div>
          <div className="chart-container">
            <svg className="comparison-chart" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet">
              {/* Y-axis grid and labels */}
              {[0, 25, 50, 75, 100].map(y => (
                <g key={y}>
                  <line
                    x1={margin.left}
                    y1={yScale(y)}
                    x2={chartWidth - margin.right}
                    y2={yScale(y)}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left - 10}
                    y={yScale(y) + 5}
                    fill="#64748b"
                    fontSize="12"
                    textAnchor="end"
                  >
                    {y}%
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {reports.map((report, index) => (
                <text
                  key={index}
                  x={xScale(index)}
                  y={chartHeight - margin.bottom + 20}
                  fill="#64748b"
                  fontSize="12"
                  textAnchor="middle"
                >
                  Report {index + 1}
                </text>
              ))}

              {/* Data lines */}
              {reports.length > 1 && (
                <>
                  <path
                    d={domLinePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    className="trends-line dom"
                  />
                  <path
                    d={visualLinePath}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    className="trends-line visual"
                  />
                </>
              )}

              {/* Data points */}
              {reports.map((report, index) => (
                <g key={index}>
                  <circle
                    cx={xScale(index)}
                    cy={yScale(report.domResult?.summary?.successRate)}
                    r="4"
                    fill="#3b82f6"
                    className="data-point"
                  />
                  <circle
                    cx={xScale(index)}
                    cy={yScale(report.visualResult?.summary?.successRate)}
                    r="4"
                    fill="#8b5cf6"
                    className="data-point"
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Detailed Reports Table */}
        <div className="reports-comparison">
          <h5>Detailed Report Comparison</h5>
          <div className="comparison-table">
            <div className="table-header">
              <div className="header-cell">Report</div>
              <div className="header-cell">DOM Success<small>Rate</small></div>
              <div className="header-cell">Visual Success<small>Rate</small></div>
              <div className="header-cell">Total Tests</div>
              <div className="header-cell">Execution<small>Time</small></div>
            </div>
            {reports.map((report, index) => (
              <div key={index} className="table-row">
                <div className="row-label">
                  {formatTimestamp(report.timestamp || report.id)}
                </div>
                <div className="row-cell">
                  {report.domResult?.summary?.successRate || 0}%
                </div>
                <div className="row-cell">
                  {report.visualResult?.summary?.successRate || 0}%
                </div>
                <div className="row-cell">
                  {((report.domResult?.summary?.totalTests || 0) + (report.visualResult?.summary?.totalTests || 0))}
                </div>
                <div className="row-cell">
                  {(report.executionTimeMs / 1000).toFixed(2)}s
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compare;