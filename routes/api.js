// routes/api.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const researchController = require('../controllers/researchController');
const userController = require('../controllers/userController');

// Add these new routes
router.put('/interests', authMiddleware, userController.updateInterests);
router.get('/interests', authMiddleware, userController.getInterests);
router.get('/recommendations/personalized', authMiddleware, researchController.getPersonalizedRecommendations);

// Existing routes
router.post('/register', authController.register);
router.get('/recommendations', researchController.getRecommendations);

module.exports = router;