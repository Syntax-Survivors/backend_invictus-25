// routes/api.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const researchController = require('../controllers/researchController');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const { db } = require('../config/firebase');

// Add these new routes
router.put('/interests', authMiddleware, userController.updateInterests);
router.get('/interests', authMiddleware, userController.getInterests);
router.get('/recommendations/personalized', authMiddleware, researchController.getPersonalizedRecommendations);
router.get('/researchers', researchController.searchResearchers);

// Existing routes
router.post('/register', authController.register);
router.get('/recommendations', researchController.getRecommendations);

router.get('/test-firebase', async (req, res) => {
    try {
      const docRef = db.collection('test').doc('testDoc');
      await docRef.set({ message: 'Firebase connection works!' });
      const doc = await docRef.get();
      res.json(doc.data());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

module.exports = router;