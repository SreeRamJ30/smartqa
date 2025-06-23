import React, { useState } from 'react';
import './Login.css';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Reset error state
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Login successful
      console.log('Login successful:', data);
      
      // Store user data in localStorage or sessionStorage based on remember me
      if (rememberMe) {
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        sessionStorage.setItem('user', JSON.stringify(data.user));
      }
      
      // Navigate to dashboard instead of showing an alert
      navigate('/dashboard');
      
    } catch (error) {
      setError(error.message || 'An error occurred during login');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-banner">
          <h1>Automation Testing</h1>
          <p>DOM & Visual Testing Platform</p>
          <div className="auth-brand-images">
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-code"></i>
              </div>
              <h3>DOM Testing</h3>
              <p>Test your application's structure with precision</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-eye"></i>
              </div>
              <h3>Visual Testing</h3>
              <p>Ensure visual perfection across all devices</p>
            </div>
          </div>
        </div>

        <div className="auth-form-container">
          <div className="auth-form-wrapper">
            <div className="auth-header">
              <h2>Welcome Back</h2>
              <p>Log in to your account to continue</p>
            </div>
            
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-with-icon">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    id="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-options">
                <div className="remember-me">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="rememberMe">Remember me</label>
                </div>
                <a href="#forgot-password" className="forgot-password">Forgot Password?</a>
              </div>
              
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              
              <div className="auth-divider">
                <span>or</span>
              </div>
              
              <div className="social-login">
                <button type="button" className="social-btn google" disabled>
                  <i className="fab fa-google"></i>
                  Sign in with Google
                </button>
              </div>
            </form>
            
            <div className="auth-footer">
              <p>Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;