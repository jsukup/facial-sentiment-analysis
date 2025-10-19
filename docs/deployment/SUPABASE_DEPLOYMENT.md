# Supabase Deployment Guide

**IMPORTANT**: All Supabase CLI commands must be prefixed with `npx`

---

## Fixed Issues

1. ✅ **File Extension**: Renamed `index.tsx` → `index.ts` (Supabase requires `.ts`)
2. ✅ **CLI Prefix**: All commands now use `npx supabase`

---

## Deployment Commands

### Link Project
```bash
npx supabase link --project-ref spylqvzwvcjuaqgthxhw
```

### Deploy Server Function
```bash
npx supabase functions deploy server
```

### Set Environment Secrets

First, get your Service Role Key from:
https://supabase.com/dashboard/project/spylqvzwvcjuaqgthxhw/settings/api

Then set the secrets:
```bash
npx supabase secrets set SUPABASE_URL=https://spylqvzwvcjuaqgthxhw.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

---

## Verify Deployment

### Test Health Endpoint
```bash
curl https://spylqvzwvcjuaqgthxhw.supabase.co/functions/v1/make-server-8f45bf92/health
```

Expected response:
```json
{"status":"ok"}
```

### Check Function Logs
```bash
npx supabase functions list
npx supabase functions logs server
```

---

## Common Issues

### "Docker is not running" Warning
- This is just a warning, not an error
- Deployment will still work via Supabase cloud

### "Entrypoint path does not exist"
- ✅ FIXED: Renamed index.tsx → index.ts
- Supabase Edge Functions require `.ts` extension

### Authentication Errors
- Make sure you're logged in: `npx supabase login`
- Check access token exists: `ls ~/.supabase/access-token`

---

## All Supabase CLI Commands (Reference)

```bash
# Login/Logout
npx supabase login
npx supabase logout

# Project Management
npx supabase link --project-ref spylqvzwvcjuaqgthxhw
npx supabase projects list

# Function Management
npx supabase functions list
npx supabase functions deploy server
npx supabase functions deploy server --debug
npx supabase functions delete server
npx supabase functions logs server

# Secrets Management
npx supabase secrets list
npx supabase secrets set KEY=value
npx supabase secrets unset KEY

# Database
npx supabase db pull
npx supabase db push
npx supabase db reset

# Local Development
npx supabase start
npx supabase stop
npx supabase functions serve server
```

---

## Next Steps After Deployment

1. Test the deployed health endpoint (see above)
2. Update frontend API URLs if needed (currently hardcoded to production)
3. Run through all 8 test scenarios in [TESTING_GUIDE.md](TESTING_GUIDE.md)
4. Check function logs for any errors: `npx supabase functions logs server`

---

**Status**: Ready to deploy with `npx supabase functions deploy server`
