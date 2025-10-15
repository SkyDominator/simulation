
## Rollback Plan

If issues arise after deployment, rollback in this order:

### Level 1: Disable Modal Only
**Action**: Comment out modal rendering in LoginPage
**File**: `src/frontend/src/pages/LoginPage.tsx`
**Code**:
```typescript
{/* Temporarily disabled for rollback
<EmbeddedBrowserWarningModal
  open={showEmbeddedBrowserWarning}
  onClose={() => setShowEmbeddedBrowserWarning(false)}
/>
*/}
```
**Impact**: Users won't see guidance, but OAuth still blocked

### Level 2: Disable Detection
**Action**: Comment out detection check in handleSocialLogin
**File**: `src/frontend/src/pages/LoginPage.tsx`
**Code**:
```typescript
// Temporarily disabled for rollback
// if (isEmbeddedBrowser()) {
//   setShowEmbeddedBrowserWarning(true);
//   return;
// }
```
**Impact**: OAuth attempts proceed, users see 403 error

### Level 3: Full Rollback
**Action**: Revert all commits from this implementation
**Command**: `git revert <commit-hash-range>`
**Impact**: Complete return to previous state

### Monitoring Post-Rollback
- Check error logs for OAuth failures
- Monitor user complaints
- Verify standard browser flow works
- Plan fix for rolled-back issue

---