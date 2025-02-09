# JWT Authentication Test Implementation Plan

## Overview
The current healthAuth.test.js needs to be updated to properly test the new JWT authentication implementation. This plan outlines the necessary changes and additions.

## Required Changes

### 1. Token Management Updates
- Replace cookie-based token storage with Bearer token authentication
- Add token expiry tracking
- Implement refresh token testing
- Update token cleanup tests

### 2. Helper Function Updates

#### getFetchOptions
```javascript
const getFetchOptions = (method = 'GET', headers = {}, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  // Use Bearer scheme instead of Cookie
  if (accessToken) {
    options.headers.Authorization = `Bearer ${accessToken}`;
  }
  
  return options;
};
```

### 3. New Test Cases

#### Token Refresh Flow Test
```javascript
async function testTokenRefresh() {
  // Test automatic token refresh when close to expiration
  // Verify new token is received and properly stored
  // Check that requests continue working with new token
}
```

#### Token Expiration Test
```javascript
async function testTokenExpiration() {
  // Test handling of expired tokens
  // Verify proper refresh attempts
  // Check error handling for failed refreshes
}
```

#### Token Cleanup Test
```javascript
async function testTokenCleanup() {
  // Test proper token cleanup on logout
  // Verify token is removed from memory
  // Check that subsequent requests fail appropriately
}
```

### 4. Login Function Updates
```javascript
async function login() {
  // Update to handle new token response format
  // Store token expiry
  // Return both token and expiry information
}
```

### 5. Test Sequence
1. Basic health check
2. Login with credentials
3. Test protected endpoints with Bearer token
4. Test token refresh flow
5. Test token expiration handling
6. Test logout and cleanup
7. Verify post-logout state

## Implementation Steps

1. Update helper functions:
   - Modify getFetchOptions for Bearer scheme
   - Add token expiry tracking
   - Implement refresh token logic

2. Add new test functions:
   - testTokenRefresh
   - testTokenExpiration
   - testTokenCleanup

3. Update existing tests:
   - Modify login function
   - Update health endpoint tests
   - Add token verification

4. Add test sequence:
   - Include new test cases in runAllTests
   - Ensure proper test order
   - Add appropriate logging

5. Error handling:
   - Add specific error cases for token issues
   - Implement proper cleanup after failed tests
   - Add detailed logging for debugging

## Next Steps

1. Switch to Code mode to implement these changes
2. Update healthAuth.test.js with the new implementation
3. Test the new implementation thoroughly
4. Update documentation with test results

This plan ensures comprehensive testing of the new JWT authentication system while maintaining code quality and test coverage.