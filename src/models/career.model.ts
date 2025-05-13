import { DepartmentEnum, EmploymentTypeEnum, StatusEnum } from "@/schemas/career.schema";
import mongoose, { Document, Schema } from 'mongoose';
import z from 'zod';

export interface ICareer extends Document {
  title: string;
  department: z.infer<typeof DepartmentEnum>;
  location: string;
  type: z.infer<typeof EmploymentTypeEnum>;
  description: string;
  // Removed requirements and responsibilities as strings
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  applicationEmail: string;
  applicationUrl: string;
  status: z.infer<typeof StatusEnum>;
  publishedAt: Date | null;
  closesAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workMode: 'remote' | 'onsite' | 'hybrid';
  experience: {
    min: number;
    max: number;
    unit: 'years' | 'months';
  };
  skills: string[];
  shift: string;
  rolesAndResponsibilities: string[];
  qualifications: string[];
  desiredSkills: string[];
  applicationsCount: number;
}

const CareerSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a job title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    department: {
      type: String,
      enum: DepartmentEnum.options,
      required: [true, 'Please add a department'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Please add a location'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Please add job type'],
      enum: EmploymentTypeEnum.options,
      default: 'full-time'
    },
    description: {
      type: String,
      required: [true, 'Please add a description']
    },
    // Removed requirements and responsibilities fields
    salary: {
      min: {
        type: Number,
        required: false
      },
      max: {
        type: Number,
        required: false
      },
      currency: {
        type: String,
        default: 'USD'
      }
    },
    applicationEmail: {
      type: String,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    applicationUrl: {
      type: String
    },
    status: {
      type: String,
      enum: StatusEnum.options,
      default: 'draft'
    },
    publishedAt: {
      type: Date,
      default: null
    },
    closesAt: {
      type: Date,
      default: null
    },
    workMode: {
      type: String,
      enum: ['remote', 'onsite', 'hybrid'],
      default: 'onsite'
    },
    experience: {
      min: {
        type: Number,
        required: false
      },
      max: {
        type: Number,
        required: false
      },
      unit: {
        type: String,
        enum: ['years', 'months'],
        default: 'years'
      }
    },
    skills: {
      type: [String],
      default: []
    },
    shift: {
      type: String,
      required: false
    },
    rolesAndResponsibilities: {
      type: [String],
      default: []
    },
    qualifications: {
      type: [String],
      default: []
    },
    desiredSkills: {
      type: [String],
      default: []
    },
    applicationsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

CareerSchema.pre<ICareer>('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

export default mongoose.model<ICareer>('Career', CareerSchema);
