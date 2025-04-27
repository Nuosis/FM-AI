import apiService from './apiService';

/**
 * Tool Service
 * 
 * Provides methods for managing and executing tools (Python functions)
 * stored in the database and executed via the proxy server or edge functions.
 */
const toolService = {
  /**
   * Get all tools
   * 
   * @returns {Promise<Array>} - Array of tools
   */
  async getTools() {
    try {
      const response = await apiService.get('/functions');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching tools:', error);
      throw error;
    }
  },
  
  /**
   * Get a tool by ID
   * 
   * @param {string} id - The tool ID
   * @returns {Promise<Object>} - The tool data
   */
  async getToolById(id) {
    try {
      const response = await apiService.get(`/functions/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching tool with ID ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new tool
   * 
   * @param {Object} toolData - The tool data
   * @param {string} toolData.name - The tool name
   * @param {string} toolData.description - The tool description
   * @param {string} toolData.code - The Python code for the tool
   * @param {string} toolData.created_by - User ID of the creator
   * @returns {Promise<Object>} - The created tool
   */
  async createTool(toolData) {
    try {
      console.log('Creating tool with data:', toolData);
      
      // Validate required fields
      if (!toolData.name || !toolData.description || !toolData.code) {
        throw new Error('Missing required fields: name, description, and code are required');
      }
      
      const response = await apiService.post('/functions', toolData);
      return response.data;
    } catch (error) {
      console.error('Error creating tool:', error);
      throw error;
    }
  },
  
  /**
   * Update a tool
   * 
   * @param {string} id - The tool ID
   * @param {Object} toolData - The updated tool data
   * @returns {Promise<Object>} - The updated tool
   */
  async updateTool(id, toolData) {
    try {
      const response = await apiService.put(`/functions/${id}`, toolData);
      return response.data;
    } catch (error) {
      console.error(`Error updating tool with ID ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a tool
   * 
   * @param {string} id - The tool ID
   * @returns {Promise<Object>} - The deletion response
   */
  async deleteTool(id) {
    try {
      const response = await apiService.delete(`/functions/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting tool with ID ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Execute a tool
   * 
   * @param {string} id - The tool ID
   * @param {Object} input - The input data for the tool
   * @returns {Promise<Object>} - The execution result
   */
  async executeTool(id, input) {
    try {
      console.log(`Executing tool with ID ${id} and input:`, input);
      
      // First check if the local proxy server is running
      try {
        // Try to connect to the proxy server health endpoint
        const healthResponse = await fetch('http://localhost:3500/health', { method: 'GET' });
        
        if (healthResponse.ok) {
          const responseText = await healthResponse.text();
          const responseObj = JSON.parse(responseText);
          
          if (responseObj.status === 'healthy') {
            console.log('Proxy server health check successful, executing code');
            
            // Fetch the tool code from the database
            const toolData = await this.getToolById(id);
            
            if (!toolData || !toolData.code) {
              throw new Error(`Tool not found or has no code: ${id}`);
            }
            
            // Clean up the code by removing @tool() decorator if present
            let cleanCode = toolData.code;
            if (cleanCode.includes('@tool()')) {
              cleanCode = cleanCode.replace(/@tool\(\).*?\n/g, '');
            }
            
            // Execute the code using the proxy server's /execute endpoint
            const executeResponse = await apiService.callLocalService('/execute', {
              code: cleanCode,
              input: input
            });
            
            return executeResponse;
          } else {
            throw new Error(`Proxy server health check failed: unexpected response`);
          }
        } else {
          throw new Error(`Proxy server health check failed with status: ${healthResponse.status}`);
        }
      } catch (proxyError) {
        console.error('Proxy server error:', proxyError);
        
        // Try using the edge function as a fallback
        try {
          console.log('Attempting to execute via edge function');
          const response = await apiService.callEdgeFunction('pythonExecuteHandler', { id, input });
          return response;
        } catch (edgeFunctionError) {
          console.error('Edge function error:', edgeFunctionError);
          throw new Error(`Failed to execute tool: ${edgeFunctionError.message}`);
        }
      }
    } catch (error) {
      console.error(`Error executing tool with ID ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Check if the local proxy server is running
   * 
   * @returns {Promise<boolean>} - True if the proxy server is running
   */
  async isProxyServerRunning() {
    try {
      const response = await fetch('http://localhost:3500/health', { method: 'GET' });
      
      if (response.ok) {
        const responseText = await response.text();
        const responseObj = JSON.parse(responseText);
        return responseObj.status === 'healthy';
      }
      
      return false;
    } catch (error) {
      console.error('Error checking proxy server status:', error);
      return false;
    }
  }
};

export default toolService;