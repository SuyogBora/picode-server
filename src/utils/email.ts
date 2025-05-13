import nodemailer from 'nodemailer';
import { IInquiry } from '@/models/inquiry.model';
import logger from '@/utils/logger';
import { Settings } from '@/models';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    // Get email settings from database
    const settings = await Settings.findOne();
    
    if (!settings || !settings.emailSettings) {
      throw new Error('Email settings not configured');
    }
    
    const { 
      fromEmail, 
      fromName, 
      smtpHost, 
      smtpPort, 
      smtpUser, 
      smtpPassword, 
      smtpSecure 
    } = settings.emailSettings;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost || process.env.SMTP_HOST,
      port: smtpPort || Number(process.env.SMTP_PORT) || 587,
      secure: smtpSecure || false,
      auth: {
        user: smtpUser || process.env.SMTP_USER,
        pass: smtpPassword || process.env.SMTP_PASSWORD
      }
    });

    // Send email
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      html: options.html
    });

    logger.info(`Email sent to ${options.to}`);
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

export const sendInquiryNotification = async (inquiry: IInquiry): Promise<void> => {
  try {
    // Get settings to determine notification recipients
    const settings = await Settings.findOne();
    
    if (!settings || !settings.emailSettings || !settings.emailSettings.notificationEmails.length) {
      logger.warn('No notification emails configured, skipping inquiry notification');
      return;
    }
    
    const { notificationEmails } = settings.emailSettings;
    
    // Create email content
    const html = `
      <h2>New Inquiry Received</h2>
      <p><strong>From:</strong> ${inquiry.name} (${inquiry.email})</p>
      <p><strong>Message:</strong></p>
      <p>${inquiry.message}</p>
      <p><strong>Received at:</strong> ${inquiry.createdAt.toLocaleString()}</p>
      <hr>
      <p>Please log in to the admin panel to respond to this inquiry.</p>
    `;
    
    // Send notification
    await sendEmail({
      to: notificationEmails,
      subject: `New Inquiry`,
      html
    });
    
    logger.info(`Inquiry notification sent to ${notificationEmails.join(', ')}`);
  } catch (error) {
    logger.error('Error sending inquiry notification:', error);
    // Don't throw error to prevent API failure if email fails
  }
};