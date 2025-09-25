# Manual Testing Checklist (Concrete v1.0)

This provides step-by-step manual testing procedures for cross-browser compatibility, PWA functionality, and user acceptance testing. Complements automated tests with real-world validation.

Target: Manual validation of user experience, browser compatibility, and PWA features that cannot be fully automated.

--------------------------------------------------------------------------------
1. Testing Environment Setup
--------------------------------------------------------------------------------

**Required Test Environments:**

**Desktop Testing:**
* Windows 11 + Google Chrome (latest)
* Windows 11 + Microsoft Edge (latest)
* Optional: Firefox (latest), Safari (if Mac available)

**Mobile Testing:**
* iPhone 11 Pro + iOS 18.1.1 + Chrome
* Android device (Samsung Galaxy S21+ or equivalent) + Chrome
* iPad (optional) for tablet testing

**Network Conditions:**
* High-speed WiFi (baseline)
* Slow 3G simulation (mobile)
* Offline mode testing
* Intermittent connectivity

--------------------------------------------------------------------------------
2. Browser Compatibility Testing
--------------------------------------------------------------------------------

### 2.1 Desktop Browser Testing

**Chrome Desktop (Primary)**
```markdown
□ Application loads without errors
□ All pages render correctly
□ Forms submit successfully  
□ Authentication flow works
□ Simulation creation/running functions
□ Navigation between pages smooth
□ Error messages display properly
□ Responsive breakpoints work
□ DevTools console shows no errors
□ PWA installation prompt appears
```

**Edge Desktop (Secondary)**
```markdown
□ Application loads without errors
□ Cross-browser layout consistency maintained
□ All interactive elements function
□ PWA features work (install, offline)
□ Local storage persists data
□ API calls complete successfully
□ Form validation behaves consistently
□ Error handling works as expected
□ Performance acceptable (subjective)
□ No browser-specific UI issues
```

**Firefox Desktop (Optional)**
```markdown
□ Basic functionality works
□ Major UI elements render correctly
□ Authentication completes
□ Core simulation features work
□ No critical JavaScript errors
```

### 2.2 Mobile Browser Testing

**iPhone Chrome (Primary Mobile)**
```markdown
□ App loads on mobile viewport
□ Touch interactions responsive
□ Forms usable with on-screen keyboard
□ Text readable without zooming
□ Buttons appropriately sized for touch
□ Navigation works with touch/swipe
□ Landscape/portrait transitions smooth
□ PWA installation available
□ Offline functionality works
□ Performance acceptable on device
```

**Android Chrome (Secondary Mobile)**
```markdown
□ Consistent behavior with iPhone
□ Android-specific UI elements work
□ Back button behavior appropriate
□ Share functionality works
□ PWA install banner appears
□ Notification permissions work
□ Battery usage reasonable
□ Memory usage acceptable
□ No crashes during normal use
□ Screen reader compatibility basic check
```

--------------------------------------------------------------------------------
3. PWA Feature Testing
--------------------------------------------------------------------------------

### 3.1 PWA Installation Testing

**Desktop PWA Installation (Chrome/Edge)**
```markdown
Pre-conditions: Use incognito/private browsing for fresh test

□ Navigate to application URL
□ Wait for PWA install prompt (may take 30-60 seconds)
□ Install prompt appears in address bar or as banner
□ Click install prompt
□ PWA installs successfully 
□ Desktop shortcut/start menu entry created
□ App opens in standalone window (no browser UI)
□ App window has correct title and icon
□ Close and reopen from desktop - launches correctly
□ App appears in system app list
□ Uninstall process works correctly

Expected Issues to Note:
- Install criteria may not be met immediately
- Prompt timing varies by browser
- Some corporate networks may block PWA features
```

**Mobile PWA Installation (iOS)**
```markdown
Pre-conditions: Use private browsing mode

□ Open application in Safari (iOS requirement)
□ Tap Share button (square with arrow)
□ Select "Add to Home Screen"
□ Customize app name if desired
□ Tap "Add" to confirm
□ App icon appears on home screen
□ Tap icon to launch - opens fullscreen (no Safari UI)
□ App behaves like native app
□ Background app switching works
□ Delete app from home screen works

Note: iOS requires Safari for PWA installation
```

**Mobile PWA Installation (Android)**
```markdown
Pre-conditions: Clear Chrome data for fresh test

□ Open application in Chrome
□ Install banner should appear automatically
□ If no banner, check Chrome menu for "Install App"
□ Tap install option
□ Confirm installation dialog
□ App icon added to home screen
□ Launch from home screen opens as PWA
□ App drawer shows the application
□ App info shows as "Installed web app"
□ Uninstall via app info or home screen works

Troubleshooting:
- Clear Chrome data if install banner doesn't appear
- Check manifest.json is accessible
- Verify service worker registration
```

### 3.2 Offline Functionality Testing

**Basic Offline Testing**
```markdown
□ Load application while online
□ Navigate through several pages
□ Wait for service worker caching (check DevTools)
□ Disable network connection (airplane mode or DevTools)
□ Reload application - should load from cache
□ Navigate between cached pages
□ Verify offline indicator appears
□ Try operations that require network - should show appropriate messages
□ Restore network connection
□ Verify online indicator appears
□ Background sync works for any queued operations

Technical Verification:
- Check DevTools Application tab for cached resources
- Service Worker shows registered and active
- Cache Storage contains expected assets
```

**Service Worker Validation**
```markdown
□ DevTools → Application → Service Workers shows active worker
□ Network tab shows resources served from ServiceWorker
□ Cache Storage populated with app assets
□ Service worker updates when app code changes
□ Background sync queue works for offline actions
□ Push notification setup works (if applicable)

Advanced Testing:
- Simulate slow network to test cache-first strategies
- Test cache expiration and updates
- Verify different cache strategies for different resource types
```

--------------------------------------------------------------------------------
4. User Experience Testing
--------------------------------------------------------------------------------

### 4.1 Complete User Journey Testing

**New User Onboarding Journey**
```markdown
Prerequisites: Clear all browser data, use private/incognito mode

Step 1: Landing and Whitelist Check
□ Navigate to application URL
□ Page loads within 3 seconds on good connection
□ Layout appears correct and professional
□ Form fields clearly labeled in Korean
□ Input placeholders helpful
□ Tab order logical for keyboard navigation

Step 2: Whitelist Form Submission
□ Enter test name: "홍길동"
□ Enter test phone: "010-1234-5678" 
□ Form validation works for invalid formats
□ Submit button enables/disables appropriately
□ Loading state shown during submission
□ Success: proceed to OTP page
□ Failure: clear error message shown

Step 3: OTP Verification
□ OTP input field accepts 6 digits
□ Countdown timer displays and functions
□ Resend OTP option available after timeout
□ Invalid OTP shows appropriate error
□ Valid OTP proceeds to login
□ Attempt limit enforced and communicated clearly

Step 4: OAuth Login
□ OAuth provider buttons clearly visible
□ Click triggers appropriate provider flow
□ Login completes and returns to app
□ User session established correctly
□ Redirect to main application page

Step 5: Main Application Access
□ User welcomed appropriately
□ Main interface intuitive and accessible
□ Navigation clear and responsive
□ Help/documentation easily findable
```

**Returning User Journey**
```markdown
Prerequisites: Previously authenticated user

□ Navigate to application URL
□ Previous session restored (if recent)
□ OR login process streamlined for returning users
□ User data/preferences maintained
□ Recent activity visible/accessible
□ Navigation picks up where left off
```

### 4.2 Core Business Feature Testing

**Simulation Creation and Management**
```markdown
Create New Simulation:
□ Access simulation creation interface
□ Plan selection interface clear and informative
□ Investment amount inputs accept Korean number formats
□ Validation prevents unrealistic values
□ Form saves draft automatically
□ Preview/summary available before final creation
□ Creation success clearly communicated

Run Simulation:
□ Simulation parameters clearly displayed
□ Execution starts immediately or with clear progress
□ Loading state appropriate for expected duration
□ Results display clearly and professionally
□ Charts/graphs render correctly
□ Key metrics highlighted appropriately
□ Export/save functionality works

Manage Existing Simulations:
□ List view shows relevant simulation info
□ Sorting and filtering work intuitively
□ Edit functionality maintains data integrity
□ Delete confirmation prevents accidental loss
□ Bulk operations work if available
```

### 4.3 Error Condition Testing

**Network Error Scenarios**
```markdown
□ Slow network: Loading states appropriate, no timeouts
□ Intermittent connection: Graceful retry mechanisms
□ Complete offline: Clear offline messaging and functionality
□ Server unavailable: Helpful error messages, retry options
□ API rate limiting: Clear explanation and guidance
```

**Input Validation Scenarios**
```markdown
□ Empty required fields: Clear validation messages
□ Invalid formats: Specific format guidance
□ Out-of-range values: Helpful boundary explanations
□ Special characters: Proper handling or clear restrictions
□ Very long inputs: Graceful truncation or limits
```

**Browser Compatibility Issues**
```markdown
□ Older browser versions: Graceful degradation or clear requirements
□ Disabled JavaScript: Appropriate fallback messaging
□ Blocked cookies/storage: Functionality limitations explained
□ Ad blockers: No critical functionality broken
□ Privacy/security settings: Workarounds or clear guidance
```

--------------------------------------------------------------------------------
5. Performance & Usability Testing
--------------------------------------------------------------------------------

### 5.1 Performance Validation

**Load Time Testing**
```markdown
First Visit (Cold Cache):
□ Initial page load < 3 seconds on broadband
□ < 5 seconds on simulated 3G
□ Meaningful content appears quickly (< 1 second)
□ Interactive elements responsive within 2 seconds

Subsequent Visits (Warm Cache):
□ Page loads < 1 second
□ Navigation between pages instantaneous
□ PWA launch time comparable to native apps
```

**Runtime Performance**
```markdown
□ Smooth scrolling on long pages
□ Form interactions feel immediate
□ Animation smooth (60fps subjective check)
□ No noticeable memory leaks during extended use
□ Battery usage reasonable on mobile
□ CPU usage acceptable (no excessive heat)
```

### 5.2 Accessibility Testing

**Basic Accessibility Checks**
```markdown
□ Tab navigation covers all interactive elements
□ Focus indicators clearly visible
□ Color contrast sufficient (subjective check)
□ Text scalable without breaking layout
□ Images have appropriate alt text
□ Form labels properly associated
□ Error messages announced to screen readers (basic test)
□ Keyboard-only operation possible for core functions
```

**Screen Reader Compatibility**
```markdown
□ Enable screen reader (NVDA, JAWS, VoiceOver)
□ Navigate through main interface
□ Form completion possible with audio only
□ Important announcements made appropriately
□ Heading structure logical and navigable
□ Complex widgets (charts, etc.) have text alternatives
```

--------------------------------------------------------------------------------
6. Security & Privacy Testing
--------------------------------------------------------------------------------

### 6.1 User-Facing Security

**Authentication Security**
```markdown
□ Login process uses HTTPS
□ No credentials visible in URLs
□ Session timeout appropriate
□ Logout clears session completely
□ Browser back button doesn't expose protected data
□ Multiple browser tabs handle authentication consistently
```

**Data Privacy**
```markdown
□ Personal information not exposed in error messages
□ PII not visible in browser developer tools
□ Local storage contains no sensitive plain text
□ Privacy policy accessible and understandable
□ Consent processes clear and actionable
```

### 6.2 Business Logic Security

**Input Tampering**
```markdown
□ Browser DevTools modification of form values rejected
□ URL parameter manipulation handled gracefully
□ JavaScript console commands don't expose sensitive functions
□ Copy/paste of extreme values handled appropriately
```

--------------------------------------------------------------------------------
7. Test Execution Tracking
--------------------------------------------------------------------------------

### 7.1 Test Execution Log Template

```markdown
# Manual Test Execution Log

**Test Date:** [DATE]
**Tester:** [NAME]
**Environment:** [OS/Browser/Device]
**Build Version:** [VERSION/COMMIT]

## Browser Compatibility
### Chrome Desktop
- [ ] Pass / [ ] Fail / [ ] N/A - Application loads without errors
- [ ] Pass / [ ] Fail / [ ] N/A - All pages render correctly
[... continue for all checkpoints ...]

**Issues Found:**
1. [Description] - [Severity: Critical/High/Medium/Low] - [Status: Open/Fixed/Deferred]
2. [Description] - [Severity] - [Status]

**Notes:**
[Any additional observations, performance notes, or recommendations]

## Overall Assessment
- [ ] Ready for Production
- [ ] Ready with Minor Issues
- [ ] Not Ready - Critical Issues Present

**Sign-off:** [Name/Date]
```

### 7.2 Issue Tracking Template

```markdown
# Issue Report Template

**Issue ID:** MAN-[NUMBER]
**Date Found:** [DATE]
**Environment:** [Browser/OS/Device]
**Severity:** [Critical/High/Medium/Low]

**Summary:** [Brief description]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:** [What should happen]
**Actual Result:** [What actually happened]

**Screenshots/Evidence:** [Attach if applicable]

**Workaround:** [If available]
**Status:** [Open/In Progress/Fixed/Closed/Deferred]
**Assigned To:** [Developer name]
**Notes:** [Additional context]
```

--------------------------------------------------------------------------------
8. Test Schedule & Frequency
--------------------------------------------------------------------------------

### 8.1 Testing Cadence

**Pre-Release Testing (Complete Suite)**
- Full browser compatibility testing
- Complete PWA installation testing
- Full user journey validation
- Performance and accessibility checks
- Security validation

**Regular Testing (Subset)**
- Weekly: Chrome desktop + iPhone Chrome basic flows
- Bi-weekly: Edge desktop + Android Chrome
- Monthly: Firefox and accessibility checks

**Post-Deployment Validation**
- Production smoke test within 1 hour of deployment
- PWA installation verification
- Critical user flow validation

### 8.2 Test Maintenance

**Monthly Review:**
- Update test procedures based on application changes
- Review and update test data
- Validate test environment setup
- Update browser versions for testing

**Quarterly Assessment:**
- Evaluate testing effectiveness
- Update device/browser target list
- Review and optimize test procedures
- Update issue tracking and reporting

--------------------------------------------------------------------------------
9. Success Criteria
--------------------------------------------------------------------------------

**Minimum Acceptance Criteria:**
- Chrome desktop: 100% core functionality working
- iPhone Chrome: 100% core functionality working
- PWA installation successful on target platforms
- No critical security issues in manual testing
- Core user journeys complete without errors
- Performance acceptable on target devices

**Quality Gates:**
- Zero critical issues in production-blocking tests
- High-severity issues have workarounds or fix timeline
- User experience meets professional standards
- PWA features work as designed
- Cross-browser consistency maintained

**Documentation Requirements:**
- All test results documented
- Issues properly categorized and tracked
- Test evidence captured (screenshots where needed)
- Sign-off provided by designated tester
- Recommendations for improvement documented

End of Manual Testing Checklist.