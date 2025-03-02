// controllers/researchController.js
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db } = require('../config/firebase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to clean JSON response from markdown
const cleanJsonResponse = (text) => {
  // Remove markdown code block indicators and any surrounding whitespace
  return text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
};

// Personalized recommendations
exports.getPersonalizedRecommendations = async (req, res) => {
  const userId = req.user.id;

  try {
    console.log('Getting recommendations for user:', userId);
    
    // Get user interests
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error('User document not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const interests = userData.interests || [];
    console.log('User interests:', interests);

    if (interests.length === 0) {
      return res.status(400).json({ error: 'No interests found' });
    }

    // Generate search query with Gemini
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Changed to gemini-pro
      const prompt = `Convert these research interests to academic paper search query: ${interests.join(', ')}. Respond ONLY with the query.`;
      const optimizedQuery = (await model.generateContent(prompt)).response.text().trim();
      console.log('Generated query:', optimizedQuery);

      // Fetch papers with all relevant fields
      const response = await axios.get(
        'https://api.semanticscholar.org/graph/v1/paper/search',
        {
          params: {
            query: optimizedQuery,
            limit: 5,
            fields: 'title,abstract,authors,year,citationCount,url,venue'
          }
        }
      );

      const papers = response.data.data;
      console.log('Found papers count:', papers.length);

      if (!papers || papers.length === 0) {
        return res.json({ recommendations: [] });
      }

      // Transform papers to include all fields
      const recommendations = papers.map(paper => ({
        title: paper.title,
        abstract: paper.abstract || 'Abstract not available',
        authors: paper.authors?.map(author => author.name) || [],
        year: paper.year,
        citationCount: paper.citationCount || 0,
        url: paper.url || 'URL not available',
        venue: paper.venue
      }));

      res.json({ recommendations });

    } catch (aiError) {
      console.error('AI/Search error:', aiError);
      return res.status(500).json({ 
        error: 'AI processing failed',
        details: aiError.message
      });
    }

  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ 
      error: 'Personalized recommendations failed',
      details: err.message
    });
  }
};

// General recommendations (non-personalized)
exports.getRecommendations = async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    // Prepare request configuration
    const requestConfig = {
      params: {
        query: query,
        limit: 10,
        fields: 'title,abstract,authors,year,citationCount,url'  // Added url field
      }
    };

    // Only add API key header if a valid key is provided
    if (process.env.SEMANTIC_SCHOLAR_API_KEY && process.env.SEMANTIC_SCHOLAR_API_KEY !== 'optional_key') {
      requestConfig.headers = {
        'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY
      };
    }

    // Fetch papers based on direct query
    const response = await axios.get(
      'https://api.semanticscholar.org/graph/v1/paper/search',
      requestConfig
    );

    res.json(response.data.data || []);
  } catch (err) {
    console.error('Paper recommendation error:', err);
    res.status(500).json({ error: 'Paper recommendation failed' });
  }
};

// Search for researchers
exports.searchResearchers = async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    // Prepare request configuration
    const requestConfig = {
      params: {
        query: query,
        limit: 10,
        fields: 'name,affiliations,paperCount,citationCount,homepage,papers.year,papers.title'
      }
    };

    // Add API key if available
    if (process.env.SEMANTIC_SCHOLAR_API_KEY && process.env.SEMANTIC_SCHOLAR_API_KEY !== 'optional_key') {
      requestConfig.headers = {
        'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY
      };
    }

    // Fetch researchers based on query
    const response = await axios.get(
      'https://api.semanticscholar.org/graph/v1/author/search',
      requestConfig
    );

    const researchers = response.data.data || [];

    // Transform and clean up the data
    const formattedResearchers = researchers.map(researcher => ({
      name: researcher.name,
      affiliations: researcher.affiliations || [],
      paperCount: researcher.paperCount || 0,
      citationCount: researcher.citationCount || 0,
      homepage: researcher.homepage || null,
      recentPapers: (researcher.papers || [])
        .sort((a, b) => (b.year || 0) - (a.year || 0))
        .slice(0, 5)
        .map(paper => ({
          title: paper.title,
          year: paper.year
        }))
    }));

    res.json({ researchers: formattedResearchers });
  } catch (err) {
    console.error('Researcher search error:', err);
    res.status(500).json({ 
      error: 'Researcher search failed',
      details: err.message 
    });
  }
};