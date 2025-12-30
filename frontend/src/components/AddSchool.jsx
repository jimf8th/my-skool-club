import React, { useState } from 'react';
import { apiService } from '../services/apiService';

const AddSchool = () => {
  const [school, setSchool] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phoneNumber: '',
    email: '',
    website: '',
    principalName: '',
    principalEmail: '',
    type: '',
    establishedYear: '',
    studentCapacity: '',
    adminEmails: ['']
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSchool(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdminEmailChange = (index, value) => {
    setSchool(prev => ({
      ...prev,
      adminEmails: prev.adminEmails.map((email, i) => i === index ? value : email)
    }));
  };

  const addAdminEmail = () => {
    setSchool(prev => ({
      ...prev,
      adminEmails: [...prev.adminEmails, '']
    }));
  };

  const removeAdminEmail = (index) => {
    setSchool(prev => ({
      ...prev,
      adminEmails: prev.adminEmails.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', school);
    
    // Validate required field
    if (!school.name.trim()) {
      setMessage({ type: 'error', text: 'School name is required' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Convert numeric fields to numbers or null if empty, and process adminEmails
      const schoolData = {
        ...school,
        name: school.name.trim(), // Ensure name is trimmed
        establishedYear: school.establishedYear ? parseInt(school.establishedYear) : null,
        studentCapacity: school.studentCapacity ? parseInt(school.studentCapacity) : null,
        adminEmails: school.adminEmails.map(email => email.trim()).filter(email => email.length > 0)
      };

      console.log('Sending school data:', schoolData);
      
      const response = await apiService.post('/schools', schoolData);
      
      console.log('API response:', response);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'School created successfully!' });
        // Reset form
        setSchool({
          name: '',
          description: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          phoneNumber: '',
          email: '',
          website: '',
          principalName: '',
          principalEmail: '',
          type: '',
          establishedYear: '',
          studentCapacity: '',
          adminEmails: ['']
        });
      } else {
        console.error('API error:', response);
        setMessage({ type: 'error', text: response.message || 'Failed to create school' });
      }
    } catch (error) {
      console.error('Exception caught:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while creating the school' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="text-primary mb-0">
              <i className="fas fa-school me-2"></i>
              Add New School
            </h2>
            <a href="/school-management" className="btn btn-outline-primary">
              <i className="fas fa-cog me-2"></i>
              Manage Schools
            </a>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">School Information</h4>
            </div>
            <div className="card-body">
              {message.text && (
                <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`} role="alert">
                  {message.text}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage({ type: '', text: '' })}
                    aria-label="Close"
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Required Field */}
                <div className="mb-3 row">
                  <label htmlFor="name" className="col-sm-3 col-form-label">
                    School Name <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={school.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter school name"
                    />
                  </div>
                </div>

                {/* Optional Fields */}
                <div className="mb-3 row">
                  <label htmlFor="description" className="col-sm-3 col-form-label">Description</label>
                  <div className="col-sm-9">
                    <textarea
                      className="form-control"
                      id="description"
                      name="description"
                      value={school.description}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Brief description of the school"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="type" className="col-sm-3 col-form-label">School Type</label>
                  <div className="col-sm-9">
                    <select
                      className="form-control"
                      id="type"
                      name="type"
                      value={school.type}
                      onChange={handleChange}
                    >
                      <option value="">Select type</option>
                      <option value="Public">Public</option>
                      <option value="Private">Private</option>
                      <option value="Charter">Charter</option>
                      <option value="Magnet">Magnet</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="establishedYear" className="col-sm-3 col-form-label">Established Year</label>
                  <div className="col-sm-9">
                    <input
                      type="number"
                      className="form-control"
                      id="establishedYear"
                      name="establishedYear"
                      value={school.establishedYear}
                      onChange={handleChange}
                      min="1800"
                      max={new Date().getFullYear()}
                      placeholder="e.g., 1995"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="address" className="col-sm-3 col-form-label">Address</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="address"
                      name="address"
                      value={school.address}
                      onChange={handleChange}
                      placeholder="Street address"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="city" className="col-sm-3 col-form-label">City</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="city"
                      name="city"
                      value={school.city}
                      onChange={handleChange}
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="state" className="col-sm-3 col-form-label">State</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="state"
                      name="state"
                      value={school.state}
                      onChange={handleChange}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="zipCode" className="col-sm-3 col-form-label">ZIP Code</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="zipCode"
                      name="zipCode"
                      value={school.zipCode}
                      onChange={handleChange}
                      placeholder="ZIP Code"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="country" className="col-sm-3 col-form-label">Country</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="country"
                      name="country"
                      value={school.country}
                      onChange={handleChange}
                      placeholder="Country"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="studentCapacity" className="col-sm-3 col-form-label">Student Capacity</label>
                  <div className="col-sm-9">
                    <input
                      type="number"
                      className="form-control"
                      id="studentCapacity"
                      name="studentCapacity"
                      value={school.studentCapacity}
                      onChange={handleChange}
                      min="1"
                      placeholder="e.g., 500"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="phoneNumber" className="col-sm-3 col-form-label">Phone Number</label>
                  <div className="col-sm-9">
                    <input
                      type="tel"
                      className="form-control"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={school.phoneNumber}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="email" className="col-sm-3 col-form-label">Email</label>
                  <div className="col-sm-9">
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={school.email}
                      onChange={handleChange}
                      placeholder="info@school.edu"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="website" className="col-sm-3 col-form-label">Website</label>
                  <div className="col-sm-9">
                    <input
                      type="url"
                      className="form-control"
                      id="website"
                      name="website"
                      value={school.website}
                      onChange={handleChange}
                      placeholder="https://www.school.edu"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="principalName" className="col-sm-3 col-form-label">Principal Name</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="principalName"
                      name="principalName"
                      value={school.principalName}
                      onChange={handleChange}
                      placeholder="Principal's full name"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="principalEmail" className="col-sm-3 col-form-label">Principal Email</label>
                  <div className="col-sm-9">
                    <input
                      type="email"
                      className="form-control"
                      id="principalEmail"
                      name="principalEmail"
                      value={school.principalEmail}
                      onChange={handleChange}
                      placeholder="principal@school.edu"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label className="col-sm-3 col-form-label">Admin Emails</label>
                  <div className="col-sm-9">
                    {school.adminEmails.map((email, index) => (
                      <div key={index} className="d-flex mb-2">
                        <input
                          type="email"
                          className="form-control me-2"
                          value={email}
                          onChange={(e) => handleAdminEmailChange(index, e.target.value)}
                          placeholder="admin@school.edu"
                        />
                        {school.adminEmails.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeAdminEmail(index)}
                            title="Remove this email"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={addAdminEmail}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Add Admin Email
                    </button>
                    
                    <div className="form-text mt-2">
                      Enter email addresses of members who should have admin access to this school.
                    </div>
                  </div>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus me-2"></i>
                        Add School
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSchool;