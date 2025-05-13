import { IPermission } from './permission.model';
import mongoose, { Document, Schema, Types } from 'mongoose';


export interface IRole extends Document {
  name: string;
  description: string;
  permissions: Types.ObjectId[] | IPermission[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Role name cannot be more than 50 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
      }
    ],
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);
export default mongoose.model<IRole>('Role', RoleSchema);