const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ extended: false }));

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/habit_tracker';
    await mongoose.connect(uri);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.warn('Backend server is running but functionality requiring a database will fail.');
  }
};

connectDB();

// Start background listeners
try {
  require('./services/notificationService').startListeners();
} catch (e) {
  console.error('Failed to start notification listeners', e.message);
}

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user/state', require('./routes/userState'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/account', require('./routes/account'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack || err.message || err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Server error';
  res.status(status).json({ msg: message });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
