const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
  const { email, name, password, expertise } = req.body;
  
  try {
    // Check if user already exists
    const existingUsers = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (!existingUsers.empty) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const userRef = db.collection('users').doc();
    await userRef.set({ 
      email, 
      name, 
      expertise,
      password: hashedPassword,
      interests: [] 
    });

    const token = jwt.sign({ id: userRef.id }, process.env.JWT_SECRET);
    res.status(201).json({ token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(400).json({ error: 'Registration failed' });
  }
};

exports.signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const usersRef = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (usersRef.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = usersRef.docs[0];
    const user = userDoc.data();

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: userDoc.id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    console.error('Sign in error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};