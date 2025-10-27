// server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Security middleware - Verify headers
const verifyHeaders = (req, res, next) => {
  const mHeader = req.headers['m'];
  const kHeader = req.headers['k'];
  
  // Replace with your actual security values
  const EXPECTED_M = process.env.SECURITY_M;
  const EXPECTED_K = process.env.SECURITY_K;
  
  if (mHeader !== EXPECTED_M || kHeader !== EXPECTED_K) {
    return res.status(401).json({
      status: '00',
      message: 'Unauthorized: Invalid security headers'
    });
  }
  
  next();
};

// POST endpoint for receiving sensor data
app.post('/MagnetAPI', verifyHeaders, async (req, res) => {
  try {
    const { cmd, device, battery, time, dIndex, data } = req.body;
    
    // Validate required fields
    if (!cmd || !device || !battery || !time || !dIndex || !data) {
      return res.status(400).json({
        status: '00',
        message: 'Missing required fields'
      });
    }
    
    // Validate command type
    if (cmd !== 'RP') {
      return res.status(400).json({
        status: '00',
        message: 'Invalid command type. Expected "RP"'
      });
    }
    
    // Convert UTC+0 time to ISO format and add timezone info
    const utcTime = new Date(time + 'Z'); // Append Z for UTC
    
    // Prepare data for Supabase
    const sensorData = {
      device_id: device,
      battery_voltage: parseFloat(battery),
      received_time_utc: time,
      received_time_iso: utcTime.toISOString(),
      data_index: dIndex,
      overflow_percentage: parseInt(data),
      command_type: cmd,
      created_at: new Date().toISOString()
    };
    
    // Insert into Supabase
    const { data: insertedData, error } = await supabase
      .from('wastebin_sensors')
      .insert([sensorData]);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        status: '00',
        message: `Database error: ${error.message}`
      });
    }
    
    // Success response
    res.status(200).json({
      status: '01',
      message: ''
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      status: '00',
      message: `Server error: ${error.message}`
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Wastebin Sensor API Service',
    endpoints: {
      post_data: '/MagnetAPI',
      health_check: '/health'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoint: https://your-app.onrender.com/MagnetAPI`);
});
