import express from 'express';
import cors from 'cors';
const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Mock endpoint for testing school creation
app.post('/api/schools', (req, res) => {
  console.log('Received school data:', req.body);
  
  // Validate required field
  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'School name is required'
    });
  }
  
  // Mock successful response
  res.json({
    success: true,
    message: 'School created successfully',
    data: {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    }
  });
});

// Get all schools endpoint
app.get('/api/schools', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Test High School',
        city: 'Test City',
        type: 'Public',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Demo Middle School',
        city: 'Demo City',
        type: 'Private',
        createdAt: new Date().toISOString()
      }
    ]
  });
});

// Mock endpoint for testing member creation
app.post('/api/members', (req, res) => {
  console.log('Received member data:', req.body);
  
  // Validate required fields
  if (!req.body.firstName || !req.body.firstName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'First name is required'
    });
  }
  
  if (!req.body.lastName || !req.body.lastName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Last name is required'
    });
  }
  
  if (!req.body.email || !req.body.email.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  if (!req.body.memberType || !req.body.memberType.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Member type is required'
    });
  }
  
  // Mock successful response
  res.json({
    success: true,
    message: 'Member registered successfully!',
    data: {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    }
  });
});

// Get all members endpoint
app.get('/api/members', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        memberType: 'student',
        gradeLevel: '11',
        schoolId: '1',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        memberType: 'teacher',
        schoolId: '1',
        createdAt: new Date().toISOString()
      }
    ]
  });
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/schools - Create a new school');
  console.log('  GET /api/schools - Get all schools');
  console.log('  POST /api/members - Create a new member (student or teacher)');
  console.log('  GET /api/members - Get all members');
});