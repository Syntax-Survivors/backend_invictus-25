const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate search optimization prompt
async function enhanceQuery(userQuery) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  const prompt = `
    Act as a research assistant. Optimize this raw user query for academic paper search: 
    "${userQuery}". 
    Respond ONLY with the improved search phrase, no explanations.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// Generate recommendations from paper titles
async function explainRecommendations(titles, userInterests) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Analyze these research papers and suggest 3 most relevant ones for someone interested in 
    ${userInterests.join(', ')}. Format as JSON: { recommendations: [ { title, reason } ] }
    Papers: ${titles.join(", ")}
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

module.exports = { enhanceQuery, explainRecommendations };