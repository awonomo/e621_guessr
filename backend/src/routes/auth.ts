import { Router } from 'express';
import { z } from 'zod';
import db from '../database/connection.js';
import { 
  passwordUtils, 
  tokenUtils, 
  sessionUtils, 
  userUtils, 
  requireAuth,
  VERIFICATION_TOKEN_EXPIRES,
  PASSWORD_RESET_EXPIRES,
  type AuthUser 
} from '../middleware/auth.js';
import { emailService } from '../services/EmailService.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

const resendVerificationSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
});

// Helper function to get client info for sessions
function getClientInfo(req: any) {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.connection.remoteAddress || req.socket.remoteAddress;
  
  return { userAgent, ipAddress };
}

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', rateLimitMiddleware, async (req, res) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);
    const { username, email, password } = validatedData;

    // Additional password validation
    const passwordValidation = passwordUtils.validate(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Check if username or email already exists
    const existsCheck = await userUtils.checkExists(username, email);
    if (existsCheck.usernameExists) {
      return res.status(409).json({
        error: 'Username taken',
        message: 'This username is already registered'
      });
    }
    if (existsCheck.emailExists) {
      return res.status(409).json({
        error: 'Email taken', 
        message: 'This email is already registered'
      });
    }

    // Hash password
    const passwordHash = await passwordUtils.hash(password);

    // Generate verification token
    const verificationToken = tokenUtils.generateSecureToken();
    const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES);

    // Create user in database
    const userResult = await db.query(`
      INSERT INTO users (username, email, password_hash, verification_token, verification_expires)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, is_verified, created_at
    `, [username, email.toLowerCase(), passwordHash, verificationToken, verificationExpires]);

    const newUser = userResult.rows[0];

    // Create initial user stats record
    await db.query(`
      INSERT INTO user_stats (user_id) VALUES ($1)
    `, [newUser.id]);

    // Send verification email
    const emailResult = await emailService.sendVerification({
      username: newUser.username,
      email: newUser.email,
      token: verificationToken
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails - user can resend
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isVerified: newUser.is_verified,
        createdAt: newUser.created_at
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Please check your input',
        details: error.errors.map(e => e.message)
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An unexpected error occurred during registration'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', rateLimitMiddleware, async (req, res) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Get user with password hash
    const userResult = await db.query(`
      SELECT id, username, email, password_hash, is_verified, created_at, last_login
      FROM users WHERE email = $1
    `, [email.toLowerCase()]);

    console.log(`🔐 Login attempt for: ${email}`);
    console.log(`🔐 User query result: ${userResult.rows.length} rows`);
    if (userResult.rows.length > 0) {
      console.log(`🔐 Found user:`, { 
        id: userResult.rows[0].id, 
        username: userResult.rows[0].username, 
        email: userResult.rows[0].email,
        is_verified: userResult.rows[0].is_verified 
      });
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await passwordUtils.verify(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = tokenUtils.generate({
      id: user.id,
      username: user.username,
      email: user.email
    });

    // Create session in database
    const { userAgent, ipAddress } = getClientInfo(req);
    await sessionUtils.create(user.id, token, userAgent, ipAddress);

    // Update last login
    await userUtils.updateLastLogin(user.id);

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      token // Also return token for frontend storage if needed
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Please check your input',
        details: error.errors.map(e => e.message)
      });
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An unexpected error occurred during login'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Get token from cookie or header
    let token: string | undefined;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      // Delete session from database
      await sessionUtils.destroy(token);
    }

    // Clear cookie
    res.clearCookie('token');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An unexpected error occurred during logout'
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', async (req, res) => {
  try {
    const validatedData = verifyEmailSchema.parse(req.body);
    const { token } = validatedData;

    // Find user with this verification token
    const userResult = await db.query(`
      SELECT id, username, email, verification_expires
      FROM users 
      WHERE verification_token = $1 AND verification_expires > NOW()
    `, [token]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The verification link is invalid or has expired'
      });
    }

    const user = userResult.rows[0];

    // Update user to verified and clear verification token
    await db.query(`
      UPDATE users 
      SET is_verified = true, verification_token = NULL, verification_expires = NULL
      WHERE id = $1
    `, [user.id]);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now use all features.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: true
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid verification token',
        details: error.errors.map(e => e.message)
      });
    }

    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An unexpected error occurred during verification'
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', rateLimitMiddleware, async (req, res) => {
  try {
    const validatedData = resendVerificationSchema.parse(req.body);
    const { email } = validatedData;

    // Find user by email
    const userResult = await db.query(`
      SELECT id, username, email, is_verified
      FROM users WHERE email = $1
    `, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.'
      });
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        error: 'Already verified',
        message: 'This email address is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = tokenUtils.generateSecureToken();
    const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES);

    // Update user with new token
    await db.query(`
      UPDATE users 
      SET verification_token = $1, verification_expires = $2
      WHERE id = $3
    `, [verificationToken, verificationExpires, user.id]);

    // Send verification email
    const emailResult = await emailService.sendVerification({
      username: user.username,
      email: user.email,
      token: verificationToken
    });

    if (!emailResult.success) {
      console.error('Failed to resend verification email:', emailResult.error);
      return res.status(500).json({
        error: 'Email failed',
        message: 'Failed to send verification email'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Please check your input',
        details: error.errors.map(e => e.message)
      });
    }

    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Resend failed',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      message: 'An unexpected error occurred'
    });
  }
});

export default router;