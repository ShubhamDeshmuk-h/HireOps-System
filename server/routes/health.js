const express = require('express');
const router = express.Router();
const axios = require('axios');

// Health check for Node.js backend
router.get('/node-backend', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'node-backend',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Health check for Python backend
router.get('/python-backend', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:8000/health', {
      timeout: 5000
    });
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'python-backend',
      version: response.data.version || '1.0.0',
      details: response.data
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'python-backend',
      error: error.message
    });
  }
});

// Overall system health
router.get('/system', async (req, res) => {
  try {
    const [nodeHealth, pythonHealth] = await Promise.allSettled([
      axios.get('http://localhost:5000/api/health/node-backend'),
      axios.get('http://localhost:8000/health')
    ]);

    const systemStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        'node-backend': nodeHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        'python-backend': pythonHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy'
      }
    };

    // Overall status is unhealthy if any service is down
    if (systemStatus.services['node-backend'] === 'unhealthy' || 
        systemStatus.services['python-backend'] === 'unhealthy') {
      systemStatus.status = 'degraded';
    }

    res.json(systemStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router; 