/* global process */
/**
 * LLM Chat Endpoints Test
 * Tests the LLM chat functionality including module listing, model fetching, and chat completions
 * 
 * Prerequisites:
 * 1. Start the backend server: (In most cases the backend will already be running)
 *    - Run ./start.sh in the project root
 *    - Or manually start the backend: cd backend && source venv/bin/activate && python main.py
 * 
 * 2. Required environment variables:
 *    - VITE_API_BASE_URL: Backend API URL
 *    - VITE_FRONTEND_BASE_URL: Frontend URL
 *    - VITE_API_JWT: License key JWT token
 *    - VITE_API_KEY: License key private key
 * 
 * The test will:
 * 1. Fetch available AI modules
 * 2. Fetch available models for a selected module
 * 3. Test chat completion without streaming
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from frontend/.env
const result = dotenv.config({ path: process.cwd() + '/.env' });
if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

const LogType = {
  INFO: 'info',
  WARNING: 'warning',
  DEBUG: 'debug',
  ERROR: 'error'
};

// Test configuration and logging setup
const log = (message, type = LogType.INFO) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

// Load and validate required environment variables
const API_BASE_URL = process.env.VITE_API_BASE_URL;
const FRONTEND_BASE_URL = process.env.VITE_FRONTEND_BASE_URL;
const JWT = process.env.VITE_API_JWT;
const KEY = process.env.VITE_API_KEY;

// Check each required environment variable individually
const missingVars = [];
if (!API_BASE_URL) missingVars.push('VITE_API_BASE_URL');
if (!FRONTEND_BASE_URL) missingVars.push('VITE_FRONTEND_BASE_URL');
if (!JWT) missingVars.push('VITE_API_JWT');
if (!KEY) missingVars.push('VITE_API_KEY');

if (missingVars.length > 0) {
  console.error('\n[ERROR] The following required environment variables are not set:');
  missingVars.forEach(variable => {
    console.error(`- ${variable}`);
  });
  process.exit(1);
}

// Test functions
async function runLLMChatTests() {
  let selectedModuleId = null;
  let selectedModel = null;
  const organizationId = '46e4cf9a-41b7-4187-9512-f8f706592e1b';

  // Test fetching AI modules
  async function testFetchModules() {
    try {
      log('Testing AI modules fetch...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/modules/`, {
        method: 'GET',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Authorization': `LicenseKey ${JWT}:${KEY}`,
          'X-Organization-Id': organizationId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Modules response: ' + JSON.stringify(data.messages, null, 2), LogType.DEBUG);

      // Validate response structure
      if (!data?.response?.data || !Array.isArray(data.response.data)) {
        throw new Error('Invalid response format - expected array of modules');
      }

      // Find first AI module
      const aiModule = data.response.data.find(module => 
        module.fieldData.moduleName.startsWith('AI:')
      );

      if (!aiModule) {
        throw new Error('No AI modules found');
      }

      selectedModuleId = aiModule.fieldData.__ID;
      log(`Selected module ID: ${selectedModuleId}`, LogType.INFO);
      
      log('Modules fetch test successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Modules fetch test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching models for selected module
  async function testFetchModels() {
    try {
      log('Testing models fetch...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/llm/${selectedModuleId}/models`, {
        method: 'GET',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Authorization': `LicenseKey ${JWT}:${KEY}`,
          'X-Organization-Id': organizationId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Models response: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

      // Validate response structure
      if (!Array.isArray(data.models)) {
        throw new Error('Invalid response format - expected array of models');
      }

      if (data.length === 0) {
        throw new Error('No models available for selected module');
      }

      selectedModel = data.models[0];
      log(`Selected model: ${selectedModel}`, LogType.INFO);

      log('Models fetch test successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Models fetch test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test chat completion
  async function testChatCompletion() {
    try {
      log('Testing chat completion...', LogType.INFO);

      const response = await fetch(`${API_BASE_URL}/api/llm/${selectedModuleId}/completion`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `LicenseKey ${JWT}:${KEY}`,
          'X-Organization-Id': organizationId
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello! Please respond with a short greeting.' }
          ],
          moduleId: selectedModuleId,
          model: selectedModel,
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

      if (!data.content) {
        throw new Error('No response content received');
      }

      log(`Full response: ${data.content}`, LogType.INFO);
      log('Chat completion test successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Chat completion test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Run all tests in sequence
  log('\n=== Starting LLM Chat Tests ===\n', LogType.INFO);

  // Test modules fetch
  if (!await testFetchModules()) {
    return false;
  }

  // Test models fetch
  if (!await testFetchModels()) {
    return false;
  }

  // Test chat completion
  if (!await testChatCompletion()) {
    return false;
  }

  log('\n=== All LLM Chat Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runLLMChatTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
