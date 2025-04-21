# SettingsForm Component: Requirements & Design

## Purpose

The `SettingsForm` component enables users to view and update their personal profile, account security, application preferences, and LLM provider settings in a secure, maintainable, and user-friendly way.

---

## Functional Requirements

### 1. Profile Management
- **Fields:** First Name, Last Name, Phone, City, State, Email (display only)
- **Actions:** View and update profile information
- **Backend Mapping:**
  - `customers`: first_name, last_name, name
  - `customer_phone`: phone, is_primary
  - `customer_address`: city, state
  - `customer_email`: email (display only; not editable here)

### 2. Password Management
- **Fields:** Current Password, New Password, Confirm Password
- **Actions:** Change password securely
- **Backend Mapping:** Handled via authentication system, not directly in database tables

### 3. Application Preferences
- **Fields:** UI Mode (dark/light/system)
- **Actions:** Set and persist UI mode
- **Backend Mapping:**
  - `user_preferences`: key = `mode_preference`, value = `{ "darkMode": "system" }`

### 4. LLM Provider Settings
- **Fields:** Default provider, per-provider API key, endpoint, preferred models, storage method, custom settings
- **Actions:** Configure and manage multiple LLM providers, set default, manage API keys securely
- **Backend Mapping:**
  - `user_preferences`: key = `llm_preferences`, value = provider-centric JSON object (see below)
  - `llm_api_keys`: (if apiKeyStorage is "saved") user_id, provider, api_key (encrypted), with strict row-level security

---

## LLM Preferences: Provider-Centric Structure

```json
{
  "defaultProvider": "openAI",
  "providers": {
    "openAI": {
      "apiKeyStorage": "saved", // or "local" or "session"
      "endpoint": "https://api.openai.com/v1",
      "preferredStrongModel": "gpt-4",
      "preferredWeakModel": "gpt-3.5-turbo",
      "customSettings": { /* ... */ }
    },
    "anthropic": {
      "apiKeyStorage": "session",
      "endpoint": "https://api.anthropic.com/v1",
      "preferredStrongModel": "claude-3-opus",
      "preferredWeakModel": "claude-3-haiku",
      "customSettings": { /* ... */ }
    }
  }
}
```
- `defaultProvider`: The provider used by default for LLM operations.
- `providers`: Object keyed by provider name, each with its own configuration.
- `apiKeyStorage`: Where the API key is stored ("saved", "local", or "session").
- `customSettings`: Extensible for provider-specific options.

---

## Secure API Key Storage

- **Never store API keys in user_preferences or expose them to the client.**
- If `apiKeyStorage` is "saved":
  - Store the key in a backend-only table (`llm_api_keys`) with row-level security and encryption.
  - Only backend services can access the key; the frontend never receives it after initial entry.
  - All LLM API calls using saved keys must be proxied through the backend.
- The frontend may display a masked indicator (e.g., "••••••••") to show a key is set.

---

## State Management & Data Flow

- **Single Source of Truth:** Use Redux for all user and preference state. Local state is only for temporary form values.
- **Initialization:** On mount, load all settings from Redux (populated from backend).
- **Updates:** On submit, validate locally, then dispatch Redux actions to update backend and state.
- **Backend Communication:** All sensitive operations (profile, password, preferences, LLM config) are performed via secure, authenticated API calls.

---

## UI/UX Principles

- **Clarity:** Group related settings in clear sections (Profile, Security, Preferences, LLM Providers).
- **Feedback:** Show loading indicators and success/error notifications for all async actions.
- **Accessibility:** Use accessible form controls and ARIA labels.
- **Validation:** Validate all fields before submission and provide actionable error messages.

---

## Summary

- The SettingsForm must provide a unified, secure, and extensible interface for user settings.
- LLM provider configuration is provider-centric, supporting multiple providers and secure key management.
- All sensitive data is handled securely, with backend-only storage for API keys and strict access controls.
- The component should be simple to use, robust, and easy to maintain.