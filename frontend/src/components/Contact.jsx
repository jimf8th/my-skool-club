import React, { useState } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create mailto link with form data
    const mailtoLink = `mailto:support@myskoolclub.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`;
    
    window.location.href = mailtoLink;
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-envelope me-2"></i>
                Contact Us
              </h4>
            </div>
            <div className="card-body">
              {/* Contact Information */}
              <div className="alert alert-info mb-4">
                <h5 className="alert-heading">
                  <i className="fas fa-info-circle me-2"></i>
                  Get in Touch
                </h5>
                <p className="mb-2">
                  We're here to help! For any inquiries, questions, or support requests, please reach out to us:
                </p>
                <hr />
                <p className="mb-0">
                  <i className="fas fa-envelope me-2"></i>
                  <strong>Email:</strong> <a href="mailto:support@myskoolclub.com">support@myskoolclub.com</a>
                </p>
              </div>

              {/* Contact Form */}
              <h5 className="text-primary border-bottom pb-2 mb-3">Send us a Message</h5>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">
                    Your Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Your Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="subject" className="form-label">
                    Subject <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    placeholder="What is your inquiry about?"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="message" className="form-label">
                    Message <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="message"
                    name="message"
                    rows="6"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    placeholder="Please describe your inquiry or issue in detail..."
                  ></textarea>
                </div>

                <div className="d-grid">
                  <button type="submit" className="btn btn-primary btn-lg">
                    <i className="fas fa-paper-plane me-2"></i>
                    Send Message
                  </button>
                </div>

                <div className="mt-3">
                  <small className="text-muted">
                    <span className="text-danger">*</span> All fields are required
                  </small>
                </div>
              </form>

              {/* Additional Information */}
              <div className="mt-4 pt-3 border-top">
                <h6 className="text-primary mb-3">Common Inquiries</h6>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Account and membership questions
                  </li>
                  <li className="mb-2">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Club management and administration
                  </li>
                  <li className="mb-2">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Technical support and troubleshooting
                  </li>
                  <li className="mb-2">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Billing and payment inquiries
                  </li>
                  <li className="mb-2">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Feature requests and feedback
                  </li>
                </ul>
                <p className="text-muted mt-3">
                  <small>
                    We aim to respond to all inquiries within 24-48 hours during business days.
                  </small>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
