import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

// Utility function to hash password using Web Crypto API (same as signup)
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const MemberLogin = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      // User is already logged in, redirect to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!credentials.email.trim()) {
      setMessage({ type: 'error', text: 'Email is required' });
      return;
    }
    
    if (!credentials.password.trim()) {
      setMessage({ type: 'error', text: 'Password is required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Hash the password before sending (same as signup)
      const passwordHash = await hashPassword(credentials.password);
      
      const loginData = {
        email: credentials.email.trim().toLowerCase(),
        passwordHash: passwordHash
      };

      console.log('Sending login request for:', credentials.email);
      
      const response = await apiService.post('/auth/login', loginData);
      
      console.log('Login response:', response);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Login successful!' });
        
        // Store authentication data (if provided by backend)
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        if (response.user) {
          localStorage.setItem('currentMember', JSON.stringify(response.user));
        }
        
        // Reset form
        setCredentials({
          email: '',
          password: ''
        });
        
        // Redirect to dashboard after successful login
        setTimeout(() => {
          // Use window.location to ensure navbar refreshes
          window.location.href = '/dashboard';
        }, 1500);
        
      } else {
        console.error('Login failed:', response);
        setMessage({ type: 'error', text: response.message || 'Login failed. Please check your credentials.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred during login' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h4 className="mb-0">
                <i className="fas fa-sign-in-alt me-2"></i>
                Member Login
              </h4>
            </div>
            <div className="card-body">
              {message.text && (
                <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} alert-dismissible fade show`} role="alert">
                  {message.text}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage({ type: '', text: '' })}
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3 row">
                  <label htmlFor="email" className="col-sm-3 col-form-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={credentials.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="password" className="col-sm-3 col-form-label">
                    Password <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={credentials.password}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Logging in...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Login
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center mt-3">
                <p className="mb-0">
                  Don't have an account? 
                  <a href="/member-signup" className="text-decoration-none ms-1">
                    Sign up here
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberLogin;