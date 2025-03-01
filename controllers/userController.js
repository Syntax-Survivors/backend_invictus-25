// controllers/userController.js
const { db } = require('../config/firebase');

exports.updateInterests = async (req, res) => {
  const { userId } = req.user; // From JWT
  const { interests } = req.body;

  try {
    await db.collection('users').doc(userId).update({
      interests: Array.isArray(interests) ? interests : [interests]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Interest update failed' });
  }
};

exports.getInterests = async (req, res) => {
  const { userId } = req.user;

  try {
    const doc = await db.collection('users').doc(userId).get();
    res.json(doc.data().interests || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
};