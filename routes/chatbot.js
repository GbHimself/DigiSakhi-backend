/**
 * CHATBOT API — Powered by Google Gemini (REST API, no SDK)
 * POST /api/chat
 * Body: { message: "user question", language: "en" }
 */

const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const https     = require('https');
const Story     = require('../models/Story');
const Alert     = require('../models/Alert');

/* Rate limit — 20 messages per IP per minute */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages. Please wait a moment.' }
});

/* ── DigiSakhi system prompt ── */
const SYSTEM_PROMPT = `You are DigiSakhi Assistant — a focused AI assistant ONLY for the DigiSakhi website.
DigiSakhi is a FREE digital literacy resource for women in Self-Help Groups (SHGs) in India.

STRICT SCOPE — YOU MUST FOLLOW THIS ALWAYS:
You ONLY answer questions related to:
1. Online safety and cyber security
2. Scams and fraud (OTP, UPI, WhatsApp, Telegram, fake loans, morphed photos, sextortion)
3. Digital literacy (smartphone use, apps, internet basics)
4. Social media safety (Facebook, Instagram, WhatsApp, YouTube)
5. Cyber crime complaint filing (cybercrime.gov.in, 1930 helpline)
6. Women safety and harassment online
7. AI safety awareness (deepfakes, AI voice cloning, fake videos)
8. Emergency helplines in India

If the user asks ANYTHING outside these topics (general knowledge, entertainment, politics, weather, recipes, sports, coding, other countries, jokes, etc.) you MUST reply EXACTLY with this message and nothing else:
"❌ I can only help with online safety, scams, and digital literacy topics. Please ask me something related to those. For urgent help call 1930."

WHEN ON-TOPIC:
- Be simple, clear, compassionate — many users are beginners
- Keep responses under 150 words
- Always mention 1930 and/or 1091 when the question involves a crime or threat
- Use bullet points for step-by-step guidance

Key facts:
- Cyber Crime Helpline: 1930
- Women Helpline: 1091
- Police: 100
- Report online: cybercrime.gov.in
- OTP fraud: Never share OTP with ANYONE — not even bank employees
- QR code = PAYING money, never receiving
- Banks never ask for KYC or OTP over phone — always hang up
- Morphed photo or sextortion: Never pay — report to 1930 immediately
- Telegram task scam: No real job pays you for liking videos
- AI voice cloning: Always call back on the saved number to verify
- Fake loan apps: Never give phone access to unknown apps
- WhatsApp hacked: Settings → Linked Devices → remove all unknown devices`;

/* ── Simple HTTPS POST helper (no dependencies) ── */
function geminiRequest(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.4 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) return reject(new Error('Empty response from Gemini'));
          resolve(text.trim());
        } catch (e) {
          reject(new Error('Failed to parse Gemini response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(35000, () => { req.destroy(); reject(new Error('Gemini request timeout')); });
    req.write(body);
    req.end();
  });
}

/* ── POST /api/chat ── */
router.post('/', chatLimiter, async (req, res) => {
  const { message, language } = req.body;

  /* Ignore ping requests from frontend wake-up */
  if (!message || message.trim() === 'ping') {
    return res.json({ reply: 'ok' });
  }

  if (message.trim().length < 2) {
    return res.status(400).json({ error: 'Message is too short' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chatbot not configured' });
  }

  try {
    /* Fetch relevant context from DB */
    const userWords = message.toLowerCase().split(' ').filter(w => w.length > 3);
    const regex = userWords.length > 0
      ? new RegExp(userWords.slice(0, 3).join('|'), 'i')
      : /.*/;

    const [recentAlerts, relatedStories] = await Promise.all([
      Alert.find({ active: true }).sort({ createdAt: -1 }).limit(3).select('text'),
      Story.find({
        status: 'approved',
        $or: [
          { story:     { $regex: regex } },
          { scam_type: { $regex: regex } }
        ]
      }).limit(2).select('scam_type story lesson')
    ]);

    /* Build full prompt */
    let fullPrompt = SYSTEM_PROMPT;

    if (recentAlerts.length > 0) {
      fullPrompt += `\n\nRecent scam alerts in India:\n${recentAlerts.map(a => `- ${a.text}`).join('\n')}`;
    }
    if (relatedStories.length > 0) {
      fullPrompt += `\n\nReal victim stories for context:\n${relatedStories.map(s =>
        `- ${s.scam_type}: "${s.story.substring(0, 100)}..." Lesson: ${s.lesson}`
      ).join('\n')}`;
    }
    if (language && language !== 'en') {
      fullPrompt += `\n\nIMPORTANT: Respond in this language: "${language}"`;
    }

    fullPrompt += `\n\nUser question: ${message.trim()}\n\nIf this is off-topic, reply ONLY with the exact refusal message. Otherwise answer helpfully.`;

    const reply = await geminiRequest(apiKey, fullPrompt);
    res.json({ reply });

  } catch (err) {
    console.error('Chatbot error:', err.message);
    const isTimeout = err.message?.includes('timeout');
    res.json({
      reply: isTimeout
        ? '⏳ Taking too long to respond. Please try again in a few seconds.'
        : '⚠️ I am having trouble right now. For urgent help: Cyber Crime Helpline **1930** | Women Helpline **1091**.'
    });
  }
});

module.exports = router;
