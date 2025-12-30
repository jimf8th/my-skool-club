import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SystemStatus from './SystemStatus';

const Home = () => {
  const [currentMember, setCurrentMember] = useState(null);

  useEffect(() => {
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      try {
        setCurrentMember(JSON.parse(memberData));
      } catch (error) {
        console.error('Error parsing member data:', error);
      }
    }
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="bg-light">
        <div className="container-fluid">
          <div className="row align-items-center py-5">
            <div className="col-lg-6 px-4">
              <h1 className="display-4 fw-bold text-primary mb-3">
                Manage Your School Clubs
              </h1>
              <p className="lead mb-4">
                Connect, organize, and grow your high school clubs with MySkoolClub. 
                A comprehensive platform designed specifically for high school students 
                to discover, join, and manage their extracurricular activities.
              </p>
              {!currentMember && (
                <div className="d-flex gap-3 flex-wrap">
                  <Link to="/member-signup" className="btn btn-primary btn-lg">
                    <i className="fas fa-user-plus me-2"></i>
                    Member Signup
                  </Link>
                  <Link to="/member-login" className="btn btn-success btn-lg">
                    <i className="fas fa-sign-in-alt me-2"></i>
                    Member Login
                  </Link>
                </div>
              )}
            </div>
            <div className="col-lg-6 text-center">
              <div className="p-4">
                <i className="fas fa-graduation-cap text-primary" style={{fontSize: '8rem'}}></i>
                <div className="mt-3">
                  <div className="badge bg-success fs-6 px-3 py-2">
                    <i className="fas fa-check me-2"></i>
                    Student Focused
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5">
        <div className="container">
          <div className="row text-center mb-5">
            <div className="col-12">
              <h2 className="fw-bold mb-3">Why Choose MySkoolClub?</h2>
              <p className="lead text-muted">Everything you need to manage your school's club ecosystem</p>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <div className="mb-3">
                    <i className="fas fa-search text-primary" style={{fontSize: '3rem'}}></i>
                  </div>
                  <h5 className="card-title">Discover Clubs</h5>
                  <p className="card-text">Find clubs that match your interests and passions. Browse by category, meeting times, or activity type.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <div className="mb-3">
                    <i className="fas fa-calendar-alt text-success" style={{fontSize: '3rem'}}></i>
                  </div>
                  <h5 className="card-title">Event Management</h5>
                  <p className="card-text">Organize meetings, events, and activities. Keep track of attendance and send reminders to members.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <div className="mb-3">
                    <i className="fas fa-comments text-info" style={{fontSize: '3rem'}}></i>
                  </div>
                  <h5 className="card-title">Communication</h5>
                  <p className="card-text">Stay connected with club members through announcements, discussions, and direct messaging.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Status Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <SystemStatus />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!currentMember && (
        <section className="py-5 bg-primary text-white">
          <div className="container text-center">
            <div className="row">
              <div className="col-12">
                <h2 className="fw-bold mb-3">Ready to Get Started?</h2>
                <p className="lead mb-4">Join Today</p>
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <Link to="/member-signup" className="btn btn-light btn-lg">
                    <i className="fas fa-user-plus me-2"></i>
                    Member Signup
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default Home;