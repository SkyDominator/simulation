# User Flow Document (UXD)

This document outlines the key user focus steps for each major user journey for the financial simulation PWA, detailing the steps users take to interact with the application.

## 1. Pre-Authentication Flow

**User Journey**: New User Onboarding (Whitelist → OTP → Consent → Login → Dashboard)

### Step 1: Whitelist Check

**User Focus**:

1. User sees centered form with club branding
2. User enters name in `TextField`
3. User enters phone number with auto-formatting (010-XXXX-XXXX) in `TextField`
4. User clicks "인증번호 받기" `Button`

### Step 2: OTP Verification

**User Focus**:

1. User sees OTP entry form; countdown timer appears only after requesting a resend
2. User enters 6-digit code in `TextField`
3. User clicks "인증하기" `Button`
4. If expired/incorrect: User clicks "인증번호 재전송" `Button`
5. If need to change info: User clicks "이전으로" `Button`

### Step 3: Consent Flow Orchestration

**User Focus**:

1. User automatically proceeds once OTP verification succeeds
2. User is taken to the consent page when no prior privacy approval exists
3. User is sent straight to the login page when consent has already been recorded

### Step 4: Privacy Policy Consent

**User Focus**:

1. User sees privacy policy content in scrollable container
2. User reads markdown-formatted policy via `ReactMarkdown`
3. User checks agreement `Checkbox`
4. User clicks "계속하기" `Button` or "취소" `Button`

### Step 5: OAuth Login

**User Focus**:

1. User sees OAuth provider buttons (Google, Kakao)
2. If embedded browser is detected, user reads banner explaining why login buttons are disabled
3. User clicks "Google로 로그인" `Button` or "Kakao로 로그인" `Button`
4. User completes provider authentication and returns to the app
5. User regains control once Supabase session is established

### Step 6: Post-Login Navigation

**User Focus**:

1. Once authenticated, the app routes user to the main dashboard automatically
2. If the session expires on a protected page, the app redirects user back to the whitelist entry flow

## 2. Simulation Management Flow

**User Journey**: Create and Run Simulation

### Step 1: Open Plan Editor

**User Focus**:

1. User sees dashboard with simulation table
2. User clicks "새 시뮬레이션" `Button`

### Step 2: Plan Type Selection (Step 1/5)

**User Focus**:

1. User views stepper indicator showing current progress (1/5)
2. User opens plan type dropdown listing A, B, C, D, E, F, G, K, P, R
3. User selects the desired plan option
4. User advances with "다음 단계" `Button`

### Step 3: Starting Company Round Selection (Step 2/5)

**User Focus**:

1. User enters starting company round between 1 and 100
2. User adjusts value until validation passes
3. User continues with "다음 단계" `Button`

### Step 4: Current Company Round Selection (Step 3/5)

**User Focus**:

1. User inputs current company round that's at least the starting round
2. User resolves validation prompts if the value is too low
3. User proceeds with "다음 단계" `Button`

### Step 5: Simulation Rounds Selection (Step 4/5)

**User Focus**:

1. User enters total simulation rounds within the allowed range
2. User corrects entries that fall outside global limits
3. User moves forward with "다음 단계" `Button`

### Step 6: Investment & Sales Achievement Rate Entry (Step 5/5)

**User Focus**:

1. User sees table with rows for each simulation round
2. User enters investment amount per round in `TextField`
3. Starting at 개인 회차 4, user inputs sales achievement rate (%) via inline field
4. User clicks "저장" `Button` to commit entries

### Step 7: Run Simulation from Dashboard

**User Focus**:

1. User reviews simulation list in `SimulationTable`
2. User taps the green play icon (`결과 보기` tooltip) in the desired row
3. User waits for processing and then views the results page

### Step 8: View Results

**User Focus**:

1. User sees result summary and per-round breakdown table
2. User reviews financial metrics such as 회차, 아바타 개수, 회차 매출액, 매출계, 수당계(세전), 수당계(세후), 실납입(세후), 실납입계, 매출 달성율
3. User opens the allowance table via "수당표 보기" `Button` when detailed payouts are needed
4. User returns to the dashboard with the "돌아가기" `Button`

### Step 9: View Allowance Table

**User Focus**:

1. User sees allowance breakdown organized by investor start round
2. User reviews per-investor revenue and payment details for each round
3. User closes the view with the "돌아가기" `Button`

## 3. Simulation CRUD Operations

### Edit Simulation

**User Focus**:

1. User taps the pencil icon (`편집` tooltip) on a simulation row
2. User returns to the plan editor pre-filled with existing plan data
3. User adjusts fields and saves changes to update the simulation

### Delete Simulation

**User Focus**:

1. User taps the trash can icon (`삭제` tooltip) on a simulation row
2. User reviews the confirmation modal and decides whether to proceed
3. User confirms deletion to remove the plan from the dashboard

### Update Memo

**User Focus**:

1. User opens the memo modal by selecting the memo chip, which shows the memo snippet or "메모 없음" when empty
2. User edits memo text in the multiline field
3. User saves to persist the updated memo with the simulation
4. User cancels or closes the modal to discard changes when needed

## 4. Comprehensive Results Flow

**User Focus**:

1. User selects simulations via checkboxes with one selection per plan type
2. User clicks "종합 결과" `Button`
3. User waits while combined calculations finish
4. User reviews consolidated metrics inside the dashboard summary section

## 5. Public Notices Flow

### View Notices (User)

**User Focus**:

1. User clicks "공지사항" `Button`
2. User browses the notice list inside the modal
3. User selects a notice to read sanitized content
4. User closes the modal after reviewing announcements
5. User returns to the dashboard without losing context

### Manage Notices (Admin)

**User Focus**:

1. Admin opens the notice modal and sees management controls when authorized
2. Admin clicks "새 공지" to draft or edits existing notices
3. Admin fills in title and content fields and adjusts pin/publish switches
4. Admin saves changes to update the notice list for members
5. Admin deletes outdated notices when necessary, confirming the action if prompted
6. Admin closes the modal once management tasks finish

## 6. Privacy Policy Management (Admin)

**User Focus**:

1. Admin navigates to "개인 정보 보호 정책" from the dashboard
2. Admin selects an existing policy version or starts a new draft
3. Admin enters version, locale, content, and effective date details
4. Admin previews content to verify formatting before publishing
5. Admin saves drafts to persist edits safely
6. Admin publishes the policy when ready for member consent
7. Admin returns to the dashboard after confirming the latest policy state

## 7. Session Management

### Logout

**User Focus**:

1. User clicks "로그아웃" `Button`
2. User observes a brief loading state while the session clears
3. User returns to the whitelist page ready for a fresh login

### Session Persistence

**User Focus**:

1. User reopening the app sees the current session restored when still valid
2. User stays signed in as Supabase refreshes tokens in the background
3. User is prompted to reauthenticate if automatic renewal fails

## 8. Error Handling Patterns

**User Focus**:

1. User sees inline alerts on pre-auth screens, while dashboard actions and the plan editor surface failures via browser alert dialogs
2. User retries actions using prompts like "재전송" when errors appear
3. User is guided back to the whitelist check flow if authentication becomes invalid
4. User receives targeted validation tips to correct incorrect input

## 9. State Persistence Patterns

**User Focus**:

1. User resumes draft simulations from the last saved step after reopening the editor
2. User returns to dashboard views with previous selections still applied
3. User reopens the notice modal or results page in the same state after refresh
4. User sees temporary data cleared automatically once a save completes or they cancel
