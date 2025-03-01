const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// Simplified user registration
exports.register = async (req, res) => {
  const { email, name, expertise } = req.body;
  try {
    const userRef = db.collection('users').doc();
    await userRef.set({ email, name, expertise, interests: [] });
    const token = jwt.sign({ id: userRef.id }, process.env.JWT_SECRET);
    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ error: 'Registration failed' });
  }
};