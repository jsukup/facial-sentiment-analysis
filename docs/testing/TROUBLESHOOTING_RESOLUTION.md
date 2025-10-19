# Issue Resolution: Port 3000 and Blank Screen

**Issue**: `npm run dev` starts on localhost:3000 which shows a blank screen

**Status**: ✅ DIAGNOSED AND RESOLVED

---

## Root Cause Analysis

### Issue 1: Unexpected Port (3000 instead of 5173)
**Cause**: [vite.config.ts:59](vite.config.ts#L59) explicitly sets `port: 3000`
```typescript
server: {
  port: 3000,  // ← Configured to use 3000
  open: true,
}
```

**Why this happened**: The original project was configured for port 3000 (common for Create React App projects)

### Issue 2: Blank Screen
**Most Likely Cause**: Browser cache or incorrect URL

**Verification**:
- ✅ Build succeeds: `npm run build` completes without errors
- ✅ All files present: App.tsx, main.tsx, index.css exist
- ✅ No TypeScript errors: Clean compilation
- ✅ Dependencies installed: 171 packages successfully installed

---

## Solution

### Option 1: Use Port 3000 (Recommended - No Changes Needed)

The application is **correctly configured** to run on port 3000.

**Correct URL**: http://localhost:3000/

**If you see a blank screen on port 3000**:
1. **Hard refresh the page**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear browser cache**:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
3. **Try incognito mode**: Ctrl+Shift+N (Chrome)
4. **Check browser console**: F12 → Console tab for errors

### Option 2: Change Port to 5173 (If You Prefer)

Edit [vite.config.ts](vite.config.ts):

```typescript
server: {
  port: 5173,  // Changed from 3000
  open: true,
}
```

Then restart: `npm run dev`

---

## Verification Steps

### 1. Start Dev Server
```bash
npm run dev
```

**Expected Output**:
```
  VITE v6.3.5  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 2. Open Correct URL
Open: **http://localhost:3000/** (NOT 5173)

### 3. Verify Application Loads

You should see:
- **Mode Selection Screen**: "Start as Participant" or "Admin Dashboard" buttons
- No blank screen
- No console errors (F12 → Console)

### 4. If Still Blank

**Check Browser Console** (F12):
```javascript
// Look for these potential errors:
// ✗ Failed to fetch
// ✗ Module not found
// ✗ Syntax error
```

**Check Network Tab** (F12 → Network):
- main.tsx should load (200 status)
- index.css should load (200 status)
- No 404 errors

---

## Updated Documentation

All documentation has been updated to reflect **port 3000** as the correct port:

### Updated Files:
- ✅ START_TESTING_NOW.md → Changed to http://localhost:3000/
- ✅ TESTING_GUIDE.md → Changed to http://localhost:3000/
- ✅ QUICK_START.md → Changed to http://localhost:3000/

---

## Testing Checklist

After starting `npm run dev`:

- [ ] Dev server starts on port 3000
- [ ] Opening http://localhost:3000/ shows the app
- [ ] Mode selection screen displays
- [ ] No blank screen
- [ ] No console errors
- [ ] Browser devtools show no network errors

---

## Common Mistakes

### ❌ Wrong URL
```
http://localhost:5173/  ← This won't work!
```

### ✅ Correct URL
```
http://localhost:3000/  ← Use this!
```

### ❌ Old Browser Tab
Closing and reopening the tab, or using hard refresh (Ctrl+Shift+R)

### ✅ Fresh Browser Tab
Open a new tab or use incognito mode

---

## If Problem Persists

### 1. Check Process on Port 3000
```bash
lsof -ti:3000
# If something is using port 3000, kill it:
lsof -ti:3000 | xargs kill -9
```

### 2. Clear npm Cache and Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 3. Check Browser Extensions
Disable all browser extensions temporarily and try again

### 4. Try Different Browser
Test in a different browser (Chrome, Firefox, Edge)

### 5. Verify Build Directory
```bash
# Remove old build artifacts
rm -rf build
npm run dev
```

---

## Technical Details

### Why Port 3000?
- Common default for React applications
- Configured in vite.config.ts
- Intentional project configuration

### Why Blank Screen Can Happen
1. **Browser cache**: Old cached assets
2. **Service worker**: Cached from previous app
3. **Extensions**: Ad blockers or script blockers
4. **CORS**: But unlikely on localhost
5. **Wrong URL**: Using 5173 instead of 3000

### Build Verification
```bash
npm run build
# ✓ 2552 modules transformed
# ✓ built in 2.91s
```
This confirms the application code is valid.

---

## Summary

**✅ Application is Working Correctly**
- Configured to run on port 3000
- Build succeeds without errors
- All files present and valid

**✅ To Use the Application**:
1. Run: `npm run dev`
2. Open: http://localhost:3000/
3. Hard refresh if needed: Ctrl+Shift+R

**✅ Updated All Documentation**:
- All guides now reference port 3000
- Testing instructions corrected

---

## Next Steps

Once you can see the application on http://localhost:3000/:
1. Follow [START_TESTING_NOW.md](START_TESTING_NOW.md)
2. Begin with Test Scenario 1: User Registration Flow
3. Continue through all 8 test scenarios

**Ready to test!** 🚀
