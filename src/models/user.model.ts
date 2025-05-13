import { IRole } from './role.model';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose, { Document, Schema, Types } from 'mongoose';


export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  roles: Types.ObjectId[] | IRole[];
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  emailVerificationToken: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  hasRole(roleName: string): boolean;
  hasPermission(permissionCode: string): boolean;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't return password by default
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String
  },
  {
    timestamps: true
  }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function(enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if user has a specific role
UserSchema.methods.hasRole = function(roleName: string): boolean {
  if (!this.roles || this.roles.length === 0) return false;
  
  // If roles are populated
  if (typeof this.roles[0] === 'object' && this.roles[0] !== null) {
    return this.roles.some((role: any) => role.name === roleName);
  }
  
  // If roles are not populated, we can't check by name
  return false;
};

// Method to check if user has a specific permission
UserSchema.methods.hasPermission = function(permissionCode: string): boolean {
  if (!this.roles || this.roles.length === 0) return false;
  
  // If roles are populated with permissions
  if (typeof this.roles[0] === 'object' && this.roles[0] !== null) {
    for (const role of this.roles) {
      if (!role.permissions) continue;
      
      for (const permission of (role as any).permissions) {
        // If permissions are populated
        if (typeof permission === 'object' && permission !== null) {
          if (`${permission.resource}:${permission.name}` === permissionCode) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
};

// Generate and hash password reset token
UserSchema.methods.generatePasswordResetToken = function(): string {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set token expiration (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function(): string {
  // Generate random token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  return verificationToken;
};
export default mongoose.model<IUser>('User', UserSchema);;