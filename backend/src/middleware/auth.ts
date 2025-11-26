import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import db from '../database/connection.js';

// Constants
export const SALT_ROUNDS = 12;
export const JWT_EXPIRES_IN = '7d';
export const VERIFICATION_TOKEN_EXPIRES = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_EXPIRES = 60 * 60 * 1000; // 1 hour

// Environment validation
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  isVerified: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Password hashing utilities
 */
export const passwordUtils = {
  async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  },

  async verify(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  },

  /**
   * Validate password strength
   * Requirements: 8+ chars, 1 uppercase, 1 lowercase, 1 number
   */
  validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (password.length > 128) {
      errors.push('Password cannot be longer than 128 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

/**
 * JWT token utilities
 */
export const tokenUtils = {
  /**
   * Generate JWT token for user
   */
  generate(user: Pick<AuthUser, 'id' | 'username' | 'email'>): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'e621_guessr',
      audience: 'e621_guessr_users'
    });
  },

  /**
   * Verify and decode JWT token
   */
  verify(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
        issuer: 'e621_guessr',
        audience: 'e621_guessr_users'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      return null;
    }
  },

  /**
   * Generate secure random token for email verification/password reset
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
};

/**
 * Session management utilities
 */
export const sessionUtils = {
  /**
   * Create session in database
   */
  async create(userId: number, token: string, userAgent?: string, ipAddress?: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      'INSERT INTO user_sessions (token, user_id, expires_at, user_agent, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [token, userId, expiresAt, userAgent || null, ipAddress || null]
    );
  },

  /**
   * Validate session exists and is not expired
   */
  async validate(token: string): Promise<boolean> {
    const result = await db.query(
      'SELECT 1 FROM user_sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length > 0) {
      // Update last_used timestamp
      await db.query(
        'UPDATE user_sessions SET last_used = NOW() WHERE token = $1',
        [token]
      );
      return true;
    }

    return false;
  },

  /**
   * Delete session (logout)
   */
  async destroy(token: string): Promise<void> {
    await db.query('DELETE FROM user_sessions WHERE token = $1', [token]);
  },

  /**
   * Delete all sessions for a user (useful for security)
   */
  async destroyAllForUser(userId: number): Promise<void> {
    await db.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
  },

  /**
   * Clean up expired sessions
   */
  async cleanupExpired(): Promise<number> {
    const result = await db.query('SELECT cleanup_expired_sessions()');
    return result.rows[0].cleanup_expired_sessions;
  }
};

/**
 * User utilities
 */
export const userUtils = {
  /**
   * Get user by ID
   */
  async getById(userId: number): Promise<AuthUser | null> {
    const result = await db.query(
      'SELECT id, username, email, is_verified, created_at, last_login FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      isVerified: row.is_verified,
      createdAt: row.created_at,
      lastLogin: row.last_login
    };
  },

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<AuthUser | null> {
    const result = await db.query(
      'SELECT id, username, email, is_verified, created_at, last_login FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      isVerified: row.is_verified,
      createdAt: row.created_at,
      lastLogin: row.last_login
    };
  },

  /**
   * Check if username or email already exists
   */
  async checkExists(username: string, email: string): Promise<{ usernameExists: boolean; emailExists: boolean }> {
    const result = await db.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );

    const usernameExists = result.rows.some((row: any) => row.username.toLowerCase() === username.toLowerCase());
    const emailExists = result.rows.some((row: any) => row.email.toLowerCase() === email.toLowerCase());

    return { usernameExists, emailExists };
  },

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  }
};

/**
 * Authentication middleware
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to get token from Authorization header or cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const payload = tokenUtils.verify(token);
    if (!payload) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    }

    // Check if session exists in database
    const sessionValid = await sessionUtils.validate(token);
    if (!sessionValid) {
      return res.status(401).json({
        error: 'Session expired',
        message: 'Session no longer valid'
      });
    }

    // Get full user data
    const user = await userUtils.getById(payload.userId);
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error'
    });
  }
};

/**
 * Optional authentication middleware (for routes that work for both auth'd and anonymous users)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to get token from Authorization header or cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      // No token provided, continue as anonymous user
      return next();
    }

    // Verify JWT token
    const payload = tokenUtils.verify(token);
    if (!payload) {
      // Invalid token, continue as anonymous user
      return next();
    }

    // Check if session exists in database
    const sessionValid = await sessionUtils.validate(token);
    if (!sessionValid) {
      // Session expired, continue as anonymous user
      return next();
    }

    // Get full user data
    const user = await userUtils.getById(payload.userId);
    if (user) {
      req.user = user;
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue as anonymous user on error
    next();
  }
};

/**
 * Middleware to require email verification
 */
export const requireVerified = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Must be logged in'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address to access this feature'
    });
  }

  next();
};