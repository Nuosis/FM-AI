#!/usr/bin/env node
/* global process */
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load frontend .env file
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Validate required environment variables
const requiredVars = ['VITE_PUBLIC_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Generate an API key JWT for license management
async function generateJWT() {
  try {
    // For ApiKey auth, we don't need to fetch modules since it's only for license management
    const modules = [];
    
    // Generate a unique key ID for revocation capability
    const keyId = crypto.randomUUID();
    
    // Current timestamp for iat (issued at)
    const now = Math.floor(Date.now() / 1000);
    
    // JWT payload following auth_plan.md specifications for machine-to-machine auth
    const payload = {
      // Organization ID binding
      org_id: process.env.VITE_PUBLIC_KEY,
      
      // Module permissions
      modules,
      
      // Key metadata
      key_id: keyId,
      description: 'Organization API Key for License Management',
      
      // Token type
      type: 'm2m',  // Changed to m2m to match auth_config.py token_claims
      
      // Timestamps
      iat: now, // Creation timestamp
      exp: now + (365 * 24 * 60 * 60), // 1-year expiration
    };

    // Generate a signing key
    const signingKey = crypto.randomBytes(32).toString('hex');

    // Sign the JWT
    const token = jwt.sign(payload, signingKey, { algorithm: 'HS256' });

    return {
      jwt: token,
      privateKey: signingKey,
      keyId
    };
  } catch (error) {
    console.error('Failed to generate API key:', error.message);
    process.exit(1);
  }
}

try {
  // Generate credentials
  const { jwt: testJwt, privateKey } = await generateJWT();

  // Read existing frontend/.env content
  const frontendEnvPath = resolve(__dirname, '../.env');
  let envContent;
  try {
    envContent = readFileSync(frontendEnvPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      envContent = '';
    } else {
      throw error;
    }
  }

  // Parse existing content
  const envConfig = dotenv.parse(envContent);

  // Update/add the test credentials
  envConfig.VITE_API_JWT = testJwt;
  envConfig.VITE_API_KEY = privateKey;

  // Convert back to .env format
  const newEnvContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Write back to frontend/.env
  writeFileSync(frontendEnvPath, newEnvContent);

  console.log('Successfully generated and saved test API credentials to frontend/.env');
  console.log('API_JWT and API_KEY have been set');
} catch (error) {
  console.error('Failed to generate test credentials:', error);
  process.exit(1);
}
