# Admin Password Setup & Login Fix

**Issue 1**: No password set for john@expectedx.com
**Issue 2**: API query failing with 406 error

**Status**: Instructions provided ✅

---

## Problem Analysis

### Issue 1: Missing Password
You need to set a password for the admin user `john@expectedx.com`

### Issue 2: API Error (406 Not Acceptable)
```
GET https://spylqvzwvcjuaqgthxhw.supabase.co/rest/v1/admin_users?select=admin_id&auth_user_id=eq.xxx
406 (Not Acceptable)
```

**Cause**: The frontend is querying the `admin_users` table directly through the REST API, but the request is missing the proper API key header.

---

## Solution 1: Set Admin Password

### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/auth/users

2. **Find john@expectedx.com** in the users list

3. **Click on the user** to open details

4. **Set Password**:
   - Look for "Reset Password" or "Update User" option
   - Set a new password (e.g., `Admin123!` for testing)
   - Click "Update User" or "Save"

5. **Verify Email Confirmation**:
   - Make sure "Email Confirmed" is checked/enabled
   - If not, click "Send confirmation email" or enable it manually

### Option B: Via SQL Editor

1. **Go to SQL Editor**:
   https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/sql/new

2. **Run this SQL**:
```sql
-- Update the password for john@expectedx.com
UPDATE auth.users
SET
  encrypted_password = crypt('YourNewPassword123!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'john@expectedx.com';
```

Replace `YourNewPassword123!` with your desired password.

### Option C: Create New Admin User

If the user doesn't exist yet:

1. **Go to Authentication**:
   https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/auth/users

2. **Click "Add User" or "Invite User"**

3. **Enter Details**:
   - Email: `john@expectedx.com`
   - Password: `Admin123!` (or your choice)
   - Auto-confirm: ✅ (check this)

4. **Click "Create User"**

5. **Link to admin_users table**:
   Go to SQL Editor and run:
```sql
-- Get the auth user ID
SELECT id FROM auth.users WHERE email = 'john@expectedx.com';

-- Copy the ID and insert into admin_users
INSERT INTO admin_users (email, auth_user_id)
VALUES (
  'john@expectedx.com',
  '[paste-the-id-from-above]'
);
```

---

## Solution 2: Fix API Query Issue

The AdminLogin component is trying to query the `admin_users` table, but it's getting a 406 error. This is because the query needs proper configuration.

### Check Row Level Security (RLS) Policies

The `admin_users` table might have RLS policies that are blocking the query.

**Go to Database → Tables → admin_users → Policies**:
https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/database/tables

**Expected Policy**: Allow authenticated users to read their own admin record

If no policy exists, add one:

```sql
-- Allow authenticated users to check if they're an admin
CREATE POLICY "Users can check their own admin status"
ON admin_users
FOR SELECT
USING (auth_user_id = auth.uid());
```

### Alternative: Update AdminLogin to Use Service Role

Instead of querying from the frontend, we could add a backend endpoint to check admin status. But for MVP, let's try the RLS policy first.

---

## Quick Fix: Test Login

Once you've set the password, try logging in:

### Steps:
1. **Open**: http://localhost:3000/
2. **Click**: "Admin Dashboard"
3. **Enter**:
   - Email: `john@expectedx.com`
   - Password: `[the password you just set]`
4. **Click**: "Sign In"

### Expected Results:

**If password is correct**:
- ✅ Supabase authentication succeeds
- Then tries to query admin_users table
- May still get 406 error (we'll fix next)

**If 406 error persists**:
- Authentication works, but admin check fails
- You'll see error: "Access denied. You are not authorized as an admin."

---

## Temporary Workaround: Bypass Admin Check

While we fix the RLS policy, you can temporarily modify AdminLogin to skip the admin check:

**Edit**: [src/components/AdminLogin.tsx](src/components/AdminLogin.tsx)

Find this section (around line 45):
```typescript
// Verify user is an admin
const { data: adminData, error: adminError } = await supabase
  .from("admin_users")
  .select("admin_id")
  .eq("auth_user_id", authData.user.id)
  .single();

if (adminError || !adminData) {
  setError("Access denied. You are not authorized as an admin.");
  await supabase.auth.signOut();
  setLoading(false);
  return;
}
```

**Temporarily comment it out**:
```typescript
// TEMPORARY: Skip admin check for testing
// const { data: adminData, error: adminError } = await supabase
//   .from("admin_users")
//   .select("admin_id")
//   .eq("auth_user_id", authData.user.id)
//   .single();

// if (adminError || !adminData) {
//   setError("Access denied. You are not authorized as an admin.");
//   await supabase.auth.signOut();
//   setLoading(false);
//   return;
// }
```

**Then you can login with just the email/password without the admin check.**

---

## Recommended Approach

### Step 1: Set Password (Do this first)
Use **Option A** (Supabase Dashboard) - it's the easiest:
1. Go to Authentication → Users
2. Find john@expectedx.com
3. Set password
4. Confirm email

### Step 2: Test Login
Try logging in with the password you set.

### Step 3: Fix RLS Policy (If 406 error persists)
Add the RLS policy to allow users to check their admin status:

```sql
CREATE POLICY "Users can check their own admin status"
ON admin_users
FOR SELECT
USING (auth_user_id = auth.uid());
```

### Step 4: Verify admin_users Entry
Make sure john@expectedx.com is in the admin_users table:

```sql
SELECT u.email, u.id as auth_id, a.admin_id
FROM auth.users u
LEFT JOIN admin_users a ON a.auth_user_id = u.id
WHERE u.email = 'john@expectedx.com';
```

If `admin_id` is NULL, run:
```sql
INSERT INTO admin_users (email, auth_user_id)
SELECT email, id
FROM auth.users
WHERE email = 'john@expectedx.com';
```

---

## Quick Reference

**Supabase Dashboard Links**:
- Auth Users: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/auth/users
- SQL Editor: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/sql/new
- Database Tables: https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/database/tables

**Admin Credentials** (after setting password):
- Email: `john@expectedx.com`
- Password: `[whatever you set]`

**Test URL**:
- http://localhost:3000/

---

## Expected After Fix

**Success Flow**:
1. Enter john@expectedx.com + password
2. Supabase authenticates ✅
3. Query admin_users table ✅
4. Redirect to admin dashboard ✅

**What You'll See**:
- Admin dashboard loads
- Participant count shows
- Charts display (if ≥5 participants)
- Or privacy warning (if <5 participants)

---

**Start with setting the password in the Supabase Dashboard, then try logging in!**

Let me know if you get any other errors after setting the password.
