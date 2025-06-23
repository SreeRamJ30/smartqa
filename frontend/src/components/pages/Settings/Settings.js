import React from 'react';
import './Settings.css';

function Settings() {
  return (
    <div className="settings-section">
      <h2>Settings</h2>
      <p>Configure application settings and preferences.</p>
      
      <div className="settings-container">
        <div className="settings-group">
          <h3>General Settings</h3>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Default Test Environment</label>
              <p className="setting-description">Choose the default environment for tests</p>
            </div>
            <div className="setting-control">
              <select>
                <option>Development</option>
                <option>Staging</option>
                <option>Production</option>
              </select>
            </div>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Automatically save reports</label>
              <p className="setting-description">Save test reports automatically when tests complete</p>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Notification Settings</h3>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Email Notifications</label>
              <p className="setting-description">Receive email notifications for test results</p>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Email Address</label>
              <p className="setting-description">Email address for notifications</p>
            </div>
            <div className="setting-control">
              <input type="email" placeholder="your@email.com" />
            </div>
          </div>
        </div>
        
        <div className="settings-actions">
          <button className="save-button">Save Settings</button>
          <button className="reset-button">Reset to Default</button>
        </div>
      </div>
    </div>
  );
}

export default Settings;