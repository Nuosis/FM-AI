#!/usr/bin/env node
/* global process */
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Get user_id from command line arguments
const userId = process.argv[2];

// Validate user_id
if (!userId) {
  console.error('Error: Missing user_id argument');
  console.error('Usage: node generate-jwt.js <user_id>');
  process.exit(1);
}

// Validate required environment variables
const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Error: Missing required environment variables:', missingVars.join(', '));
  console.error('Make sure to add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

/**
 * Generate a JWT for a user using Supabase Admin API
 * @param {string} userId - The user ID to generate a token for
 * @returns {Promise<string>} - The JWT token
 */
async function generateJWT(userId) {
  try {
    console.log('Supabase URL:', supabaseUrl);
    console.log('User ID:', userId);
    
    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Get the user to verify they exist
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      throw new Error(`Failed to get user: ${userError.message}`);
    }
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    console.log('User found:', user.user.email);
    
    // Create a new session for the user
    // Different versions of Supabase JS client have different methods
    // Try the available methods to create a session
    let data, error;
    
    try {
      console.log('Attempting to create session using signInWithPassword...');
      // First try to get the user's email from the user object
      const email = user.user.email;
      
      // Generate a random password (this won't actually be used)
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Sign in as the user
      ({ data, error } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword
      }));
      
      // This will likely fail with wrong password, but we'll handle that
      if (error && error.message.includes('Invalid login credentials')) {
        console.log('Expected auth error (wrong password). Trying admin auth...');
        
        // Try using admin.generateLink instead
        console.log('Attempting to use admin.generateLink...');
        ({ data, error } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: 'http://localhost:3000'
          }
        }));
        
        if (error) {
          throw new Error(`Failed to generate link: ${error.message}`);
        }
        
        // Extract token from the link
        const link = data.properties.link;
        const token = new URL(link).hash.split('=')[1];
        return token;
      }
    } catch (methodError) {
      console.log('Method not available:', methodError.message);
      
      // Last resort: try to create a custom JWT
      console.log('Creating a custom JWT as fallback...');
      
      // Create a simple JWT with the user's ID
      const payload = {
        sub: userId,
        email: user.user.email,
        role: 'authenticated',
        aud: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
      };
      
      // Sign with the service role key (not ideal but works for testing)
      return jwt.sign(payload, serviceRoleKey);
    }
    
    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
    
    if (!data || !data.access_token) {
      throw new Error('No access token returned from Supabase');
    }
    
    return data.access_token;
  } catch (error) {
    console.error('Failed to generate JWT:', error.message);
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    // Generate JWT for the provided user_id
    const token = await generateJWT(userId);
    
    // Decode the JWT to verify its contents
    const decodedToken = jwt.decode(token);
    
    // Output the JWT to the console
    console.log('Successfully generated JWT for user_id:', userId);
    console.log('\nJWT Token:');
    console.log(token);
    
    // Also show how to use it in the Authorization header
    console.log('\nUse in Authorization header:');
    console.log(`Authorization: Bearer ${token}`);
    
    // Display the decoded token
    console.log('\nDecoded JWT (payload):');
    console.log(JSON.stringify(decodedToken, null, 2));
    
    console.log('\nTo verify this token online:');
    console.log('1. Go to https://jwt.io');
    console.log('2. Paste the token in the "Encoded" section');
    console.log('3. The payload will be displayed in the "Decoded" section');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
