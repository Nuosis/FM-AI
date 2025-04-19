# Supabase Edge Functions Documentation

## Overview
This document outlines the required and recommended edge functions for the Supabase integration. These functions serve to handle tasks like authentication, chat message processing, function management, license validation, and module management. They are vital for ensuring seamless interaction between the client and Supabase backend.

## Required Edge Functions

> **Note:** Token verification and refresh are handled automatically by the Supabase JavaScript client library (`@supabase/supabase-js`). The client is configured with `autoRefreshToken: true` in src/utils/supabase.js, which manages JWT validation and session refresh without requiring a custom edge function.

> **Note:** For basic chat message storage and retrieval, Supabase provides built-in methods through its client library:
> - `supabase.from('chat_messages').insert()` for adding messages
> - `supabase.from('chat_messages').select()` for retrieving messages
> - Row Level Security (RLS) policies for controlling access
> - Realtime subscriptions for live updates
>
> A custom edge function would only be necessary if complex processing is required before storing messages (e.g., content moderation, integration with external services, or specialized business logic).

### 1. LLMProxyHandler
- **Purpose:** Securely proxy requests to various LLM providers (OpenAI, Anthropic, Deepseek, LM Studio, Ollama).
- **Input Parameters:**
  - `provider`: The LLM provider to use (e.g., "openai", "anthropic", "deepseek", "lmstudio", "ollama").
  - `model`: The specific model to use.
  - `prompt`: The user's message or prompt.
  - `options`: Additional parameters specific to the provider/model.
- **Expected Output:**
  - The LLM's response.
  - Usage statistics (tokens used, cost, etc.).
- **When/Why to Use:**
  - Essential for securely calling LLM APIs without exposing API keys in client-side code.
  - Provides a unified interface for multiple LLM providers.
  - Enables server-side rate limiting, cost management, and usage tracking.
- **Security Considerations:**
  - Securely store and manage API keys for various providers.
  - Implement rate limiting to prevent abuse.
  - Validate and sanitize inputs to prevent prompt injection attacks.
  - Consider implementing content filtering for both inputs and outputs.

### 2. FunctionHandler
- **Purpose:** Manage and execute user-defined functions.
- **Input Parameters:**
  - `functionId`: Identifier of the function to execute.
  - `payload`: Data payload for the function.
- **Expected Output:**
  - The result of function execution (success/failure and data).
- **When/Why to Use:**
  - Used to dynamically execute functions as part of the application's function management feature.
  - This is a good candidate for a Supabase Edge Function since it requires custom server-side logic for dynamic function execution.
- **Security Considerations:**
  - Verify function permissions, validate payload schema, prevent unauthorized access.
  - Implement proper input validation to prevent injection attacks.
  - Use Supabase RLS policies to control who can execute which functions.
### 3. EmailSender
- **Purpose:** Send emails via the MailJet API.
- **Input Parameters:**
  - `to`: Email address(es) of the recipient(s).
  - `subject`: Email subject line.
  - `content`: Email body content (HTML or text).
  - `templateId`: (optional) MailJet template ID for template-based emails.
  - `variables`: (optional) Variables to populate the template.
  - `attachments`: (optional) Any file attachments.
- **Expected Output:**
  - Success/failure status.
  - Message ID if successful.
  - Error details if failed.
- **When/Why to Use:**
  - For sending transactional emails (welcome emails, password resets, notifications).
  - For sending marketing or bulk emails through MailJet.
- **Security Considerations:**
  - Securely store MailJet API credentials.
  - Validate email addresses to prevent abuse.
  - Implement rate limiting to prevent spam.
  - Log email sending activities for audit purposes.

## Recommended Edge Functions


### 1. LicenseValidator
- **Purpose:** Verify license authenticity and status.
- **Input Parameters:**
  - `licenseKey`: The license key provided by the user.
  - `userId`: Identifier for the user.
- **Expected Output:**
  - License status confirmation (valid/invalid, expiration details).
- **When/Why to Use:**
  - For license verification at login or when accessing licensed modules.
  - **Implementation Options:**
    - Could be implemented as a PostgreSQL function with RLS policies
    - For complex validation logic, a Supabase Edge Function would be appropriate
- **Security Considerations:**
  - Use rate limiting, secure storage, and cryptographic signature verification if applicable.
  - Implement proper error handling to avoid leaking sensitive information.

### 2. ModuleAccessController
- **Purpose:** Control access to organization and license modules.
- **Input Parameters:**
  - `moduleId`: The module in question.
  - `userRole`: Role of the user requesting access.
- **Expected Output:**
  - Access granted or denied message.
- **When/Why to Use:**
  - Check user permissions before providing access to sensitive module features.
  - **Implementation Options:**
    - For basic access control, Supabase Row Level Security (RLS) policies may be sufficient
    - For complex permission logic, a Supabase Edge Function would provide more flexibility
- **Security Considerations:**
  - Mandatory access control enforcement, proper logging of access attempts.
  - Implement consistent access control across all application layers.

## Conclusion

This document outlines how to leverage Supabase's built-in capabilities while implementing custom edge functions only where necessary:

1. **Authentication**: Fully handled by Supabase's built-in authentication system and client library
2. **Chat Messages**: Can use Supabase's direct database access, RLS policies, and realtime subscriptions
3. **LLM Integration**: Requires a secure edge function (LLMProxyHandler) to communicate with external AI providers
4. **Email Sending**: Requires a secure edge function (EmailSender) to call the MailJet API
5. **Function Handler**: Requires a custom edge function for dynamic execution of user-defined functions
6. **License Validation**: Can be implemented using PostgreSQL functions or edge functions depending on complexity
7. **Module Access Control**: Can leverage RLS policies for basic access control or edge functions for complex logic

By taking advantage of Supabase's native features where possible and implementing custom edge functions only where necessary, the application can achieve a more maintainable and secure architecture with less custom code to manage. The exception is for operations that require secure handling of API keys (like LLM integration) or complex server-side logic (like dynamic function execution), where edge functions are essential.