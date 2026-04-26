require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'MISSING_KEY' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP temporarily so external fonts/scripts don't break
app.use(cors()); // Allow all for local dev/testing
app.use(express.json({ limit: '10mb' })); // Larger limit to support base64 image payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10, // max 10 requests per windowMs
  message: { error: 'Too many login attempts, please try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150, 
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', apiLimiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('public'));

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// ========== SCHEMAS ==========
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Donor', 'NGO', 'Volunteer'], default: 'Donor' },
}, { timestamps: true });

const donationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodName: { type: String, required: true },
  quantity: { type: String, required: true },
  location: { type: String, required: true },
  expiry: { type: Date, required: true },
  image: { type: String, default: '' },
  tag: { type: String, enum: ['Fresh', 'Urgent'], default: 'Fresh' },
  status: { type: String, enum: ['Pending', 'Picked'], default: 'Pending' },
  pickedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickupLocation: { lat: Number, lng: Number, address: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Donation = mongoose.model('Donation', donationSchema);

// ========== MULTER — Memory Storage ==========
// Images are stored as base64 data URLs in MongoDB.
// This makes images persistent across server restarts and Render re-deploys.
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};
const upload = multer({
  storage: multer.memoryStorage(), // store in RAM, not disk
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


// ========== AUTH MIDDLEWARE ==========
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) throw new Error();
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// ========== ROUTES ==========

// Signup
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const userRole = role || 'Donor';
    const user = new User({ name, email, password: hashed, role: userRole });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/user', auth, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

// Create donation
app.post('/api/donate', auth, upload.single('image'), async (req, res) => {
  try {
    const { foodName, quantity, location, expiry } = req.body;
    if (!foodName || !quantity || !location || !expiry) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const now = new Date();
    const expDate = new Date(expiry);
    const hoursDiff = (expDate - now) / (1000 * 60 * 60);
    const tag = hoursDiff <= 0 ? 'Expired' : hoursDiff <= 24 ? 'Urgent' : 'Fresh';

    // Convert uploaded image to base64 data URL so it's stored in MongoDB
    // and survives server restarts / Render re-deploys
    let imageData = '';
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      imageData = `data:${req.file.mimetype};base64,${base64}`;
    }

    const donation = new Donation({
      user: req.user._id,
      foodName,
      quantity,
      location,
      expiry,
      image: imageData,
      tag
    });
    await donation.save();
    await donation.populate('user', 'name');

    res.status(201).json({ donation, message: 'Donation added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get all donations (tags recalculated dynamically on every fetch)
app.get('/api/donations', async (req, res) => {
  try {
    const donations = await Donation.find().populate('user', 'name').populate('pickedBy', 'name email role').sort({ createdAt: -1 });
    const now = new Date();
    const updated = donations.map(d => {
      const obj = d.toObject();
      const expDate = new Date(d.expiry);
      const hoursDiff = (expDate - now) / (1000 * 60 * 60);
      if (expDate < now) {
        obj.tag = 'Expired';
      } else if (hoursDiff <= 24) {
        obj.tag = 'Urgent';
      } else {
        obj.tag = 'Fresh';
      }
      return obj;
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's donations
app.get('/api/my-donations', auth, async (req, res) => {
  try {
    const donations = await Donation.find({ user: req.user._id }).populate('pickedBy', 'name email role').sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Request pickup (update status and location)
app.post('/api/request-pickup/:id', authLimiter, auth, async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Not found' });
    if (donation.status === 'Picked') return res.status(400).json({ error: 'Already picked up' });
    
    donation.status = 'Picked';
    donation.pickedBy = req.user._id;
    if (lat && lng) {
      donation.pickupLocation = { lat, lng, address: address || 'Location shared' };
    }
    
    await donation.save();
    res.json({ message: 'Pickup requested successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Chatbot Route
app.post('/api/chat', apiLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ reply: "I'm currently running in offline mode. Please add your GEMINI_API_KEY to the .env file to activate my AI brain." });
    }
    // Inject real date so the AI knows today's date/time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: `You are Jarvis, a helpful AI assistant for KindPlate (a food donation platform). Today is ${dateStr} and the current time is ${timeStr} (IST). The user says: "${message}". Keep your reply extremely concise, friendly, and helpful. 1-2 short sentences maximum.` }] }
        ],
    });
    res.json({ reply: response.text });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ reply: "I'm having trouble connecting to my neural network right now. Try again later!" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));