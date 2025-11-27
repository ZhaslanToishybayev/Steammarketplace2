// JWT AUTHENTICATION MIDDLEWARE
// ==============================
// Professional JWT-based authentication for API endpoints

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'steam-marketplace-secret-key';
const JWT_EXPIRES_IN = '24h';

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      message: 'Please login to access this resource'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      message: 'Please login again'
    });
  }
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify password
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Token refresh middleware
const refreshToken = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token required'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const newAccessToken = generateToken({
      userId: decoded.userId,
      steamId: decoded.steamId,
      nickname: decoded.nickname
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
};

// Role-based authorization
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// Session validation
const validateSession = async (req, res, next) => {
  try {
    // Check if user still exists in database
    if (req.user && req.user.userId) {
      const user = await DatabaseService.getUserById(req.user.userId);
      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'User account deactivated',
          message: 'Your account is no longer active'
        });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Session validation failed'
    });
  }
};

module.exports = {
  authenticateJWT,
  generateToken,
  verifyPassword,
  hashPassword,
  refreshToken,
  authorizeRoles,
  validateSession,
  JWT_SECRET,
  JWT_EXPIRES_IN
};