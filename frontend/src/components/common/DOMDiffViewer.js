import React from 'react';
import './DOMDiffViewer.css';

/**
 * Enhanced DOM Difference Viewer component that provides a more
 * intuitive visualization of DOM differences than simple +/- markers
 * 
 * @param {Object} props - Component props
 * @param {Array|Object} props.differences - DOM differences to visualize
 * @param {string} props.context - Context for the diff ('sitemap', 'standalone', etc.)
 * @param {string} props.testingUrl - URL of the testing page (for sitemap context)
 * @param {string} props.referenceUrl - URL of the reference page (for sitemap context)
 */
const DOMDiffViewer = ({ differences, context = 'standalone', testingUrl, referenceUrl }) => {
  // Debug: Log differences prop to check what is being passed
  console.log('DOMDiffViewer differences:', differences);
  // Handle null, undefined, or empty differences
  if (!differences || 
      (Array.isArray(differences) && differences.length === 0) ||
      (typeof differences === 'object' && Object.keys(differences).length === 0)) {
    return (
      <div className="no-differences">
        <i className="fas fa-check-circle"></i>
        <p>No DOM differences detected. The elements match between reference and testing sites.</p>
        {context === 'sitemap' && testingUrl && referenceUrl && (
          <div className="sitemap-match-info">
            <small>Pages compared: {new URL(testingUrl).pathname} ↔ {new URL(referenceUrl).pathname}</small>
          </div>
        )}
      </div>
    );
  }

  // Normalize differences to array format
  let diffsArray = differences;
  if (!Array.isArray(differences)) {
    if (typeof differences === 'object') {
      diffsArray = Object.values(differences);
    } else {
      diffsArray = [differences];
    }
  }
  
  // Check if we have the backend format (objects with 'issue' property)
  const isBackendFormat = diffsArray.length > 0 && 
                         typeof diffsArray[0] === 'object' && 
                         diffsArray[0] !== null &&
                         Object.prototype.hasOwnProperty.call(diffsArray[0], 'issue');
  
  if (isBackendFormat) {
    return renderBackendFormat(diffsArray, context, testingUrl, referenceUrl);
  }
  
  // Handle standard format for backward compatibility
  return renderStandardFormat(diffsArray, context, testingUrl, referenceUrl);
};

/**
 * Renders differences in the backend format (with 'issue' property)
 */
const renderBackendFormat = (diffsArray, context, testingUrl, referenceUrl) => {
  const addedCount = diffsArray.filter(diff => 
    diff.issue && diff.issue.includes('only in testing DOM')).length;
  const removedCount = diffsArray.filter(diff => 
    diff.issue && diff.issue.includes('only in reference DOM')).length;
  const modifiedCount = diffsArray.filter(diff => 
    diff.issue && !diff.issue.includes('only in')).length;

  return (
    <div className={`dom-diff-container ${context === 'sitemap' ? 'sitemap-context' : ''}`}>
      {/* Sitemap-specific header */}
      {context === 'sitemap' && testingUrl && referenceUrl && (
        <div className="sitemap-diff-header">
          <div className="sitemap-context-info">
            <h6><i className="fas fa-sitemap"></i> Sitemap Page DOM Comparison</h6>
            <div className="page-comparison-urls">
              <div className="url-comparison-item testing">
                <span className="url-label">Testing:</span>
                <span className="url-path">{new URL(testingUrl).pathname}</span>
                <span className="url-domain">{new URL(testingUrl).hostname}</span>
              </div>
              <div className="comparison-arrow">
                <i className="fas fa-exchange-alt"></i>
              </div>
              <div className="url-comparison-item reference">
                <span className="url-label">Reference:</span>
                <span className="url-path">{new URL(referenceUrl).pathname}</span>
                <span className="url-domain">{new URL(referenceUrl).hostname}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="diff-summary">
        <div className="diff-summary-title">
          {context === 'sitemap' ? 'Page DOM Differences' : 'DOM Differences Summary'}
        </div>
        <div className="diff-stats">
          <div className="diff-stat-item">
            <span className="diff-stat-count added">{addedCount}</span>
            <span>Added elements</span>
          </div>
          <div className="diff-stat-item">
            <span className="diff-stat-count removed">{removedCount}</span>
            <span>Removed elements</span>
          </div>
          {modifiedCount > 0 && (
            <div className="diff-stat-item">
              <span className="diff-stat-count modified">{modifiedCount}</span>
              <span>Modified elements</span>
            </div>
          )}
        </div>
      </div>

      <div className="diff-elements-container">
        {diffsArray.map((diff, index) => {
          let type = 'modified';
          if (diff.issue && diff.issue.includes('only in testing DOM')) {
            type = 'added';
          } else if (diff.issue && diff.issue.includes('only in reference DOM')) {
            type = 'removed';
          }
          
          return (
            <div 
              key={index}
              className={`dom-diff-element ${type} ${context === 'sitemap' ? 'sitemap-element' : ''}`}
            >
              <span className={`diff-marker diff-marker-${type}`}>
                {type === 'added' ? '+' : type === 'removed' ? '-' : '~'}
              </span>
              
              <div className="element-content">
                <span className="issue-description">
                  {context === 'sitemap' ? 
                    `${diff.issue || 'DOM difference detected'} in page comparison` : 
                    (diff.issue || 'DOM difference detected')
                  }
                </span>
                
                {/* Enhanced content display for sitemap testing */}
                <div className="diff-content-comparison">
                  {diff.testing && diff.testing !== 'missing' && (
                    <div className="content-side testing">
                      <span className="content-label">Testing Content:</span>
                      <div className="content-preview">
                        {typeof diff.testing === 'string' ? 
                          (diff.testing.length > 150 ? `${diff.testing.substring(0, 150)}...` : diff.testing) :
                          JSON.stringify(diff.testing).substring(0, 150) + '...'
                        }
                      </div>
                    </div>
                  )}
                  
                  {diff.reference && diff.reference !== 'missing' && (
                    <div className="content-side reference">
                      <span className="content-label">Reference Content:</span>
                      <div className="content-preview">
                        {typeof diff.reference === 'string' ? 
                          (diff.reference.length > 150 ? `${diff.reference.substring(0, 150)}...` : diff.reference) :
                          JSON.stringify(diff.reference).substring(0, 150) + '...'
                        }
                      </div>
                    </div>
                  )}
                </div>
                
                {diff.element && (
                  <div className="element-details">
                    <span className="tag-name">&lt;{diff.element.tagName || 'unknown'}&gt;</span>
                    {diff.element.attributes && Object.keys(diff.element.attributes).length > 0 && (
                      <span className="attributes"> {renderAttributes(diff.element.attributes)}</span>
                    )}
                  </div>
                )}
                
                {diff.path && (
                  <div className="element-path">
                    <span className="path-label">DOM Path: </span>
                    <span className="path-value">{diff.path}</span>
                  </div>
                )}

                {/* Additional sitemap-specific information */}
                {context === 'sitemap' && (
                  <div className="sitemap-diff-meta">
                    <div className="diff-impact-level">
                      <span className={`impact-badge ${getImpactLevel(diff)}`}>
                        {getImpactLevel(diff)} impact
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Renders differences in the standard format
 */
const renderStandardFormat = (diffsArray, context, testingUrl, referenceUrl) => {
  // Normalize and flatten if needed
  if (Array.isArray(diffsArray[0])) {
    diffsArray = diffsArray.flat();
  }
  
  // Add missing type property if not present
  diffsArray = diffsArray.map(diff => {
    if (!diff.type && diff.action) {
      return { ...diff, type: diff.action.toLowerCase() };
    }
    if (!diff.type) {
      return { ...diff, type: "removed" }; // Default type
    }
    return diff;
  });
  
  // Count added and removed elements
  const addedCount = diffsArray.filter(diff => diff.type === 'added').length;
  const removedCount = diffsArray.filter(diff => diff.type === 'removed').length;

  return (
    <div className={`dom-diff-container ${context === 'sitemap' ? 'sitemap-context' : ''}`}>
      {/* Sitemap-specific header */}
      {context === 'sitemap' && testingUrl && referenceUrl && (
        <div className="sitemap-diff-header">
          <div className="sitemap-context-info">
            <h6><i className="fas fa-sitemap"></i> Sitemap Page DOM Comparison</h6>
            <div className="page-comparison-urls">
              <div className="url-comparison-item testing">
                <span className="url-label">Testing:</span>
                <span className="url-path">{new URL(testingUrl).pathname}</span>
              </div>
              <div className="comparison-arrow">
                <i className="fas fa-exchange-alt"></i>
              </div>
              <div className="url-comparison-item reference">
                <span className="url-label">Reference:</span>
                <span className="url-path">{new URL(referenceUrl).pathname}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="diff-summary">
        <div className="diff-summary-title">
          {context === 'sitemap' ? 'Page DOM Differences' : 'DOM Differences Summary'}
        </div>
        <div className="diff-stats">
          <div className="diff-stat-item">
            <span className="diff-stat-count added">{addedCount}</span>
            <span>Added elements</span>
          </div>
          <div className="diff-stat-item">
            <span className="diff-stat-count removed">{removedCount}</span>
            <span>Removed elements</span>
          </div>
        </div>
      </div>

      <div className="diff-elements-container">
        {diffsArray.map((diff, index) => (
          <div 
            key={index}
            className={`dom-diff-element ${diff.type} ${context === 'sitemap' ? 'sitemap-element' : ''}`}
          >
            <span className={`diff-marker diff-marker-${diff.type}`}>
              {diff.type === 'added' ? '+' : '-'}
            </span>
            
            <div className="element-parent-path">
              {diff.parentPath || diff.parent || 'root'}
            </div>
            
            <div className="element-content">
              <span className="tag-name">&lt;{diff.tagName || diff.tag || 'div'}</span>
              {diff.attributes && Object.keys(diff.attributes).length > 0 && (
                <span className="attributes"> {renderAttributes(diff.attributes)}</span>
              )}
              <span className="tag-name">&gt;</span>
              
              {(diff.textContent || diff.text) && (
                <span className="element-text"> {diff.textContent || diff.text}</span>
              )}
              
              {(diff.hasChildren || (diff.children && diff.children.length > 0)) && (
                <div className="dom-diff-nested">
                  <span className="nested-indicator">
                    {diff.childrenCount || (diff.children ? diff.children.length : '+') || '+'} nested elements (click to expand)
                  </span>
                </div>
              )}
              
              <span className="tag-name">&lt;/{diff.tagName || diff.tag || 'div'}&gt;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Helper function to render element attributes
 */
const renderAttributes = (attributes) => {
  if (!attributes || Object.keys(attributes).length === 0) {
    return '';
  }
  
  return Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
};

/**
 * Helper function to determine impact level of a difference
 */
const getImpactLevel = (diff) => {
  if (!diff.issue) return 'medium';
  
  const issue = diff.issue.toLowerCase();
  
  // High impact: structural changes, navigation elements
  if (issue.includes('nav') || issue.includes('menu') || issue.includes('header') || 
      issue.includes('footer') || issue.includes('form') || issue.includes('button')) {
    return 'high';
  }
  
  // Low impact: content-only changes, styling elements
  if (issue.includes('text') || issue.includes('span') || issue.includes('div') ||
      issue.includes('style') || issue.includes('class')) {
    return 'low';
  }
  
  return 'medium';
};

/**
 * Renders a line-by-line diff view with enhanced styling
 */
export const LineDiffViewer = ({ diffLines }) => {
  if (!diffLines || diffLines.length === 0) {
    return null;
  }

  return (
    <div className="line-by-line-diff">
      <div className="line-diff-header">
        <i className="fas fa-code"></i>
        <span>Line-by-Line DOM Comparison</span>
      </div>
      
      <div className="view-labels">
        <div className="test-label">TESTING</div>
        <div className="ref-label">REFERENCE</div>
      </div>
      
      <div className="line-diff-content">
        {diffLines.map((line, index) => (
          <div key={index} className={`line-diff-row ${line.type}`}>
            <span className="line-diff-marker">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            <pre className="line-diff-code" dangerouslySetInnerHTML={{ __html: highlightChanges(line.value, line.type) }}></pre>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Helper function to highlight specific changes within a line
 */
const highlightChanges = (value, type) => {
  // This is a simplified version - for production use, 
  // you might want to use a diff library to identify specific changes
  if (!value) return '';
  
  // Basic highlighting for demonstration purposes
  if (type === 'added') {
    return `<span class="highlight-add">${value}</span>`;
  } else if (type === 'removed') {
    return `<span class="highlight-remove">${value}</span>`;
  }
  return value;
};

export default DOMDiffViewer;