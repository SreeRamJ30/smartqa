import React, { useState } from 'react';
import './SignUp.css';
import { Link, useNavigate } from 'react-router-dom';

function SignUp() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Reset error state
    setError('');
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Registration successful
      console.log('Registration successful:', data);
      
      // Show success message and redirect to login
      alert('Registration successful! Please log in.');
      navigate('/login');
      
    } catch (error) {
      setError(error.message || 'An error occurred during registration');
      console.error('Registration error:', error);
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
              <h2>Create Account</h2>
              <p>Join our automation testing platform</p>
            </div>
            
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-with-icon">
                  <i className="fas fa-user"></i>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-with-icon">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-with-icon">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="terms-checkbox">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  required
                />
                <label htmlFor="agreeTerms">I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a></label>
              </div>
              
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
              
              <div className="auth-divider">
                <span>or</span>
              </div>
              
              <div className="social-login">
                <button type="button" className="social-btn google" disabled>
                  <i className="fab fa-google"></i>
                  Sign up with Google
                </button>
              </div>
            </form>
            
            <div className="auth-footer">
              <p>Already have an account? <Link to="/login" className="auth-link">Log In</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;