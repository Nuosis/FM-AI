# Authentication Component Implementation Plan
AI_NOTES:
Axios has been set up to use accessToken for auth
If we need ApiKey or LicenseKey Auth consider using custom axios/fetch instead

## Core Authentication Features

### 1. Authentication Flow [DONE]
- Frontend sends: [DONE]
  - Public key (Organization UUID)
  - Base64-encoded username:password
- Backend validates: [DONE]
  - Organization exists
  - User belongs to organization
  - User credentials are valid

### 2. Token Generation [DONE]
- Two tokens generated on successful auth:
  - Single-use refresh token
  - 15-minute access token containing:
    - Organization ID
    - User ID
    - Party ID
    - Permitted modules

### 3. Machine-to-Machine (M2M) Authentication [DONE]
Two distinct types implemented:

#### A. Organization API Keys (ApiKey) [DONE]
- Purpose: Organization-level access for license operations
- Format: 'Authorization: ApiKey public_key(orgID):privateKey'
- Limited to:
  - License management
  - License Key operations
  - Registration
  - Password changes

#### B. License Keys (LicenseKey) [DONE]
- Purpose: License-specific access for general API usage
- Format: 'Authorization: LicenseKey jwt:privateKey'
- Features:
  - License-bound permissions
  - Expiration checking
  - Module-specific access

### 4. User Management [IN PROGRESS]
- Registration with required fields: [DONE]
  - First Name
  - Last Name
  - Email
  - Display Name
  - Username
  - Password
- Password reset functionality
- Account management

## Implementation Details

### Redux Store Setup [DONE]

#### Auth Slice
```typescript
interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    userId: string;
    orgId: string;
    modules: string[];
  } | null;
  loading: boolean;
  error: string | null;
}
```

### Core Components

#### LoginForm Component [DONE]
- Features:
  - Username/password input fields
  - Organization ID field
  - Form validation
  - Error message display with Snackbar
  - Success message with Snackbar
  - Auto-navigation to Organizations view on success
- Security:
  - Base64 encode credentials
  - Rate limiting feedback
  - Account lockout after failed attempts

#### RegistrationForm Component [IN PROGRESS]
- Required fields validation
- Password requirements:
  - Minimum 8 characters
  - Mixed case
  - Numbers and special characters
  - Common password check
- Real-time validation feedback

#### AuthGuard Component (HOC) [IN PROGRESS]
- Protected route wrapper
- Token validation
- Auto refresh handling
- Module-based access control

### UI/UX Features [DONE]
- Login/Logout menu visibility based on auth state
- Org Settings menu visibility based on auth state
- Auto-redirect to login when not authenticated
- Success/Error notifications via Snackbar
- Clear navigation feedback
- Loading state indicators

### API Services

#### AuthAPI Service [DONE]
```typescript
class AuthAPI {
  login(username: string, password: string, orgId: string): Promise<TokenPair>;
  refreshToken(refreshToken: string): Promise<string>;
  requestPasswordReset(username: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  registerUser(userData: UserRegistrationData): Promise<void>;
  logout(refreshToken: string): Promise<void>;
}
```

### Security Considerations [IN PROGRESS]

#### Token Storage
- In-memory token storage
- Token clearing on window close
- Refresh mechanism
- Expiration handling

#### Request Security [DONE]
- Protocol handling:
  - HTTPS required for external/production URLs
  - HTTP allowed for:
    - localhost development
    - LAN IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- CSRF protection
- Request origin validation
- Rate limiting

### Development Mode Features [DONE]
- Auto-login for localhost (feature flag in .env)
- Extended token expiration
- Debug logging
- Test user injection
- Module permission override

### Error Handling Strategy [DONE]
- Standardized error responses
- User-friendly error messages
- Detailed error logging
- Error recovery flows:
  - Token refresh failures
  - Network disconnections
  - Invalid credentials handling
  - Session timeout handling

### Logging Strategy [DONE]
- Authentication attempts (success/failure)
- Token refresh events
- Security-related events
- User management actions
- Rate limit hits
- Error occurrences
- Development mode activities

### Performance Considerations [IN PROGRESS]
- Token refresh optimization
- Request caching where appropriate
- Minimize unnecessary API calls
- Efficient token storage/retrieval
- Background token refresh

### Accessibility Features [IN PROGRESS]
- Error message screen reader support
- Keyboard navigation
- Focus management
- Loading state indicators
- Clear success/failure feedback

### Testing Strategy [IN PROGRESS]
- Unit tests for components and utilities
- Integration tests for auth flows
- E2E testing for critical paths
- Security testing for token handling
- Performance testing:
  - Token refresh scenarios
  - Concurrent requests
  - Rate limit testing
- Accessibility testing
- Error scenario testing
