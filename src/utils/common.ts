import mongoose from 'mongoose';

export function getSortStage(sort: string): Record<string, 1 | -1> {
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    return { [sortField]: sortOrder };
}


/**
 * MongoDB utility functions for query building
 */
export const mongoUtils = {
  
  /**
   * Converts IDs to MongoDB ObjectIds with validation
   * 
   * @param ids - Single ID string, array of IDs, or comma-separated ID string
   * @returns Array of valid MongoDB ObjectIds or null if none are valid
   */
  parseIds(ids: string | string[] | undefined): mongoose.Types.ObjectId[] | null {
    if (!ids) return null;
    
    // Normalize input to array
    const idArray: string[] = Array.isArray(ids) 
      ? ids 
      : typeof ids === 'string' 
        ? ids.split(',').map(id => id.trim()).filter(Boolean) 
        : [];
    
    if (idArray.length === 0) return null;
    
    // Filter and convert valid IDs in one pass for efficiency
    const validObjectIds = idArray
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    
    return validObjectIds.length > 0 ? validObjectIds : null;
  },
  
  /**
   * Creates a MongoDB query object for matching against a field
   * 
   * @param fieldName - Field to query against
   * @param ids - ID or IDs to match
   * @param options - Query configuration options
   * @returns MongoDB query object or null
   */
  createIdQuery(
    fieldName: string, 
    ids: string | string[] | undefined,
    options: { 
      arrayField?: boolean,  // Whether the field is an array in MongoDB
      exactMatch?: boolean   // Whether to use exact match or $in operator
    } = {}
  ): Record<string, any> | null {
    const { arrayField = true, exactMatch = false } = options;
    const objectIds = this.parseIds(ids);
    
    if (!objectIds) return null;
    
    // Handle different query scenarios
    if (objectIds.length === 1 && exactMatch) {
      // Single exact match
      return { [fieldName]: objectIds[0] };
    } 
    else if (arrayField) {
      // Array field in MongoDB, match any value in the array
      return { [fieldName]: { $in: objectIds } };
    } 
    else {
      // Field can equal any of the provided IDs
      return { [fieldName]: { $in: objectIds } };
    }
  },
  
  /**
   * Parse string/boolean values to actual booleans
   * 
   * @param value - Value to parse as boolean
   * @returns Boolean or undefined if not a valid boolean
   */
  parseBoolean(value: string | boolean | undefined): boolean | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  },
  
  /**
   * Creates a regex search query for text fields
   * 
   * @param fields - Fields to search in
   * @param searchTerm - Term to search for
   * @returns MongoDB query object or null if search term is empty
   */
  createSearchQuery(fields: string[], searchTerm?: string): Record<string, any> | null {
    if (!searchTerm || !searchTerm.trim()) return null;
    
    const trimmedSearch = searchTerm.trim();
    return {
      $or: fields.map(field => ({ 
        [field]: { $regex: trimmedSearch, $options: 'i' } 
      }))
    };
  }
  
};