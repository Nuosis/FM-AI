# JWT Role Implementation

This document explains how user roles are implemented in the JWT token for Supabase authentication and how to use these roles in Row Level Security (RLS) policies.

## Overview

We've implemented a solution to ensure that user roles are properly included in the JWT token issued by Supabase. This allows us to use role-based access control in our Supabase RLS policies without needing additional database queries.

## Implementation Details

### 1. Setting Role During Sign-Up

When a user registers, we now include the role in the JWT metadata:

```javascript
// In authSlice.js - signUpWithEmail function
const { data, error } = await supabaseService.executeQuery(supabase =>
  supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        role: 'user' // Default role in JWT metadata
      }
    }
  })
);
```

### 2. Updating Role for Existing Users

For existing users who don't have the role in their JWT metadata, we update it during sign-in:

```javascript
// In authSlice.js - signInWithEmail function
// Check if user has role in metadata, if not, update it
if (result.user && !result.user.user_metadata?.role && safeProfileData.role) {
  console.log('[Auth] User does not have role in metadata, updating it');
  try {
    const { data: updateData, error: updateError } = await supabaseService.executeQuery(supabase =>
      supabase.auth.updateUser({
        data: { role: safeProfileData.role }
      })
    );
    
    if (updateData) {
      console.log('[Auth] Updated user metadata with role:', safeProfileData.role);
      
      // Refresh session to get updated JWT
      const { data: refreshData } = await supabaseService.executeQuery(supabase =>
        supabase.auth.refreshSession()
      );
      
      if (refreshData && refreshData.session) {
        result.session = refreshData.session;
      }
    }
  } catch (updateError) {
    console.error('[Auth] Error updating user metadata:', updateError.message);
  }
}
```

### 3. JWT Debugger Component

We've added a `JwtDebugger` component that allows you to inspect the JWT token and verify that it contains the role information. This component is only shown in development mode and when the user is authenticated.

## Using Roles in RLS Policies

To use the role from the JWT token in your Supabase RLS policies, you need to access it from the `user_metadata` field:

```sql
-- Example RLS policy that allows admins to access all records
CREATE POLICY "Admins can access all records" ON "public"."your_table"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Example RLS policy that allows users to access only their own records
CREATE POLICY "Users can access their own records" ON "public"."your_table"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  auth.uid() = user_id OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
```

## Updating User Roles

When updating a user's role, you need to update both the database and the JWT metadata:

```javascript
async function updateUserRole(userId, newRole) {
  // Update role in database
  const { error: dbError } = await supabaseService.executeQuery(supabase =>
    supabase
      .from('user_profile')
      .update({ role: newRole })
      .eq('user_id', userId)
  );
  
  if (dbError) throw dbError;
  
  // Update role in JWT metadata
  const { error: authError } = await supabaseService.executeQuery(supabase =>
    supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role: newRole }
    })
  );
  
  if (authError) throw authError;
  
  return { success: true };
}
```

## Troubleshooting

If you're experiencing issues with role-based access control:

1. Use the JWT Debugger component to verify that the JWT token contains the role information
2. Check your RLS policies to ensure they're using the correct path to access the role: `auth.jwt() -> 'user_metadata' ->> 'role'`
3. Make sure the user has logged out and logged back in after any role changes, as the JWT token is only updated during authentication

## Security Considerations

- The role in the JWT token is controlled by the client during sign-up, which means users could potentially manipulate it
- For sensitive operations, you should always verify the role in the database as well
- Consider implementing server-side validation for role changes