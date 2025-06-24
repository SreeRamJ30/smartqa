import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

// Import all page components
import Overview from './pages/Overview/Overview';
import Sitemap from './pages/Sitemap/Sitemap';
import DOMTests from './pages/DOMTests/DOMTests';
import DOMResults from './pages/DOMResults/DOMResults';
import VisualTests from './pages/VisualTests/VisualTests';
import VisualResults from './pages/VisualResults/VisualResults';
import Settings from './pages/Settings/Settings';
import CombinedResults from './pages/CombinedResults/CombinedResults';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const navigate = useNavigate();
  
  const [systemStatus, setSystemStatus] = useState('online'); // 'online', 'offline', 'maintenance'
  const [notifications, setNotifications] = useState([]);
  const [testProgress, setTestProgress] = useState({
    running: 0,
    queued: 0,
    completed: 0
  });
  
  // Add state for test options dropdown
  const [showTestOptions, setShowTestOptions] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingSection, setLoadingSection] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Dropdown state for sidebar groups
  const [openDropdowns, setOpenDropdowns] = useState({
    sitemap: true,
    dom: true,
    visual: true,
    settings: true
  });

  // Live test counts for DOM, Visual, Combined
  const [testCounts, setTestCounts] = useState({
    dom: { running: 0, completed: 0 },
    visual: { running: 0, completed: 0 },
    combined: { running: 0, completed: 0 }
  });

  // Handle clicking outside the test options dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTestOptions && !event.target.closest('.test-dropdown-container')) {
        setShowTestOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTestOptions]);

  // Handle clicking outside the user dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Check if user is logged in
  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem('user')) || 
                        JSON.parse(sessionStorage.getItem('user'));
    
    if (!loggedInUser) {
      // Redirect to login if no user found
      navigate('/login');
      return;
    }
    
    setUser(loggedInUser);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  // Add navigation event listener to allow components to navigate between sections
  useEffect(() => {
    const handleNavigationEvent = (event) => {
      if (event.detail) {
        changeActiveSection(event.detail);
      }
    };

    window.addEventListener('navigate-section', handleNavigationEvent);
    
    return () => {
      window.removeEventListener('navigate-section', handleNavigationEvent);
    };
  }, []);

  const changeActiveSection = (section) => {
    setLoadingSection(true);
    setActiveSection(section);
    
    // Simulate loading effect for better UX
    setTimeout(() => {
      setLoadingSection(false);
    }, 300);
  };

  // Toggle sidebar collapsed state and handle mobile overlay
  const toggleSidebar = () => {
    // Detect mobile
    if (window.innerWidth <= 900) {
      setIsSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  // Toggle dropdown for sidebar groups
  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Initial fetch for test progress indicators
  useEffect(() => {
    // Fetch live test counts from backend API
    let interval;
    const fetchCounts = () => {
      fetch('http://localhost:3001/api/test-counts')
        .then(res => res.json())
        .then(data => {
          console.log('Live test counts:', data); // Debug: log the response
          setTestCounts(data);
        })
        .catch((err) => {
          console.error('Error fetching test counts:', err);
        });
    };
    fetchCounts();
    interval = setInterval(fetchCounts, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Export Combined Report handler
  const handleExportCombinedReport = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/export-combined-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success && data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Failed to export combined report: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      alert('Error exporting combined report: ' + error.message);
    }
  };

  // Render content based on active section
  const renderContent = () => {
    if (loadingSection) {
      return (
        <div className="section-loading">
          <div className="loader"></div>
          <p>Loading content...</p>
        </div>
      );
    }
    
    switch(activeSection) {
      case 'overview':
        return <Overview />;
      case 'sitemaps':
        return <Sitemap />;
      case 'dom-tests':
        return <DOMTests />;
      case 'dom-results':
        return <DOMResults />;
      case 'visual-tests':
        return <VisualTests />;
      case 'visual-results':
        return <VisualResults />;
      case 'settings':
        return <Settings />;
      case 'combined-results':
        return <CombinedResults />;
      default:
        return <Overview />;
    }
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Hamburger & Overlay */}
      <button className="sidebar-hamburger" onClick={toggleSidebar} aria-label="Open menu">
        <span className="hamburger-bar"></span>
        <span className="hamburger-bar"></span>
        <span className="hamburger-bar"></span>
      </button>
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
      {/* Global Status Bar */}
      <div className={`global-status-bar status-${systemStatus}`}>
        <div className="status-indicator">
          <span className={`status-dot ${systemStatus}`}></span>
          <span className="status-text">System {systemStatus}</span>
        </div>
        {/* Live Test Status Counts */}
        <div className="test-status-bar">
          <div className="test-status-group">
            <span className="test-status-label">DOM</span>
            <span className="test-status-running">Running: <b>{testCounts.dom.running}</b></span>
            <span className="test-status-completed">Completed: <b>{testCounts.dom.completed}</b></span>
          </div>
          <div className="test-status-group">
            <span className="test-status-label">Visual</span>
            <span className="test-status-running">Running: <b>{testCounts.visual.running}</b></span>
            <span className="test-status-completed">Completed: <b>{testCounts.visual.completed}</b></span>
          </div>
          <div className="test-status-group">
            <span className="test-status-label">Combined</span>
            <span className="test-status-running">Running: <b>{testCounts.combined.running}</b></span>
            <span className="test-status-completed">Completed: <b>{testCounts.combined.completed}</b></span>
          </div>
        </div>
        <div className="system-notifications">
          {notifications.length > 0 ? (
            <div className="notification-indicator">
              <i className="fas fa-bell"></i>
              <span className="notification-count">{notifications.length}</span>
            </div>
          ) : (
            <div className="notification-indicator empty">
              <i className="fas fa-bell-slash"></i>
            </div>
          )}
        </div>
        <div className="current-time">
          {currentTime}
        </div>
      </div>

      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>Test Automation</h2>
          {/* Modern Switch Toggle */}
          <label className="pro-switch">
            <input type="checkbox" checked={!isSidebarCollapsed} onChange={toggleSidebar} aria-label="Toggle sidebar" />
            <span className="pro-slider"></span>
          </label>
        </div>
        
        <div className="sidebar-menu">
          <div className={`menu-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => changeActiveSection('overview')}>
            <i className="fas fa-home"></i>
            <span>Overview</span>
          </div>

          {/* Sitemap Management Dropdown */}
          <div className="menu-category dropdown-header" onClick={() => toggleDropdown('sitemap')}>
            <span>Sitemap Management</span>
            <i className={`fas fa-chevron-${openDropdowns.sitemap ? 'down' : 'right'}`}></i>
          </div>
          {openDropdowns.sitemap && (
            <div className="dropdown-group">
              <div className={`menu-item ${activeSection === 'sitemaps' ? 'active' : ''}`} onClick={() => changeActiveSection('sitemaps')}>
                <i className="fas fa-sitemap"></i>
                <span>Sitemaps</span>
              </div>
              <div className={`menu-item ${activeSection === 'combined-results' ? 'active' : ''}`} onClick={() => changeActiveSection('combined-results')}>
                <i className="fas fa-layer-group"></i>
                <span>Combined Results</span>
              </div>
            </div>
          )}

          {/* DOM Testing Dropdown */}
          <div className="menu-category dropdown-header" onClick={() => toggleDropdown('dom')}>
            <span>DOM Testing</span>
            <i className={`fas fa-chevron-${openDropdowns.dom ? 'down' : 'right'}`}></i>
          </div>
          {openDropdowns.dom && (
            <div className="dropdown-group">
              <div className={`menu-item ${activeSection === 'dom-tests' ? 'active' : ''}`} onClick={() => changeActiveSection('dom-tests')}>
                <i className="fas fa-code"></i>
                <span>DOM Tests</span>
              </div>
              <div className={`menu-item ${activeSection === 'dom-results' ? 'active' : ''}`} onClick={() => changeActiveSection('dom-results')}>
                <i className="fas fa-list-check"></i>
                <span>DOM Results</span>
              </div>
            </div>
          )}

          {/* Visual Testing Dropdown */}
          <div className="menu-category dropdown-header" onClick={() => toggleDropdown('visual')}>
            <span>Visual Testing</span>
            <i className={`fas fa-chevron-${openDropdowns.visual ? 'down' : 'right'}`}></i>
          </div>
          {openDropdowns.visual && (
            <div className="dropdown-group">
              <div className={`menu-item ${activeSection === 'visual-tests' ? 'active' : ''}`} onClick={() => changeActiveSection('visual-tests')}>
                <i className="fas fa-eye"></i>
                <span>Visual Tests</span>
              </div>
              <div className={`menu-item ${activeSection === 'visual-results' ? 'active' : ''}`} onClick={() => changeActiveSection('visual-results')}>
                <i className="fas fa-images"></i>
                <span>Visual Results</span>
              </div>
            </div>
          )}

          {/* Settings Dropdown */}
          <div className="menu-category dropdown-header" onClick={() => toggleDropdown('settings')}>
            <span>Settings</span>
            <i className={`fas fa-chevron-${openDropdowns.settings ? 'down' : 'right'}`}></i>
          </div>
          {openDropdowns.settings && (
            <div className="dropdown-group">
              <div className={`menu-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => changeActiveSection('settings')}>
                <i className="fas fa-gear"></i>
                <span>Settings</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`dashboard-main${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        {/* Enhanced Top bar */}
        <div className="dashboard-topbar">
          <div className="topbar-left">
            <div className="topbar-title">
              {activeSection === 'overview' && <><i className="fas fa-home mr-2"></i>Overview</>}
              {activeSection === 'sitemaps' && <><i className="fas fa-sitemap mr-2"></i>Sitemap Management</>}
              {activeSection === 'combined-results' && <><i className="fas fa-layer-group mr-2"></i>Combined Results</>}
              {activeSection === 'dom-tests' && <><i className="fas fa-code mr-2"></i>DOM Testing</>}
              {activeSection === 'dom-results' && <><i className="fas fa-list-check mr-2"></i>DOM Test Results</>}
              {activeSection === 'visual-tests' && <><i className="fas fa-eye mr-2"></i>Visual Testing</>}
              {activeSection === 'visual-results' && <><i className="fas fa-images mr-2"></i>Visual Test Results</>}
              {activeSection === 'settings' && <><i className="fas fa-gear mr-2"></i>Settings</>}
            </div>
            
            {/* Quick action buttons */}
            <div className="topbar-actions">
              <div className="test-dropdown-container">
                <button 
                  className="action-button primary" 
                  onClick={() => setShowTestOptions(!showTestOptions)}
                  aria-label="Create New Test"
                  title="Create New Test"
                >
                  <i className="fas fa-plus"></i> New Test
                </button>
                
                {showTestOptions && (
                  <div className="test-options-dropdown">
                    <div 
                      className="test-option" 
                      onClick={() => {
                        changeActiveSection('sitemaps');
                        setShowTestOptions(false);
                      }}
                    >
                      <i className="fas fa-layer-group"></i> DOM & Visual Test
                    </div>
                    <div 
                      className="test-option" 
                      onClick={() => {
                        changeActiveSection('dom-tests');
                        setShowTestOptions(false);
                      }}
                    >
                      <i className="fas fa-code"></i> DOM Test
                    </div>
                    <div 
                      className="test-option" 
                      onClick={() => {
                        changeActiveSection('visual-tests');
                        setShowTestOptions(false);
                      }}
                    >
                      <i className="fas fa-eye"></i> Visual Test
                    </div>
                  </div>
                )}
              </div>
              <button 
                className="action-button" 
                onClick={() => window.location.reload()}
                aria-label="Refresh data"
                title="Refresh data"
              >
                <i className="fas fa-sync-alt refresh-icon"></i> Refresh
              </button>
            </div>
          </div>
          
          <div className="topbar-user">
            <div className="user-dropdown-container" style={{ position: 'relative' }}>
              <div className="user-info" onClick={() => setShowUserDropdown((v) => !v)} style={{ cursor: 'pointer' }}>
                <span>{user?.fullName || 'User'}</span>
                <i className="fas fa-user-circle"></i>
              </div>
              {showUserDropdown && (
                <div className="user-dropdown">
                  <div className="dropdown-avatar">
                    <i className="fas fa-user-circle"></i>
                    <div>
                      <div className="dropdown-name">{user?.fullName || 'User'}</div>
                      <div className="dropdown-mail">{user?.email || 'N/A'}</div>
                    </div>
                  </div>
                  <hr />
                  <div className="dropdown-action" onClick={() => changeActiveSection('settings')}>
                    <i className="fas fa-cog"></i> View Profile
                  </div>
                </div>
              )}
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Sign out">
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="dashboard-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;