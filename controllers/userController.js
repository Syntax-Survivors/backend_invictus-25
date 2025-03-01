// controllers/userController.js
const { db, admin } = require('../config/firebase');

exports.updateInterests = async (req, res) => {
  const userId = req.user.id;
  const { interests } = req.body;

  if (!interests) {
    return res.status(400).json({ error: 'Interests are required' });
  }

  try {
    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Normalize interests to array and remove duplicates
    const interestsArray = Array.isArray(interests) 
      ? [...new Set(interests)]
      : [interests];

    // Validate interests are non-empty strings and check length
    if (!interestsArray.every(interest => 
      typeof interest === 'string' && interest.trim().length > 0
    )) {
      return res.status(400).json({ error: 'Invalid interest format' });
    }

    // Limit number of interests
    if (interestsArray.length > 10) {
      return res.status(400).json({ error: 'Maximum of 10 interests allowed' });
    }

    await db.collection('users').doc(userId).update({
      interests: interestsArray,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      interests: interestsArray 
    });
  } catch (err) {
    console.error('Interest update failed:', err);
    res.status(500).json({ error: 'Interest update failed' });
  }
};

exports.getInterests = async (req, res) => {
  const userId = req.user.id;

  try {
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = doc.data();
    res.json({
      interests: userData.interests || [],
      updatedAt: userData.updatedAt
    });
  } catch (err) {
    console.error('Failed to fetch interests:', err);
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
};