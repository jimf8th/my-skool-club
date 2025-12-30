import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white mt-auto py-4">
      <div className="container">
        <div className="row">
          {/* About Section */}
          <div className="col-md-4 mb-3">
            <h5 className="mb-3 text-white">
              <i className="fas fa-graduation-cap me-2"></i>
              MySkoolClub
            </h5>
            <p className="text-white-50 small">
              A comprehensive platform designed specifically for high school students 
              to discover, join, and manage their extracurricular activities.
            </p>
          </div>

          {/* Quick Links */}
          <div className="col-md-4 mb-3">
            <h5 className="mb-3 text-white">Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/" className="text-white-50 text-decoration-none small hover-link">
                  <i className="fas fa-home me-2"></i>Home
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/member-signup" className="text-white-50 text-decoration-none small hover-link">
                  <i className="fas fa-user-plus me-2"></i>Member Signup
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/member-login" className="text-white-50 text-decoration-none small hover-link">
                  <i className="fas fa-sign-in-alt me-2"></i>Member Login
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/contact" className="text-white-50 text-decoration-none small hover-link">
                  <i className="fas fa-envelope me-2"></i>Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div className="col-md-4 mb-3">
            <h5 className="mb-3 text-white">Connect With Us</h5>
            <div className="mb-3">
              <a href="#" className="text-white me-3 hover-link" aria-label="Facebook">
                <i className="fab fa-facebook fa-lg"></i>
              </a>
              <a href="#" className="text-white me-3 hover-link" aria-label="Twitter">
                <i className="fab fa-twitter fa-lg"></i>
              </a>
              <a href="#" className="text-white me-3 hover-link" aria-label="Instagram">
                <i className="fab fa-instagram fa-lg"></i>
              </a>
              <a href="#" className="text-white hover-link" aria-label="LinkedIn">
                <i className="fab fa-linkedin fa-lg"></i>
              </a>
            </div>
            <p className="text-white-50 small mb-0">
              <i className="fas fa-envelope me-2"></i>
              support@myskoolclub.com
            </p>
          </div>
        </div>

        <hr className="bg-secondary" />

        {/* Copyright & Legal */}
        <div className="row">
          <div className="col-md-8 text-center text-md-start">
            <p className="mb-0 small text-white-50">
              © {currentYear} MySkoolClub. All rights reserved.
            </p>
          </div>
          <div className="col-md-4 text-center text-md-end">
            <Link to="/privacy-policy" className="text-white-50 text-decoration-none small me-3 hover-link">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-white-50 text-decoration-none small hover-link">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
