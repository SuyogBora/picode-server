import { BlogCategoryEnum, BlogStatusEnum } from '@/schemas/blog.schema';
import mongoose, { Document, Schema, Types } from 'mongoose';
import z from 'zod';
import { IUser } from './user.model';

export interface IBlog extends Document {
  title: string;
  slug?: string;
  content: string; // Rich text content
  contentType: 'markdown' | 'html' | 'json'; // Format of the content
  excerpt: string;
  author: Types.ObjectId | IUser;
  categories: z.infer<typeof BlogCategoryEnum>[];
  tags: string[];
  featuredImage: string;
  readingTime: number; // Estimated reading time in minutes
  status:z.infer<typeof BlogStatusEnum>;
  publishedAt: Date | null;
  isFeatured: boolean;
  views: number;
  likes: number;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage: string;
  };
  relatedPosts: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    slug: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true
    },
    content: {
      type: String,
      required: [true, 'Please add content']
    },
    contentType: {
      type: String,
      enum: ['markdown', 'html', 'json'],
      default: 'markdown'
    },
    excerpt: {
      type: String,
      required: [true, 'Please add an excerpt'],
      maxlength: [500, 'Excerpt cannot be more than 500 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    categories: [{
      type: String,
      enum: BlogCategoryEnum.options
    }],
    tags: [String],
    featuredImage: {
      type: String,
      default: 'default-blog.jpg'
    },
    readingTime: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: BlogStatusEnum.options,
      default:BlogStatusEnum.enum.draft
    },
    publishedAt: {
      type: Date,
      default: null
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    seo: {
      metaTitle: {
        type: String,
        trim: true
      },
      metaDescription: {
        type: String,
        trim: true
      },
      keywords: [String],
      ogImage: {
        type: String
      }
    },
    relatedPosts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog'
    }]
  },
  {
    timestamps: true
  }
);

// Create slug from title before saving
BlogSchema.pre<IBlog>('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }
  
  // Set publishedAt date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate reading time if content is modified
  if (this.isModified('content')) {
    // Average reading speed: 200 words per minute
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }
  
  next();
});


export default mongoose.model<IBlog>('Blog', BlogSchema);