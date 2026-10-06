/**
 * CHATBOT API — Powered by Google Gemini
 * POST /api/chat
 * Body: { message: "user question", language: "en" }
 */

const router     = require('express').Router();
const rateLimit  = require('express-rate-limit');
const Story      = require('../models/Story');
const Alert      = require('../models/Alert');

/* Rate limit — 20 messages per IP per minute */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages. Please wait a moment.' }
});

/* ── DigiSakhi system prompt ── */
const SYSTEM_PROMPT = `You are DigiSakhi Assistant — a helpful, friendly AI for the DigiSakhi website.
DigiSakhi is a FREE digital literacy resource for women in Self-Help Groups (SHGs) in India.

Your role:
- Help women understand online safety, cyber crimes, and digital literacy
- Answer questions about scams, fraud, WhatsApp safety, UPI payments, social media safety
- Guide women on how to file cyber crime complaints
- Be simple, clear, and compassionate — many users are beginners
- Support Hindi, English, and other Indian languages

Key information:
- Emergency helplines: Cyber Crime: 1930 | Women Helpline: 1091 | Police: 100
- Report cyber crime: cybercrime.gov.in
- Website: digisakhi2026.netlify.app

Common scams:
- OTP fraud: Never share OTP with anyone
- UPI collect request: Scanning QR code = PAYING, not receiving
- Fake KYC calls: Banks never ask for KYC over phone
- Morphed photo blackmail: Never pay — report to 1930
- Telegram task scams: No real job pays for liking videos
- AI voice cloning: Always call back on saved number

Keep responses under 150 words. Use simple language.
Always mention helpline numbers (1930, 1091) when the question is about a crime.`;

/* ── POST /api/chat ── */
router.post('/', chatLimiter, async (req, res) => {
  const { message, language } = req.body;

  if (!message || message.trim().length < 2) {
    return res.status(400).json({ error: 'Message is too short' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chatbot not configured' });
  }

  try {
    /* Lazy-load the SDK so server still starts if package not installed yet */
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    /* Fetch relevant context from DB */
    const userWords = message.toLowerCase().split(' ').filter(w => w.length > 3);
    const regex = userWords.length > 0
      ? new RegExp(userWords.slice(0, 3).join('|'), 'i')
      : /.*/;

    const [recentAlerts, relatedStories] = await Promise.all([
      Alert.find({ active: true }).sort({ createdAt: -1 }).limit(5).select('text'),
      Story.find({
        status: 'approved',
        $or: [
          { story:     { $regex: regex } },
          { scam_type: { $regex: regex } }
        ]
      }).limit(3).select('scam_type story lesson')
    ]);

    /* Build context string */
    let context = SYSTEM_PROMPT;

    if (recentAlerts.length > 0) {
      context += `\n\nRecent scam alerts in India:\n${recentAlerts.map(a => `- ${a.text}`).join('\n')}`;
    }
    if (relatedStories.length > 0) {
      context += `\n\nReal victim stories:\n${relatedStories.map(s =>
        `- ${s.scam_type}: "${s.story.substring(0, 120)}..." Lesson: ${s.lesson}`
      ).join('\n')}`;
    }
    if (language && language !== 'en') {
      context += `\n\nIMPORTANT: Respond in the user's language: "${language}"`;
    }

    /* Call Gemini */
    const result = await model.generateContent([
      { text: context },
      { text: `User: ${message.trim()}` }
    ]);

    const reply = result.response.text();

    if (!reply) {
      return res.json({
        reply: 'I could not understand that. Please try again or call 1930 for cyber crime help.'
      });
    }

    res.json({ reply });

  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.json({
      reply: 'I am having trouble right now. For urgent help: Cyber Crime Helpline 1930 | Women Helpline 1091.'
    });
  }
});

module.exports = router;
