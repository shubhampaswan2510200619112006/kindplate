require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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
app.use(express.json({ limit: '10kb' })); // Added payload limit
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Donation = mongoose.model('Donation', donationSchema);

// ========== MULTER ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

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
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
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
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/user', auth, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
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
    const tag = hoursDiff < 2 ? 'Urgent' : 'Fresh';

    const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

    const donation = new Donation({
      user: req.user._id,
      foodName,
      quantity,
      location,
      expiry,
      image: imagePath,
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

// Get all donations
app.get('/api/donations', async (req, res) => {
  try {
    const donations = await Donation.find().populate('user', 'name').sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's donations
app.get('/api/my-donations', auth, async (req, res) => {
  try {
    const donations = await Donation.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Request pickup (update status)
app.post('/api/request-pickup/:id', authLimiter, auth, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Not found' });
    donation.status = 'Picked';
    await donation.save();
    res.json({ message: 'Pickup requested' });
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
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: `You are Jarvis, a helpful AI assistant for KindPlate (a food donation platform). The user says: "${message}". Keep your reply extremely concise, friendly, and helpful. 1-2 short sentences maximum.` }] }
        ],
    });
    res.json({ reply: response.text });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ reply: "I'm having trouble connecting to my neural network right now. Try again later!" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));