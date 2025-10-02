# E2E Test Failures Analysis

## Summary
39 out of 93 tests are failing. All failures are due to UI element locator mismatches between tests and actual implementation.

## Common Failure Patterns

### 1. Missing data-testid Attributes

The following data-testid attributes are used in tests but likely missing from components:

#### Core Pages
- `main-page` - Main dashboard page
- `whitelist-form` - Whitelist check form container  
- `otp-form` - OTP verification form
- `consent-page` - Privacy policy consent page
- `login-form` - Login/OAuth page
- `admin-policy-page` - Admin policy management page

#### Form Elements
- `phone-input` - Phone number input field
- `otp-input` - OTP code input field
- `consent-checkbox` - Privacy policy consent checkbox
- `policy-content` - Privacy policy content area

#### Buttons
- `submit-whitelist` - Submit whitelist form button
- `accept-consent` - Accept privacy policy button
- `decline-consent` - Decline privacy policy button
- `back-button` - Navigation back button
- `create-simulation` - Create new simulation button
- `logout-button` - Logout button
- `notice-button` - Notice board button
- `help-button` - Help/contact button
- `admin-button` - Admin access button

#### Simulation Management
- `simulation-table` - Simulations list table
- `simulation-row-{id}` - Individual simulation row
- `simulation-checkbox-{id}` - Simulation selection checkbox
- `batch-delete` - Batch delete button
- `run-{id}` - Run simulation button
- `edit-{id}` - Edit simulation button
- `results-{id}` - View results button

#### Plan Editor
- `plan-selector` - Plan type dropdown
- `step-content` - Step content container
- `next-button` - Next step button
- `cancel-button` - Cancel button
- `create-button` - Create simulation button

#### Admin
- `policy-list` - Policy list table
- `policy-editor` - Policy editor container
- `create-policy` - Create policy button
- `save-policy` - Save policy button
- `publish-policy` - Publish policy button
- `delete-policy` - Delete policy button

### 2. Text Content Mismatches

Tests look for specific Korean text that may not match actual UI:

- "환영합니다!" - Welcome message
- "인증번호 받기" - Get verification code button
- "인증하기" - Verify button  
- "다시 받기" / "재전송" - Resend button
- "동의" / "계속" / "계속하기" - Accept/Continue button
- "취소" / "거부" - Cancel/Decline button
- "로그인" - Login text
- "로그아웃" - Logout button
- "플랜 타입" - Plan type label
- "가입.*회차" - Starting round label
- "현재.*회차" - Current round label
- "시뮬레이션.*라운드" - Simulation rounds label
- "투자" / "납입" - Investment label

### 3. Flow Assumptions

Tests assume specific navigation and modal behaviors:

- Consent page appears after OTP verification
- Login page appears after accepting consent  
- Plan editor has 5 distinct steps with specific selectors
- Modals appear for confirmations and errors
- Logout requires confirmation dialog

## Affected Test Files

1. **admin-features.spec.ts** (1 failure)
   - E2E-ADMIN-001: Missing admin-button and admin-policy-page

2. **auth-session.spec.ts** (4 failures)
   - E2E-AUTH-001, E2E-AUTH-002: Login flow navigation issues
   - E2E-AUTH-006: Logout confirmation dialog

3. **error-handling.spec.ts** (6 failures)
   - Various error scenarios with element visibility issues

4. **main-dashboard.spec.ts** (2 failures)
   - E2E-MAIN-002: Empty state detection
   - E2E-MAIN-011: Results navigation

5. **mobile.spec.ts** (1 failure)
   - E2E-MOB-005: Button size measurement

6. **onboarding.spec.ts** (6 failures)
   - All Pre-Auth flow tests expecting specific UI elements

7. **persistence.spec.ts** (4 failures)
   - Draft persistence and logout tests

8. **plan-editor.spec.ts** (14 failures)
   - All wizard step navigation tests

9. **simulation-flow.spec.ts** (1 failure)
   - Navigation to plan editor

## Recommended Fixes

### Approach A: Add data-testid to Components (Recommended)
Add the missing data-testid attributes to actual React components. This provides stable, semantic selectors for tests.

**Benefits:**
- Most reliable for E2E tests
- Semantic and maintainable  
- Doesn't break if text/styling changes
- Best practice for testing

**Example:**
```tsx
// In WhitelistCheckPage component
<div data-testid="whitelist-form">
  <input data-testid="phone-input" />
  <button data-testid="submit-whitelist">인증번호 받기</button>
</div>
```

### Approach B: Use Flexible Selectors in Tests
Modify tests to use more resilient locators (roles, labels, visible text).

**Benefits:**
- No component changes needed
- Tests work with existing UI

**Drawbacks:**
- Less stable (breaks if text changes)
- Harder to maintain
- May be ambiguous

### Approach C: Hybrid (Best Balance)
- Add data-testid for key structural elements (pages, forms, tables)
- Use role-based selectors for buttons, inputs, links
- Use flexible text matching for content verification

## Next Steps

1. Decide on approach (A, B, or C)
2. If A or C: Create PR to add data-testid attributes to frontend components
3. Update failing tests with correct selectors
4. Re-run test suite and iterate
