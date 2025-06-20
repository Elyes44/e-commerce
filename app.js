import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import './middleware/auth.js'; 
import authRoutes from './routes/authRoutes.js';
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);



// Test Routes (put this after other middleware but before error handlers)
app.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Auth Test</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        button { 
          padding: 10px 15px; 
          background: #007bff; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
          margin: 5px;
        }
        button:hover { background: #0069d9; }
        .protected { background: #28a745; }
        .protected:hover { background: #218838; }
        .token { width: 100%; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Authentication Test</h1>
        
        <h2>OAuth Login</h2>
        <a href="/api/auth/google">
          <button>Test Google Login</button>
        </a>
        <a href="/api/auth/facebook">
          <button>Test Facebook Login</button>
        </a>
        
        <h2>JWT Test</h2>
        <button onclick="testPublicRoute()">Test Public Route</button>
        <button class="protected" onclick="testProtectedRoute()">Test Protected Route</button>
        <div id="tokenDisplay" class="token"></div>
        
        <script>
          async function testPublicRoute() {
            const res = await fetch('/api/public');
            const data = await res.json();
            alert('Public route: ' + JSON.stringify(data));
          }
          
          async function testProtectedRoute() {
            const token = localStorage.getItem('jwtToken');
            if (!token) return alert('No token found. Login first!');
            
            try {
              const res = await fetch('/api/protected', {
                headers: { 'Authorization': 'Bearer ' + token }
              });
              const data = await res.json();
              alert('Protected route: ' + JSON.stringify(data));
            } catch (err) {
              alert('Error: ' + err.message);
            }
          }
          
          // Display token after OAuth login
          if (window.location.hash.includes('token=')) {
            const token = window.location.hash.split('token=')[1].split('&')[0];
            localStorage.setItem('jwtToken', token);
            document.getElementById('tokenDisplay').innerText = 'JWT: ' + token;
          }
        </script>
      </div>
    </body>
    </html>
  `);
});

// Add these test API endpoints
app.get('/api/public', (req, res) => {
  res.json({ message: "This is a public route", timestamp: new Date() });
});

app.get('/api/protected', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ 
    message: "This is a protected route",
    user: req.user,
    timestamp: new Date() 
  });
});




// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});