import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './user.model';
import z from 'zod';
import { InquiryStatusEnum } from '@/schemas/inquiry.schema';


export interface IInquiry extends Document {
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: z.infer<typeof InquiryStatusEnum>;
  assignedTo?: Types.ObjectId | IUser;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    phone: {
      type: String,
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    status: {
      type: String,
      enum: InquiryStatusEnum.options,
      default: InquiryStatusEnum.enum.new
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IInquiry>('Inquiry', InquirySchema);
