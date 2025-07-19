import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authenticateJWT } from './middleware/auth.js'; 

import authRoutes from './routes/authRoutes.js';
import refreshTokenRoute from './routes/refreshTokenRoute.js';
import shopRoutes  from './routes/shopRoutes.js';




dotenv.config();
const app = express();

const allowedOrigins = ['http://localhost:8080', 'http://192.168.100.175:8080'];

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.json()); // 

// ✅ No session or passport config here

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// ✅ Routes
app.use('/api/auth', authRoutes);  // 
app.use('/api/auth', refreshTokenRoute);
app.use('/api/shop', shopRoutes);




// ✅ Testing routes
app.get('/api/public', (req, res) => {
  res.json({ message: "This is a public route", timestamp: new Date() });
});

app.get('/api/protected', authenticateJWT, (req, res) => {
  res.json({ 
    message: "This is a protected route",
    user: req.user,
    timestamp: new Date() 
  });
});

// Home route (optional)
app.get('/', (req, res) => {
  res.send('<h1>JWT Auth Server Running</h1>');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
