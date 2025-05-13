import { IUser } from '@/models/user.model';
import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Request {
      /**
       * Single uploaded file (from multer)
       */
      file?: Multer.File;
      
      /**
       * Multiple uploaded files (from multer)
       */
      files?: {
        [fieldname: string]: Multer.File[];
      } | Multer.File[];
      
      /**
       * Authenticated user (from your auth middleware)
       */
      user?: IUser;
    }
  }
}