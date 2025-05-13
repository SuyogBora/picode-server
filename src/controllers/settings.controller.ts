import { Settings } from '@/models';
import { ApiError } from '@/types';
import { NextFunction, Request, Response } from 'express';

/**
 * @desc    Get email settings
 * @route   GET /api/settings/email
 * @access  Private (Admin)
 */
export const getEmailSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Find settings or create default if not exists
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({
        emailSettings: {
          notificationEmails: [],
          fromEmail: 'noreply@example.com',
          fromName: 'Agency Name'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email settings retrieved successfully',
      data: {
        emailSettings: settings.emailSettings
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update email settings
 * @route   PUT /api/settings/email
 * @access  Private (Admin)
 */
export const updateEmailSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      notificationEmails, 
      fromEmail, 
      fromName,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpSecure
    } = req.body;

    // Validate email addresses
    if (notificationEmails) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      const invalidEmails = notificationEmails.filter((email: string) => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        const error = new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`) as ApiError;
        error.statusCode = 400;
        throw error;
      }
    }

    // Find settings or create default if not exists
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({
        emailSettings: {
          notificationEmails: notificationEmails || [],
          fromEmail: fromEmail || 'noreply@example.com',
          fromName: fromName || 'Agency Name',
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword,
          smtpSecure
        }
      });
    } else {
      // Update existing settings
      settings.emailSettings = {
        ...settings.emailSettings,
        ...(notificationEmails && { notificationEmails }),
        ...(fromEmail && { fromEmail }),
        ...(fromName && { fromName }),
        ...(smtpHost !== undefined && { smtpHost }),
        ...(smtpPort !== undefined && { smtpPort }),
        ...(smtpUser !== undefined && { smtpUser }),
        ...(smtpPassword !== undefined && { smtpPassword }),
        ...(smtpSecure !== undefined && { smtpSecure })
      };
      
      await settings.save();
    }

    res.status(200).json({
      success: true,
      message: 'Email settings updated successfully',
      data: {
        emailSettings: settings.emailSettings
      }
    });
  } catch (error) {
    next(error);
  }
};