import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailService {
  send(options: EmailOptions): Promise<boolean>;
}

class SmtpEmailService implements EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "2525", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.fromEmail = process.env.SMTP_FROM_EMAIL || "hello@yourbramble.com";

    if (!host || !user || !pass) {
      console.warn("⚠️ SMTP credentials not configured. Emails will be simulated.");
      this.transporter = null as any;
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      console.log(`✅ SMTP configured: ${host}:${port}`);
    }
  }

  async send(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log("📧 [SIMULATED EMAIL]");
      console.log(`  To: ${options.to}`);
      console.log(`  Subject: ${options.subject}`);
      console.log(`  Body: ${options.text || options.html.substring(0, 200)}...`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: `"Bramble" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`📧 Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      return false;
    }
  }
}

export const emailService = new SmtpEmailService();

export function getApplicationReceivedEmail(coopName: string): { subject: string; html: string; text: string } {
  return {
    subject: `Your co-op application has been received`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7C9082;">Application Received</h1>
        <p>Thank you for applying to start <strong>${coopName}</strong> on Bramble.</p>
        <p>We've received your application and will review it within a few business days. We'll be in touch at this email address with our decision.</p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">— The Bramble Team</p>
      </div>
    `,
    text: `Application Received\n\nThank you for applying to start ${coopName} on Bramble.\n\nWe've received your application and will review it within a few business days. We'll be in touch at this email address with our decision.\n\n— The Bramble Team`,
  };
}

export function getApplicationApprovedEmail(
  coopName: string,
  applicantName: string,
  magicLinkToken: string,
  baseUrl: string
): { subject: string; html: string; text: string } {
  const setupUrl = `${baseUrl}/setup?token=${magicLinkToken}`;
  
  return {
    subject: `Welcome to Bramble! Your co-op has been approved`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7C9082;">Welcome to Bramble!</h1>
        <p>Hi ${applicantName},</p>
        <p>Great news — your application to start <strong>${coopName}</strong> has been approved!</p>
        <p>Click the button below to set up your password and start configuring your co-op:</p>
        <p style="margin: 32px 0;">
          <a href="${setupUrl}" style="background-color: #7C9082; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Set Up Your Account
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">— The Bramble Team</p>
      </div>
    `,
    text: `Welcome to Bramble!\n\nHi ${applicantName},\n\nGreat news — your application to start ${coopName} has been approved!\n\nVisit this link to set up your password and start configuring your co-op:\n${setupUrl}\n\nThis link will expire in 7 days.\n\n— The Bramble Team`,
  };
}

export function getApplicationDeniedEmail(
  coopName: string,
  applicantName: string
): { subject: string; html: string; text: string } {
  return {
    subject: `Update on your co-op application`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #444;">Update on Your Application</h1>
        <p>Hi ${applicantName},</p>
        <p>Thank you for your interest in starting <strong>${coopName}</strong> on Bramble.</p>
        <p>After reviewing your application, we've decided not to move forward at this time. This could be for various reasons, and it's not necessarily a reflection on your co-op's potential.</p>
        <p>If you have questions or would like to discuss this further, please reply to this email.</p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">— The Bramble Team</p>
      </div>
    `,
    text: `Update on Your Application\n\nHi ${applicantName},\n\nThank you for your interest in starting ${coopName} on Bramble.\n\nAfter reviewing your application, we've decided not to move forward at this time. This could be for various reasons, and it's not necessarily a reflection on your co-op's potential.\n\nIf you have questions or would like to discuss this further, please reply to this email.\n\n— The Bramble Team`,
  };
}

export function getFamilyDeniedEmail(
  userName: string,
  coopName: string
): { subject: string; html: string; text: string } {
  return {
    subject: `Update on your ${coopName} application`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #444;">Update on Your Application</h1>
        <p>Hi ${userName},</p>
        <p>Thank you for your interest in joining <strong>${coopName}</strong>.</p>
        <p>After reviewing your application, we've decided not to approve it at this time. Please wait for follow-up from the co-op administrators if you have questions.</p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">— The ${coopName} Team</p>
      </div>
    `,
    text: `Update on Your Application\n\nHi ${userName},\n\nThank you for your interest in joining ${coopName}.\n\nAfter reviewing your application, we've decided not to approve it at this time. Please wait for follow-up from the co-op administrators if you have questions.\n\n— The ${coopName} Team`,
  };
}

export function getInstructorDeniedEmail(
  userName: string,
  coopName: string
): { subject: string; html: string; text: string } {
  return {
    subject: `Update on your instructor application at ${coopName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #444;">Update on Your Instructor Application</h1>
        <p>Hi ${userName},</p>
        <p>Thank you for your interest in teaching at <strong>${coopName}</strong>.</p>
        <p>After reviewing your application, we've decided not to approve it at this time. Please wait for follow-up from the co-op administrators if you have questions.</p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">— The ${coopName} Team</p>
      </div>
    `,
    text: `Update on Your Instructor Application\n\nHi ${userName},\n\nThank you for your interest in teaching at ${coopName}.\n\nAfter reviewing your application, we've decided not to approve it at this time. Please wait for follow-up from the co-op administrators if you have questions.\n\n— The ${coopName} Team`,
  };
}

export function getApplicationSubmittedEmail(
  userName: string,
  coopName: string,
  role: "FAMILY" | "INSTRUCTOR"
): { subject: string; html: string; text: string } {
  const roleText = role === "FAMILY" ? "family" : "instructor";
  return {
    subject: `Thanks for applying to ${coopName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7C9082;">Application Received</h1>
        <p>Hi ${userName},</p>
        <p>Thank you for applying to join <strong>${coopName}</strong> as a ${roleText}.</p>
        <p>Your application is now under review. We'll notify you at this email address once the co-op administrators have made a decision.</p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">— The ${coopName} Team via Bramble</p>
      </div>
    `,
    text: `Application Received\n\nHi ${userName},\n\nThank you for applying to join ${coopName} as a ${roleText}.\n\nYour application is now under review. We'll notify you at this email address once the co-op administrators have made a decision.\n\n— The ${coopName} Team via Bramble`,
  };
}

export function getNewApplicationNotificationEmail(
  applicantName: string,
  applicantEmail: string,
  coopName: string,
  role: "FAMILY" | "INSTRUCTOR",
  dashboardUrl: string
): { subject: string; html: string; text: string } {
  const roleText = role === "FAMILY" ? "family" : "instructor";
  return {
    subject: `New ${roleText} application from ${applicantName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7C9082;">New Application Received</h1>
        <p>A new ${roleText} application has been submitted for <strong>${coopName}</strong>.</p>
        <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0;"><strong>Name:</strong> ${applicantName}</p>
          <p style="margin: 8px 0 0;"><strong>Email:</strong> ${applicantEmail}</p>
          <p style="margin: 8px 0 0;"><strong>Role:</strong> ${roleText}</p>
        </div>
        <p>
          <a href="${dashboardUrl}" style="background-color: #7C9082; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review in Dashboard
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">— Bramble</p>
      </div>
    `,
    text: `New Application Received\n\nA new ${roleText} application has been submitted for ${coopName}.\n\nName: ${applicantName}\nEmail: ${applicantEmail}\nRole: ${roleText}\n\nReview in your dashboard: ${dashboardUrl}\n\n— Bramble`,
  };
}
