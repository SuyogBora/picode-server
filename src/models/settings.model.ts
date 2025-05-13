import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailSettings {
  notificationEmails: string[];
  fromEmail: string;
  fromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
}

export interface ISettings extends Document {
  emailSettings: IEmailSettings;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSettingsSchema = new Schema({
  notificationEmails: {
    type: [String],
    validate: {
      validator: function(emails: string[]) {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        return emails.every(email => emailRegex.test(email));
      },
      message: 'One or more email addresses are invalid'
    }
  },
  fromEmail: {
    type: String,
    required: [true, 'From email is required'],
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  fromName: {
    type: String,
    required: [true, 'From name is required'],
    trim: true
  },
  smtpHost: String,
  smtpPort: Number,
  smtpUser: String,
  smtpPassword: String,
  smtpSecure: Boolean
});

const SettingsSchema: Schema = new Schema(
  {
    emailSettings: {
      type: EmailSettingsSchema,
      required: true,
      default: {
        notificationEmails: [],
        fromEmail: 'noreply@example.com',
        fromName: 'Agency Name'
      }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);