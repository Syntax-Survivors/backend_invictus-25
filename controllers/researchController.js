// controllers/researchController.js
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db } = require('../config/firebase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Personalized recommendations
exports.getPersonalizedRecommendations = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user interests
    const userDoc = await db.collection('users').doc(userId).get();
    const interests = userDoc.data().interests || [];

    if (interests.length === 0) {
      return res.status(400).json({ error: 'No interests found' });
    }

    // Generate search query with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Convert these research interests to academic paper search query: ${interests.join(', ')}. Respond ONLY with the query.`;
    const optimizedQuery = (await model.generateContent(prompt)).response.text();

    // Fetch papers
    const response = await axios.get(
      'https://api.semanticscholar.org/graph/v1/paper/search',
      {
        params: {
          query: optimizedQuery,
          limit: 15,
          fields: 'title,abstract,authors,year,citationCount'
        }
      }
    );

    // Filter results with Gemini
    const papers = response.data.data;
    const filterPrompt = `From these papers: ${papers.map(p => p.title).join(', ')}, select top 5 most relevant to ${interests.join(', ')}. Respond as JSON array: [ { title, reason } ]`;
    const filtered = await model.generateContent(filterPrompt);
    
    res.json(JSON.parse(filtered.response.text()));

  } catch (err) {
    res.status(500).json({ error: 'Personalized recommendations failed' });
  }
};