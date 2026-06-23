# Product Requirements Document (PRD)

## 1. Overview

### What it is

Portfolio Simulation App (Simulation) is a Progressive Web Application (PWA) designed for whitelisted members to run scenario simulations. This simulation does not follow any existing simulation concepts and studies.

### What users can do

Users complete a secure onboarding flow (whitelist verification → OTP → privacy consent → OAuth login) before accessing personalized simulation tools. The application enables users to model various simulation plans (10 plan types), adjust parameters, run calculations, and visualize results across multiple rounds. Users can view results in different format and see a comprehensive result combining multiple plans they choose.

The users with administrator role can manage public notices and privacy policies through a dedicated interface.

### Summary: the core value

This PWA provides mobile-optimized experiences with offline capabilities, saving users time while enabling informed financial planning.

## 2. Users

### Normal Users

- 60–100 whitelisted club members (30–60 concurrent peak)
- Mostly older then 40s
- Mobile-first, some desktop
- Non-technical, Not machine-friendly
- Korean-speaking users (ko-KR locale)
- Mostly Windows OS when desktop
- Mostly Android OS when mobile (some iOS)

### Administrators

- 1–3 internal staff
- Manage notices and privacy policies
- Manage privacy policies and legal documents
- Post public notices and announcements
- Oversee system health and user access
- Tech-fluent, mobile + desktop
- Korean-speaking users (ko-KR locale)

### System Owner

just me.

## 3. User Requirements

They need a secure, user-friendly platform to:

- Run complex financial simulations with multiple plan types
- Model financial outcomes across various scenarios
- Access their simulation history from any device
- Ensure data privacy and controlled access

So, the requirements are:

- Secure whitelist-based access control
- Mobile-optimized simulation interfaces
- Persistent simulation storage with user-specific data
- Progressive Web App capabilities for offline access

## 4. Features

### Pre-Authentication Flow

- Whitelist verification by name and phone number
- SMS-based OTP verification with rate limiting
- Privacy policy display and consent recording (one-time)
- OAuth login (Google, Kakao providers)

### Create & Save Simulation

Create simulations with:

- 10 investment plan types (A, B, C, D, E, F, G, K, P, R)
- Starting company round
- Current company round
- Number of simulation rounds
- Sales amount and Sales achievement rate per simulation round

Save created simulations.

### Update Simulation

Update the saved simulation parameters above, and save the simulation.

### Run Simulation to Get Results

Run financial calculations with the saved simulation. The calculations include:

- Revenue projections
- Commission calculations (32%)
- Bonus structures (round-specific multipliers)
- Tax computations (3.3%)

For details of calculation logic, see [code](../../src/backend/simulation_service.py).

### Get Simulation Results

View simulation results for each plan:

- View detailed results with tables

### Delete Simulation

Delete saved simulations.

### Manage Memo for Simulation

Add or update memo notes for each simulation.

### Dashboard

- View all personal simulation results in sortable table (multi-column sorting)
- Multi-select and batch operations for viewing comprehensive results (limit: one per plan type)
- Quick access to results, editing, deletion, comprehensive results, and memo
- View public notices through modal

### Get Comprehensive Simulation Results

View combined results from multiple selected simulations.

### Public Content

View public notices and announcements on dashboard

- Read published notices from administrators
- Access latest privacy policy versions

### Administrative Functions

- Create, edit, publish, delete notices (with pinning capability)
- Manage privacy policy versions (create, edit, publish, delete)
- Verify admin privileges

## Progressive Web App Capabilities

- Install to device home screen
- Offline access to cached data
- Landscape-oriented mobile experience
- Responsive design for mobile and desktop

## 5. Core User Flows (User Stories)

### New User Onboarding

1. User accesses application URL
   1. mobile
      1. Android
         1. external browser (Chrome)
         2. installed PWA
         3. in-app browser (KakaoTalk, Naver)
      2. iOS
         1. external browser (Chrome, Safari)
         2. installed PWA
         3. in-app browser (KakaoTalk, Naver)
   2. desktop
      1. external browser (Chrome, Edge)
      2. installed PWA
2. Enters name and phone number on whitelist check page
3. System validates against whitelist
4. System sends 6-digit OTP via SMS
5. User enters OTP code within 5 minutes
6. System displays privacy policy
7. User reads policy and clicks "Accept"
   1. One time consent required
   2. Can click "Decline" to return to whitelist page
8. User directed to login page. Selects OAuth provider (Google or Kakao)
9. Proceed login.
10. User completes authentication
11. System directs users to main dashboard

### Create, Modify, and Run Simulation

1. User clicks "Add New Simulation" on dashboard
2. Users [Create & Save Simulation](#create--save-simulation)
3. Users [Update Simulation](#update-simulation) if needed.
4. Users [Run Simulation](#run-simulation-to-get-results)

### Get Simulation Results

1. User clicks "View Results" on simulation row
2. Users [Get Simulation Results](#get-simulation-results)
3. Users reviews results and optionally adds/modifies memo
4. Users [Get Comprehensive Simulation Results](#get-comprehensive-simulation-results) from multiple selected simulations

### Delete Simulations

1. Users [Delete Simulation](#delete-simulation) through dashboard interface.

### Public Notices and Privacy Policies

**Admin Publishes Notice**:

1. Admin logs in and navigates to "공지사항" page
2. Clicks "새 공지"
3. Enters title and content
4. Optionally pins notice
5. Sets published status to true
6. Saves notice
7. Notice appears on all users' dashboards
8. Admin can edit or delete notices

**Admin Publishes Privacy Policy**:

1. Admin clicks "개인 정보 보호 정책"
2. Admin can load existing policy or creates new policy with "새로 만들기"
3. Enters version, locale, content, effective date
4. Saves as draft (published = false)
5. Reviews content. Can see preview.
6. Clicks "게시" to publish
7. New policy becomes active for policy consent flow

## 6. User Interface

**Pre-Authentication Pages**:

- **Whitelist Check Page**:
  - Clean, centered form with club branding
  - Name input field
  - Phone number input with auto-formatting (010-XXXX-XXXX)
  - Submit button
  - Loading indicator during validation

- **OTP Verification Page**:
  - 6-digit code input with large touch targets
  - Countdown timer (MM:SS)
  - Resend button (disabled during cooldown)
  - "Previous" button to return to whitelist form
  - Clear error messages with remaining attempts

- **Consent Page**:
  - Full privacy policy text in scrollable container
  - Checkbox for agreement
  - "Accept" and "Decline" buttons
  - Back navigation option

- **Login Page**:
  - Google OAuth button with brand styling
  - Kakao OAuth button with brand styling
  - Loading states per provider
  - Clear error messages with retry options
  - **Embedded Browser Detection**:
    - Warning banner when detected (dismissible)
    - Google/Kakao login buttons disabled (grayed out)
    - Banner explains why disabled
    - "브라우저에서 열기" guidance in banner

**Main Application**:

- **Dashboard (MainPage)**:
  - Header with app title "익명 시뮬레이션 앱"
  - Action buttons: "공지사항", "문의하기", "로그아웃", "개인 정보 보호 정책", "새 시뮬레이션", "종합 결과"
  - Simulation table with:
    - Multi-column sortable headers (number, plan type, starting round, simulation rounds, creation date)
    - Multi-select checkboxes with validation (one per plan type)
    - Row actions (view results, edit, delete, memo edit/view)

- **Plan Editor**:
  - 5-step Stepper component showing progress
  - Step 1: Plan type selection with descriptions
  - Step 2: Starting company round selection
  - Step 3: Current company round selection
  - Step 4: Simulation round selection
  - Step 5: Sales amount and Sales achievement ratio table per round
  - Navigation buttons (Back, Next, Save)
  - Validation messages inline
  - Draft auto-save to localStorage

- **Results Page**:
  - Per-round breakdown table with:
    - Round number
    - Number of investors (=number of avatars)
    - Round sales amount
    - Cumulative sales amount
    - Cumulative revenue (pre-tax)
    - Cumulative revenue (post-tax)
    - Net income (post-tax)
    - Cumulative Net income (post-tax)
    - Sales achievement rate
  - Back to dashboard button
  - Navigation to allowance table view

- **Allowance Table Page**:
  - Dedicated allowance table view accessible from results
  - Displays per-round allowance payouts and financial totals

- **Comprehensive Results Page**:
  - Combined results from multiple selected simulations
  - Aggregated financial metrics across plans

**Mobile Design**:

- Material-UI responsive components
- Full-screen modals for forms
- Horizontal scroll for wide tables
- 44px minimum touch targets
- Landscape enforcer component (overlay warning for portrait mode)
- Optimized for iPhone 11+ and Galaxy S21+
