const jwt = require('jsonwebtoken');

module.exports = function adminAuth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]
              || req.cookies?.admin_token;

  if (!token) {
    return res.status(401).json({ error: 'No token — please log in' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorised' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
