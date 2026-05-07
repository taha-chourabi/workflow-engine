require('dotenv').config();

const express = require('express');

const cors = require('cors');

const morgan = require('morgan');

const { connectDB } = require('./src/config/db');

const errorHandler = require('./src/middleware/errorHandler');



// Import routes

const authRoutes = require('./src/routes/authRoutes');

const adminRoutes = require('./src/routes/adminRoutes');

const requestRoutes = require('./src/routes/requestRoutes');

const workflowRoutes = require('./src/routes/workflowRoutes');

const notificationRoutes = require('./src/routes/notificationRoutes');

const chatRoutes = require('./src/routes/chatRoutes');

const friendshipRoutes = require('./src/routes/friendshipRoutes');



// Connexion DB

connectDB();



const app = express();



// Middlewares

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));



// Static files for uploads

app.use('/uploads', express.static('uploads'));



// Routes

app.use('/api/auth', authRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/requests', requestRoutes);

app.use('/api/workflows', workflowRoutes);

app.use('/api/notifications', notificationRoutes);

app.use('/api/chats', require('./src/routes/chatRoutes'));

app.use('/api/friendship', friendshipRoutes);



// Test endpoint for chat debugging

app.get('/api/test-chat/:id', (req, res) => {

  console.log('Test endpoint hit for chat ID:', req.params.id);

  res.json({ message: 'Test endpoint working', chatId: req.params.id });

});



// Health check

app.get('/api/health', (req, res) => {

  res.status(200).json({ status: 'OK', message: 'SOTACIB API running' });

});



// Error handler (last)

app.use(errorHandler);



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(`✅ Server running on port ${PORT}`);

});