import supabase from '../utils/supabase';
import store from '../redux/store';

/**
 * SupabaseService provides a centralized interface for all Supabase operations
 * with consistent authentication and error handling
 */
class SupabaseService {
  /**
   * Get the current authenticated session from Redux store
   * @returns {Object|null} The current session or null if not authenticated
   */
  getSession() {
    return store.getState().auth.session;
  }

  /**
   * Verify if there is an active authenticated session
   * @returns {boolean} True if authenticated, false otherwise
   */
  isAuthenticated() {
    const session = this.getSession();
    return !!session && !!session.access_token;
  }

  /**
   * Ensure authentication before making requests to protected resources
   * @throws {Error} If not authenticated
   */
  ensureAuthenticated() {
    if (!this.isAuthenticated()) {
      console.error('[SupabaseService] Authentication check failed - no valid session found');
      
      // Get more details about the current session state
      const session = this.getSession();
      console.log('[SupabaseService] Current session state:', {
        exists: !!session,
        hasAccessToken: session ? !!session.access_token : false,
        sessionDetails: session ? {
          expiresAt: session.expires_at,
          tokenType: session.token_type,
          hasUser: !!session.user
        } : 'No session'
      });
      
      throw new Error('Authentication required. Please log in.');
    } else {
      //console.log('[SupabaseService] Authentication check passed');
    }
  }

  /**
   * Handle Supabase errors consistently
   * @param {Object} error - The error object from Supabase
   * @param {string} operation - The operation being performed
   * @throws {Error} A formatted error with consistent structure
   */
  handleError(error, operation) {
    console.error(`[SupabaseService] Error during ${operation}:`, error);
    
    // Format the error message
    const message = error.message || 'Unknown error occurred';
    const code = error.code || 'UNKNOWN_ERROR';
    
    const formattedError = new Error(`${operation} failed: ${message} (${code})`);
    
    // For executeQuery, we need to return the error rather than throw it
    // to prevent unhandled promise rejections
    if (operation === 'executeQuery') {
      return Promise.reject(formattedError);
    } else {
      throw formattedError;
    }
  }

  /**
   * Get data from a table with authentication check
   * @param {string} table - The table name
   * @param {Object} options - Query options (select, filters, etc.)
   * @returns {Promise<Object>} The query result
   */
  async getData(table, options = {}) {
    try {
      this.ensureAuthenticated();
      
      let query = supabase.from(table).select(options.select || '*');
      
      // Apply filters if provided
      if (options.filters) {
        options.filters.forEach(filter => {
          const [column, operator, value] = filter;
          query = query[operator](column, value);
        });
      }
      
      // Apply pagination if provided
      if (options.pagination) {
        const { page, pageSize } = options.pagination;
        query = query.range(page * pageSize, (page + 1) * pageSize - 1);
      }
      
      // Apply ordering if provided
      if (options.order) {
        const { column, ascending } = options.order;
        query = query.order(column, { ascending });
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, `getData:${table}`);
    }
  }

  /**
   * Get a single record from a table
   * @param {string} table - The table name
   * @param {string|number} id - The record ID
   * @param {string} idField - The ID field name (default: 'id')
   * @param {string} select - Fields to select
   * @returns {Promise<Object>} The record
   */
  async getRecord(table, id, idField = 'id', select = '*') {
    try {
      this.ensureAuthenticated();
      
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq(idField, id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, `getRecord:${table}`);
    }
  }

  /**
   * Insert a record into a table
   * @param {string} table - The table name
   * @param {Object} record - The record to insert
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} The inserted record
   */
  async insertRecord(table, record, options = {}) {
    try {
      this.ensureAuthenticated();
      
      let query = supabase.from(table).insert(record);
      
      // Return the inserted record if requested
      if (options.returning) {
        query = query.select(options.returning === true ? '*' : options.returning);
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, `insertRecord:${table}`);
    }
  }

  /**
   * Update a record in a table
   * @param {string} table - The table name
   * @param {Object} updates - The fields to update
   * @param {Object} conditions - The conditions for the update
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} The updated record
   */
  async updateRecord(table, updates, conditions, options = {}) {
    try {
      this.ensureAuthenticated();
      
      let query = supabase.from(table).update(updates);
      
      // Apply conditions
      Object.entries(conditions).forEach(([column, value]) => {
        query = query.eq(column, value);
      });
      
      // Return the updated record if requested
      if (options.returning) {
        query = query.select(options.returning === true ? '*' : options.returning);
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, `updateRecord:${table}`);
    }
  }

  /**
   * Upsert a record in a table (insert or update)
   * @param {string} table - The table name
   * @param {Object} record - The record to upsert
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} The upserted record
   */
  async upsertRecord(table, record, options = {}) {
    try {
      this.ensureAuthenticated();
      
      let query = supabase.from(table).upsert(record, options);
      
      // Return the upserted record if requested
      if (options.returning) {
        query = query.select(options.returning === true ? '*' : options.returning);
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, `upsertRecord:${table}`);
    }
  }

  /**
   * Delete a record from a table
   * @param {string} table - The table name
   * @param {Object} conditions - The conditions for deletion
   * @returns {Promise<void>}
   */
  async deleteRecord(table, conditions) {
    try {
      this.ensureAuthenticated();
      
      let query = supabase.from(table).delete();
      
      // Apply conditions
      Object.entries(conditions).forEach(([column, value]) => {
        query = query.eq(column, value);
      });
      
      // Execute the query
      const { error } = await query;
      
      if (error) throw error;
    } catch (error) {
      this.handleError(error, `deleteRecord:${table}`);
    }
  }

  /**
   * Execute a custom query with authentication check
   * @param {Function} queryFn - Function that takes supabase client and returns a query
   * @returns {Promise<Object>} The query result
   */
  /**
   * Execute a custom query with optional authentication check
   * @param {Function} queryFn - Function that takes supabase client and returns a query
   * @param {Object} options - Options object
   * @param {boolean} options.requireAuth - Whether to require authentication (default: true)
   * @returns {Promise<Object>} The query result
   */
  async executeQuery(queryFn, { requireAuth = true } = {}) {
    try {
      if (requireAuth) {
        //console.log('[SupabaseService] Auth check: required');
        this.ensureAuthenticated();
      } else {
        console.log('[SupabaseService] Auth check: SKIPPED');
      }

      const rawResult = await queryFn(supabase);
      //console.log('[SupabaseService] executeQuery rawResult:', rawResult);

      // Handle case where rawResult is undefined or null
      if (!rawResult) {
        console.error('[SupabaseService] Query returned null or undefined result');
        throw new Error('Query execution failed: No result returned');
      }

      const { data, error } = rawResult;

      if (error) {
        console.error('[SupabaseService] Query error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      return data;
    } catch (error) {
      // Improve error logging to better stringify the error object
      console.error('[SupabaseService] executeQuery error:',
        error.message,
        error.stack,
        'Full error object:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      
      // Return the rejected promise from handleError
      return this.handleError(error, 'executeQuery');
    }
  }
}

// Create and export a singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;