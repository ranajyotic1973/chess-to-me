# Build Script Fix — EPERM Error Resolution

## Problem
When running `npm run dev` or rebuilding with existing dist folders, the build would fail with:
```
Error: EPERM: operation not permitted, unlink 'D:\Projects\chess-to-me\electron\dist\engines'
```

## Root Cause
The `scripts/flatten-electron-dist.js` script was attempting to delete directories using `fs.unlinkSync()`, which only works for files. When the `electron\dist\engines` directory existed from a previous build, the script would fail with a permission error.

## Solution
Updated `scripts/flatten-electron-dist.js` to:

1. **Check if destination is a directory** before deletion
2. **Use `fs.rmSync()` with recursive flag** for directories
3. **Use `fs.unlinkSync()` only for files**
4. **Add `force: true` flag** to handle edge cases on Windows

### Changes Made
```javascript
// Before: Always tried to use fs.unlinkSync() (files only)
if (fs.existsSync(destPath)) {
  fs.unlinkSync(destPath);
}

// After: Check if it's a directory first
if (fs.existsSync(destPath)) {
  const stat = fs.statSync(destPath);
  if (stat.isDirectory()) {
    fs.rmSync(destPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(destPath);
  }
}

// Also improved final cleanup
// Before: fs.rmdirSync(src);
// After: fs.rmSync(src, { recursive: true, force: true });
```

## Testing
✅ Verified fix with multiple consecutive builds:
- Build 1: Success
- Build 2: Success (reuses existing dist)
- Build 3: Success (stress test)

All builds now complete without EPERM errors.

## Impact
- ✅ `npm run build` now works reliably
- ✅ `npm run dev` will no longer fail on subsequent builds
- ✅ Repeated builds don't accumulate permission errors
- ✅ Windows-compatible directory removal

## Files Modified
- `scripts/flatten-electron-dist.js` - Added directory detection and recursive removal
