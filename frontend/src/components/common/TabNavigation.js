import React from 'react';
import './TabNavigation.css';

/**
 * Modern tabbed navigation component with support for badges and icons
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.onTabChange - Function to call when tab is changed
 * @param {Object} props.resultCounts - Object containing counts for badges
 */
const TabNavigation = ({ activeTab, onTabChange, resultCounts = {} }) => {
  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: 'fas fa-chart-pie',
      tooltip: 'Summary and statistics overview'
    },
    { 
      id: 'dom', 
      label: 'DOM Results', 
      icon: 'fas fa-code',
      count: resultCounts.dom || 0,
      tooltip: 'DOM structure comparison results'
    },
    { 
      id: 'visual', 
      label: 'Visual Results', 
      icon: 'fas fa-eye',
      count: resultCounts.visual || 0, 
      tooltip: 'Visual regression testing results'
    }
  ];

  return (
    <div className="tab-navigation">
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.tooltip}
          >
            <div className="tab-icon">
              <i className={tab.icon}></i>
            </div>
            <span className="tab-label">{tab.label}</span>
            {tab.count > 0 && (
              <span className="tab-badge">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabNavigation;