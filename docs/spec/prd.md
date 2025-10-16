# Product Requirements Document (PRD)

## 1. Product Name: Light of Life Club Investment Simulation PWA

Light of Life Club Investment Simulation is a Progressive Web Application designed for whitelisted members to run sophisticated financial investment simulations. Users complete a secure onboarding flow (whitelist verification → OTP → privacy consent → OAuth login) before accessing personalized simulation tools. The application enables users to model various investment plans (10 plan types), adjust parameters, run calculations, and visualize results across multiple rounds. Administrators can manage public notices and privacy policies through a dedicated interface. The PWA provides mobile-optimized experiences with offline capabilities, saving users time while enabling informed financial planning.

## 2. Problem & Users

**Problem**:

Whitelisted club members need a secure, user-friendly platform to:

- Run complex investment simulations with multiple plan types
- Model financial outcomes across various scenarios
- Access their simulation history from any device
- Ensure data privacy and controlled access

Current alternatives lack:

- Secure whitelist-based access control
- Mobile-optimized simulation interfaces
- Persistent simulation storage with user-specific data
- Progressive Web App capabilities for offline access

**Target Users**:

- **End Users**: 60–100 whitelisted club members (30–60 concurrent peak)
  - Small to mid-sized investors
  - Members requiring financial planning tools
  - Users preferring mobile and desktop access
  - Korean-speaking users (ko-KR locale)

- **Administrators**: 1–3 internal staff
  - Manage privacy policies and legal documents
  - Post public notices and announcements
  - Oversee system health and user access

- **System Owner**: Technical maintainer with full admin privileges

## 3. Features

**Pre-Authentication Flow**:

- Whitelist verification by name and phone number (SHA256 hashing)
- SMS-based OTP verification with rate limiting (3 sends per 15 minutes)
- Privacy policy display and consent recording
- Supabase OAuth login (Google, Kakao providers)

**Simulation Management**:

- Create simulations with 10 investment plan types (A, B, C, D, E, F, G, K, P, R)
- Configure plan parameters:
  - Starting company round
  - Number of simulation rounds
  - Investment schedules
  - Sales achievement rates
- Run financial calculations with:
  - Revenue projections
  - Commission calculations (32%)
  - Bonus structures (round-specific multipliers)
  - Tax computations (3.3%)
- View detailed results with tables and charts
- Update simulation inputs and memo notes
- Delete simulations
- Export results for offline review

**User Dashboard**:

- View all personal simulations in sortable table
- Multi-select and batch operations
- Filter and search simulations
- Quick access to results and editing

**Public Content**:

- Read published notices from administrators
- Access latest privacy policy versions

**Administrative Functions**:

- Create, edit, publish, delete notices
- Manage privacy policy versions (create, edit, publish, delete)
- Enforce single published policy per version/locale
- Verify admin privileges

**Progressive Web App Capabilities**:

- Install to device home screen
- Offline access to cached data
- Landscape-oriented mobile experience
- Responsive design for mobile and desktop

## 4. Core User Flows (User Stories)

**New User Onboarding**:

1. User accesses application URL
2. Enters name and phone number on whitelist check page
3. System validates against whitelist via SHA256 hash
4. System sends 6-digit OTP via SMS
5. User enters OTP code within 5 minutes
6. System displays privacy policy (fetched from database or static file)
7. User reads policy and clicks "Accept"
8. System records consent with timestamp and user_hash
9. User selects OAuth provider (Google or Kakao)
10. System redirects to Supabase OAuth flow
11. User completes authentication
12. System redirects to main dashboard

**Create and Run Simulation**:

1. User clicks "Add New Simulation" on dashboard
2. System displays 5-step plan editor wizard
3. User selects plan type (A–R)
4. User configures:
   - Starting company round
   - Number of rounds to simulate
   - Investment schedule (auto-generated or custom)
   - Sales achievement rates (optional overrides)
5. User reviews configuration and clicks "Create"
6. System saves simulation to database
7. User clicks "Run Simulation"
8. System executes financial calculations
9. System displays results with:
   - Per-round breakdown tables
   - Revenue, commission, bonus, tax details
   - Cumulative totals
   - Visual charts
10. User reviews results and optionally adds memo
11. Simulation appears in dashboard list

**Update Simulation**:

1. User opens simulation from dashboard
2. Clicks "Edit Parameters"
3. Modifies investment schedule or sales rates
4. Saves changes
5. System clears previous results
6. User re-runs simulation to see updated outcomes

**Admin Publishes Notice**:

1. Admin logs in and navigates to admin panel
2. Clicks "Create Notice"
3. Enters title and content
4. Optionally pins notice
5. Sets published status to true
6. Saves notice
7. Notice appears on all users' dashboards

**Admin Publishes Privacy Policy**:

1. Admin creates new policy version
2. Enters version, locale, content, effective date
3. Saves as draft (published = false)
4. Reviews content
5. Clicks "Publish"
6. System verifies no other published policy for same version/locale
7. System sets published = true
8. New policy becomes active for consent flow

## 5. User Interface

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

**Main Application**:

- **Dashboard (MainPage)**:
  - Header with app title "생명빛 클럽 시뮬레이션"
  - Action buttons: Add simulation, Notices, Help, Logout
  - Simulation table with:
    - Sortable columns (name, plan, rounds, date)
    - Multi-select checkboxes
    - Batch delete button
    - Row actions (view, edit, delete)
  - Empty state with welcome message and CTA
  - Loading skeleton while fetching data

- **Plan Editor**:
  - 5-step Stepper component showing progress
  - Step 1: Plan type selection with descriptions
  - Step 2: Round configuration
  - Step 3: Investment schedule table
  - Step 4: Sales achievement rates (optional)
  - Step 5: Review and create
  - Navigation buttons (Back, Next, Create)
  - Validation messages inline
  - Draft auto-save to localStorage

- **Results Page**:
  - Summary cards (total revenue, total commission, total bonus)
  - Per-round breakdown table with:
    - Round number
    - Investment amount
    - Revenue
    - Commission
    - Bonus
    - Tax
    - Net income
  - Interactive charts (line charts for trends)
  - Export buttons (JSON, CSV)
  - Memo editor for notes
  - Back to dashboard button

- **Admin Panel**:
  - Tabbed interface: Notices | Privacy Policies
  - Create/Edit forms with rich text support
  - Publish buttons with confirmation dialogs
  - List views with edit/delete actions
  - Status indicators (published, draft, pinned)

**Mobile Design**:

- Bottom navigation for primary actions
- Full-screen modals for forms
- Horizontal scroll for wide tables
- 44px minimum touch targets
- Landscape enforcer component (overlay warning for portrait mode)
- Optimized for iPhone 11+ and Galaxy S21+

**Accessibility**:

- Keyboard navigation support
- ARIA labels on interactive elements
- High contrast ratios (WCAG AA)
- Screen reader compatible
- Focus indicators on all controls

## 6. Acceptance Criteria

**Onboarding Flow**:

- [ ] User can submit name/phone and see whitelist validation result
- [ ] OTP is sent within 5 seconds of request
- [ ] OTP rate limiting prevents >3 sends per 15 minutes
- [ ] User can enter 6-digit code and receive validation result
- [ ] Privacy policy displays from database or falls back to static file
- [ ] Consent is recorded with user_hash before authentication
- [ ] OAuth redirects work for Google and Kakao
- [ ] User lands on dashboard after successful authentication

**Simulation Management**:

- [ ] User can create simulation with all 10 plan types
- [ ] Plan editor validates inputs and shows error messages
- [ ] Simulation runs successfully and displays results
- [ ] Results include per-round breakdowns and totals
- [ ] User can update simulation parameters
- [ ] Updated simulation clears previous results
- [ ] User can add/edit memo notes
- [ ] User can delete own simulations only
- [ ] Dashboard shows loading states during data fetch
- [ ] Empty dashboard shows welcome message with CTA

**Administrative Functions**:

- [ ] Admin can create, edit, publish, delete notices
- [ ] Pinned notices appear at top of list
- [ ] Admin can create privacy policy drafts
- [ ] Admin can publish policy only if no other published for same version/locale
- [ ] Published policy appears in consent flow immediately
- [ ] Non-admin users cannot access admin endpoints (403 error)

**PWA Capabilities**:

- [ ] App installs to device home screen
- [ ] Service worker caches API responses (notices)
- [ ] App displays offline indicator when network unavailable
- [ ] Manifest includes 192x192, 384x384, 512x512 icons
- [ ] Landscape enforcer shows on portrait orientation (mobile)

**Security & Performance**:

- [ ] JWT validation occurs on all authenticated endpoints
- [ ] Invalid/expired tokens return 401 errors
- [ ] Admin endpoints check admins table (403 if not admin)
- [ ] OTP hashing uses HMAC with secret key
- [ ] API responses average <500ms (p95)
- [ ] Simulation runs complete in <2 seconds
- [ ] Frontend loads with LCP <2.5s

## 7. Out of Scope

- Payment processing or financial transactions
- Multi-language support beyond Korean (ko-KR)
- Advanced analytics dashboards
- Real-time collaboration features
- Email notification system
- Mobile native apps (iOS/Android)
- Full offline simulation execution
- Historical data migration tools
- Third-party integrations (CRM, accounting software)

## 8. Success Metrics

**User Engagement**:

- 80%+ of whitelisted users complete onboarding within first month
- Average 3+ simulations created per active user
- 60%+ of simulations are re-run with modified parameters
- 50%+ weekly active user rate among onboarded users

**Performance**:

- 95% of API requests complete in <500ms
- 95% of simulation runs complete in <2 seconds
- <1% error rate on OTP delivery
- <5% failed authentication attempts (excluding wrong credentials)

**System Health**:

- 99% uptime during business hours (9 AM – 9 PM KST)
- Zero data loss incidents
- <1 hour mean time to recovery for critical issues

**User Satisfaction**:

- Positive feedback on mobile experience
- Low support ticket volume (<5 per month)
- Admin tasks completed without technical assistance
