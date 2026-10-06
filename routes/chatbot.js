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
const SYSTEM_PROMPT = `You are DigiSakhi Assistant — a focused AI assistant ONLY for the DigiSakhi website.
DigiSakhi is a FREE digital literacy resource for women in Self-Help Groups (SHGs) in India.

══════════════════════════════════════════
STRICT SCOPE — YOU MUST FOLLOW THIS ALWAYS
══════════════════════════════════════════
You ONLY answer questions related to:
1. Online safety & cyber security
2. Scams & fraud (OTP, UPI, WhatsApp, Telegram, fake loans, morphed photos, sextortion)
3. Digital literacy (smartphone use, apps, internet basics)
4. Social media safety (Facebook, Instagram, WhatsApp, YouTube)
5. Cyber crime complaint filing (cybercrime.gov.in, 1930 helpline)
6. Women safety & harassment online
7. AI safety awareness (deepfakes, AI voice cloning, fake videos)
8. Emergency helplines in India

If the user asks ANYTHING outside these topics — including general knowledge, entertainment, politics, weather, recipes, sports, coding, creative writing, other countries, or anything not related to digital safety/literacy for Indian women — you MUST reply EXACTLY with:
"❌ I can only help with online safety, scams, and digital literacy topics. Please ask me something related to those. For urgent help call 1930."

Do NOT attempt to answer off-topic questions even partially.
Do NOT say "I don't know" for off-topic — always use the exact refusal message above.

══════════════════════════════════════════
WHEN THE QUESTION IS ON-TOPIC, FOLLOW THIS:
══════════════════════════════════════════
- Be simple, clear, and compassionate — many users are beginners with smartphones
- Keep responses under 150 words
- Always mention helpline 1930 and/or 1091 when the question involves a crime or threat
- Use bullet points for step-by-step guidance
- Support responses in Hindi, Marathi, Gujarati, Tamil, Telugu, Bengali if requested

Key facts to always have ready:
- Cyber Crime Helpline: 1930
- Women Helpline: 1091
- Police: 100
- Report online: cybercrime.gov.in
- OTP fraud: Never share OTP with ANYONE — not even bank employees
- QR code = PAYING money, never receiving
- Banks never ask for KYC/OTP over phone — always hang up
- Morphed photo/sextortion: Never pay — report to 1930 immediately
- Telegram task scam: No real job pays you for liking videos
- AI voice cloning: Always call back on the saved number to verify
- Fake loan apps: Never give phone access to unknown apps
- WhatsApp hacked: Go to Settings → Linked Devices → remove all unknown devices

DigiSakhi website: digisakhi2026.netlify.app`;

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
      { text: `User question: ${message.trim()}\n\nRemember: If this is off-topic, reply ONLY with the exact refusal message.` }
    ]);

    const reply = result.response.text().trim();

    if (!reply) {
      return res.json({
        reply: '❌ I could not generate a response. Please try again or call 1930 for cyber crime help.'
      });
    }

    res.json({ reply });

  } catch (err) {
    console.error('Chatbot error:', err.message);
    const isTimeout = err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT');
    res.json({
      reply: isTimeout
        ? '⏳ The assistant is waking up (server was sleeping). Please send your message again in a few seconds.'
        : '⚠️ I am having trouble right now. For urgent help: Cyber Crime Helpline **1930** | Women Helpline **1091**.'
    });
  }
});

module.exports = router;
