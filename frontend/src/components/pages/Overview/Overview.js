import React, { useEffect, useState } from 'react';
import './Overview.css';
import { fetchRecentActivity } from './activityApi';

function Overview() {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadActivity() {
      const data = await fetchRecentActivity();
      if (isMounted) setActivity(data);
    }
    loadActivity();
    const interval = setInterval(loadActivity, 5000); // Poll every 5 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="overview-section">
      <h2 className="overview-title">Automation Testing Tool</h2>

      {/* Dashboard Cards */}
      <div className="dashboard-cards">
        <div className="card">
          <div className="card-icon">
            <i className="fas fa-code"></i>
          </div>
          <div className="card-content">
            <h3>DOM Testing</h3>
            <p>Test web page structure and HTML elements</p>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'dom-tests' }))}>
              Start DOM Tests
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-icon">
            <i className="fas fa-eye"></i>
          </div>
          <div className="card-content">
            <h3>Visual Testing</h3>
            <p>Compare visual appearance across different states</p>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'visual-tests' }))}>
              Start Visual Tests
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {activity.slice(0, 3).map((item) => (
            <div className="activity-item" key={item.id}>
              <div className="activity-icon">
                <i className={
                  item.type === 'success'
                    ? 'fas fa-check-circle'
                    : item.type === 'error'
                    ? 'fas fa-exclamation-circle'
                    : 'fas fa-info-circle'
                }></i>
              </div>
              <div className="activity-details">
                <p>{item.message}</p>
                <span>{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Overview;