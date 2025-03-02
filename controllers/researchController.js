// controllers/researchController.js
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db } = require('../config/firebase');
const xml2js = require('xml2js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to parse arXiv XML response
const parseArxivResponse = async (xmlData) => {
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlData);
  return result.feed.entry || [];
};

// Format arXiv entry to paper object
const formatArxivPaper = (entry) => ({
  title: Array.isArray(entry.title) ? entry.title[0] : entry.title,
  abstract: Array.isArray(entry.summary) ? entry.summary[0] : entry.summary,
  authors: entry.author?.map(author => author.name?.[0] || author),
  year: new Date(entry.published?.[0]).getFullYear(),
  url: entry.id?.[0],
  venue: 'arXiv',
});

// Personalized recommendations
exports.getPersonalizedRecommendations = async (req, res) => {
  const userId = req.user.id;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const interests = userData.interests || [];

    if (interests.length === 0) {
      return res.status(400).json({ error: 'No interests found' });
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Convert these research interests to an arXiv search query: ${interests.join(', ')}. Respond ONLY with the query.`;
      const optimizedQuery = (await model.generateContent(prompt)).response.text().trim();

      // Fetch papers from arXiv
      const response = await axios.get(
        `http://export.arxiv.org/api/query`, {
          params: {
            search_query: `all:${optimizedQuery}`,
            sortBy: 'lastUpdatedDate',
            sortOrder: 'descending',
            max_results: 5
          }
        }
      );

      const entries = await parseArxivResponse(response.data);
      const recommendations = entries.map(formatArxivPaper);

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
    const response = await axios.get(
      'http://export.arxiv.org/api/query',
      {
        params: {
          search_query: `all:${query}`,
          sortBy: 'lastUpdatedDate',
          sortOrder: 'descending',
          max_results: 10
        }
      }
    );

    const entries = await parseArxivResponse(response.data);
    const papers = entries.map(formatArxivPaper);

    res.json(papers);
  } catch (err) {
    console.error('Paper recommendation error:', err);
    res.status(500).json({ error: 'Paper recommendation failed' });
  }
};

// Search for researchers (using arXiv author search)
exports.searchResearchers = async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    // Search for papers by author
    const response = await axios.get(
      'http://export.arxiv.org/api/query',
      {
        params: {
          search_query: `au:${query}`,
          sortBy: 'lastUpdatedDate',
          sortOrder: 'descending',
          max_results: 20
        }
      }
    );

    const entries = await parseArxivResponse(response.data);
    
    // Extract and deduplicate authors
    const authorMap = new Map();
    
    entries.forEach(entry => {
      const authors = entry.author || [];
      authors.forEach(author => {
        const name = author.name?.[0] || author;
        if (!authorMap.has(name)) {
          authorMap.set(name, {
            name: name,
            papers: [],
            paperCount: 0
          });
        }
        
        const authorData = authorMap.get(name);
        authorData.paperCount++;
        if (authorData.papers.length < 5) {
          authorData.papers.push({
            title: Array.isArray(entry.title) ? entry.title[0] : entry.title,
            year: new Date(entry.published?.[0]).getFullYear()
          });
        }
      });
    });

    const researchers = Array.from(authorMap.values())
      .filter(author => author.name.toLowerCase().includes(query.toLowerCase()))
      .map(author => ({
        name: author.name,
        paperCount: author.paperCount,
        recentPapers: author.papers
      }));

    res.json({ researchers });
  } catch (err) {
    console.error('Researcher search error:', err);
    res.status(500).json({ 
      error: 'Researcher search failed',
      details: err.message 
    });
  }
};