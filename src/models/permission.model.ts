import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  name: string;   
  resource: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      enum: ['create', 'read', 'update', 'delete', 'manage', 'approve', 'publish', 'assign','view'],
      trim: true
    },
    resource: {
      type: String,
      required: [true, 'Resource name is required'],
      enum: ['blogs', 'careers', 'applications', 'users', 'contacts', 'settings', 'roles', 'permissions', 'all', 'inquiries','dashboard'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

PermissionSchema.virtual('code').get(function() {
  return `${this.resource}:${this.name}`;
});

PermissionSchema.index({ resource: 1, name: 1 }, { unique: true });

export default mongoose.model<IPermission>('Permission', PermissionSchema);