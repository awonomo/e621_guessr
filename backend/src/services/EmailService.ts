import nodemailer from 'nodemailer';
import { tokenUtils } from '../middleware/auth.js';

// Email configuration
const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'gmail', // or 'sendgrid', 'ses', etc.
  from: process.env.EMAIL_FROM || 'noreply@e621guessr.com',
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

// Validate email configuration
if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
  console.warn('⚠️  Email service not configured. Set EMAIL_USER and EMAIL_PASS environment variables.');
  console.warn('   Authentication emails will be logged to console instead.');
}

// Create transporter
let transporter: nodemailer.Transporter | null = null;

try {
  if (EMAIL_CONFIG.auth.user && EMAIL_CONFIG.auth.pass) {
    transporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      auth: EMAIL_CONFIG.auth
    });
    
    console.log('📧 Email service configured with:', EMAIL_CONFIG.service);
  }
} catch (error) {
  console.error('❌ Failed to configure email service:', error);
}

export interface EmailVerificationData {
  username: string;
  email: string;
  token: string;
}

export interface PasswordResetData {
  username: string;
  email: string;
  token: string;
}

/**
 * Email templates
 */
const templates = {
  /**
   * Email verification template
   */
  verification: (data: EmailVerificationData): { subject: string; html: string; text: string } => {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${data.token}`;
    
    return {
      subject: 'Verify your e621_guessr account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to e621_guessr!</h1>
          <p>Hi ${data.username},</p>
          <p>Thanks for signing up! Please verify your email address to activate your account and start tracking your stats across devices.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${verifyUrl}</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            This verification link will expire in 24 hours. If you didn't create an account on e621_guessr, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `
Welcome to e621_guessr!

Hi ${data.username},

Thanks for signing up! Please verify your email address to activate your account and start tracking your stats across devices.

Verify your email by visiting this link:
${verifyUrl}

This verification link will expire in 24 hours. If you didn't create an account on e621_guessr, you can safely ignore this email.

---
e621_guessr Team
      `.trim()
    };
  },

  /**
   * Password reset template
   */
  passwordReset: (data: PasswordResetData): { subject: string; html: string; text: string } => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${data.token}`;
    
    return {
      subject: 'Reset your e621_guessr password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Password Reset Request</h1>
          <p>Hi ${data.username},</p>
          <p>We received a request to reset your password for your e621_guessr account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${resetUrl}</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            This reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will remain unchanged.
          </p>
        </div>
      `,
      text: `
Password Reset Request

Hi ${data.username},

We received a request to reset your password for your e621_guessr account.

Reset your password by visiting this link:
${resetUrl}

This reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will remain unchanged.

---
e621_guessr Team
      `.trim()
    };
  }
};

/**
 * Email service
 */
export const emailService = {
  /**
   * Send verification email
   */
  async sendVerification(data: EmailVerificationData): Promise<{ success: boolean; error?: string }> {
    try {
      const template = templates.verification(data);
      
      if (!transporter) {
        // Log to console if email service not configured (development)
        console.log('\n📧 EMAIL VERIFICATION (development mode)');
        console.log('To:', data.email);
        console.log('Subject:', template.subject);
        console.log('Verification URL:', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${data.token}`);
        console.log('---\n');
        return { success: true };
      }

      const mailOptions = {
        from: `"e621_guessr" <${EMAIL_CONFIG.from}>`,
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('📧 Verification email sent to:', data.email);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetData): Promise<{ success: boolean; error?: string }> {
    try {
      const template = templates.passwordReset(data);
      
      if (!transporter) {
        // Log to console if email service not configured (development)
        console.log('\n📧 PASSWORD RESET EMAIL (development mode)');
        console.log('To:', data.email);
        console.log('Subject:', template.subject);
        console.log('Reset URL:', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${data.token}`);
        console.log('---\n');
        return { success: true };
      }

      const mailOptions = {
        from: `"e621_guessr" <${EMAIL_CONFIG.from}>`,
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('📧 Password reset email sent to:', data.email);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  },

  /**
   * Test email configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!transporter) {
        return { 
          success: false, 
          error: 'Email service not configured' 
        };
      }

      await transporter.verify();
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown connection error' 
      };
    }
  }
};