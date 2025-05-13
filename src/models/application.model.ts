import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
  career: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string;
  coverLetter?: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    career: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Career',
      required: [true, 'Career is required']
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    resumeUrl: {
      type: String,
      required: [true, 'Resume URL is required']
    },
    coverLetter: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
      default: 'pending'
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Increment application count on the career when a new application is created
ApplicationSchema.post('save', async function() {
  const Career = mongoose.model('Career');
  await Career.findByIdAndUpdate(this.career, { $inc: { applicationsCount: 1 } });
});

export default mongoose.model<IApplication>('Application', ApplicationSchema);