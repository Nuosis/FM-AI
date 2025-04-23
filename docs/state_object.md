# User State Object Structure

This document outlines the structure of the user state object as used in the application.

## currentUser Object

```javascript
state.auth.user: {
  // User address information
  address: {
    id: String,
    customer_id: String,
    address_line1: String | null,
    address_line2: String | null,
    city: String
    // Additional address fields...
  },
  
  // Authentication metadata
  app_metadata: {
    provider: String,
    providers: Array<String>
  },
  
  // Authentication audience
  aud: String,
  
  // Account confirmation timestamp
  confirmed_at: String,
  
  // User conversations
  conversations: Array,
  
  // Account creation timestamp
  created_at: String,
  
  // Customer information
  customer: {
    id: String,
    name: String,
    email: String
  },
  
  // User email
  email: String,
  
  // Email confirmation timestamp
  email_confirmed_at: String,
  
  // User functions
  functions: Array,
  
  id: String,
  
  // User identities
  identities: Array,
  
  // Anonymous status
  is_anonymous: Boolean,
  
  // Last sign-in timestamp
  last_sign_in_at: String,
  
  // Organization ID
  org_id: String,
  
  // Organization details
  organization: {
    id: String,
    name: String,
    created_at: String,
    updated_at: String
  },
  
  // Organization ID (duplicate)
  organization_id: String,
  
  // User phone
  phone: String,
  
  // User preferences
  preferences: {
    // LLM preferences
    llm_preferences: {
      default: String,
      apiKeyStorage: String,
      defaultProvider: String
    },
    
    // LLM providers configuration
    llm_providers: Array<{
      description: String,
      id: String,
      models: {
        chat: {
          weak: String,
          strong: String
        },
        embedding: {
          large: String,
          small: String
        }
      },
      provider: String,
      baseUrl: String // Optional, present for some providers
    }>,
    
    // UI mode preferences
    mode_preference: {
      darkMode: String
    }
  },
  
  // Recovery email timestamp
  recovery_sent_at: String,
  
  // User role
  role: String,
  
  // Account update timestamp
  updated_at: String,
  
  // User ID (alternative)
  user_id: String,
  
  // User metadata
  user_metadata: {
    email_verified: Boolean,
    first_name: String,
    last_name: String,
    role: String
  }
}