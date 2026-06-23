## Phase 1: Update Documentations

- `.vscode/launch.json`
- All docs linked in `.github/copilot-instructions.md`

**File**: `docs/spec/tech-details.md`
**Lines**: Add new section after "Frontend Integration"
**Changes**: Document embedded browser handling

```markdown
## Embedded Browser Handling

**Detection**: `src/frontend/src/utils/browserDetection.ts`

- Identifies in-app browsers (KakaoTalk, Facebook, Instagram, etc.)
- Checks user-agent strings for common markers
- Provides browser type and name information

**Prevention**: `src/frontend/src/pages/LoginPage.tsx`

- Blocks OAuth attempts in embedded browsers
- Shows warning modal with guidance
- Logs detection events for monitoring

**Recovery Flow**:

1. User accesses app in embedded browser
2. Detection logic identifies browser type
3. User clicks OAuth login button
4. Modal appears with instructions
5. User clicks "브라우저에서 열기"
6. App opens in system default browser
7. OAuth flow proceeds normally

**Supported Platforms**:

- Android: Intent URL redirects to Chrome/Samsung Internet
- iOS: Direct URL opens in Safari/Chrome

**Detected Browsers**:

- KakaoTalk in-app browser
- Facebook in-app browser
- Instagram in-app browser
- Twitter in-app browser
- Line messenger browser
- Naver app browser
- Generic Android WebView

**Error Handling**:

- OAuth 403 errors trigger warning modal
- Network errors show specific message
- Generic errors show fallback message
```

**Rationale**:

- Comprehensive documentation
- Helps future maintainers
- Explains design decisions
- Documents supported scenarios

## Phase 2: Create User-Facing Help Document

**File**: `docs/user/browser-requirements.md` (NEW)
**Changes**: Create user guide

```markdown
# 브라우저 요구사항

LOL CLUB 시뮬레이션은 Google 로그인을 지원합니다.
원활한 로그인을 위해 아래 브라우저 요구사항을 확인해주세요.

## 지원되는 브라우저

### ✅ 지원됨 (권장)

- Chrome (Android, iOS, 데스크톱)
- Safari (iOS, macOS)
- Samsung Internet (Android)
- Edge (데스크톱)
- Firefox (데스크톱)

### ❌ 지원되지 않음

- KakaoTalk 앱 내부 브라우저
- Facebook 앱 내부 브라우저
- Instagram 앱 내부 브라우저
- 기타 앱 내부 브라우저

## KakaoTalk에서 링크를 받으셨나요?

KakaoTalk에서 받은 링크를 클릭하면 KakaoTalk 앱 내부 브라우저에서 열립니다.
Google 로그인은 보안 정책상 이러한 앱 내부 브라우저에서는 작동하지 않습니다.

### 해결 방법

**방법 1: 자동으로 브라우저 열기**

1. 시뮬레이션 앱의 로그인 페이지로 이동합니다
2. "Google로 로그인" 버튼을 누릅니다
3. 안내 창이 나타나면 "브라우저에서 열기" 버튼을 누릅니다
4. Chrome 또는 Safari에서 앱이 열립니다
5. Google 로그인을 진행합니다

**방법 2: 수동으로 브라우저 열기**

1. KakaoTalk 화면 오른쪽 상단의 메뉴(⋮) 버튼을 누릅니다
2. "다른 브라우저로 열기" 또는 "외부 브라우저에서 열기"를 선택합니다
3. Chrome 또는 Safari를 선택합니다
4. 브라우저에서 열린 앱에서 Google 로그인을 진행합니다

**방법 3: URL 직접 입력**

1. Chrome 또는 Safari 앱을 엽니다
2. 주소창에 다음을 입력합니다: `https://simulation.LOLCLUB.com`
3. Google 로그인을 진행합니다

## 왜 앱 내부 브라우저에서는 안 되나요?

Google은 사용자 보안을 위해 표준 브라우저에서만 로그인을 허용합니다.
앱 내부 브라우저는 보안 기준을 충족하지 못해 로그인이 제한됩니다.

이는 Google의 정책이며, 모든 웹 애플리케이션에 동일하게 적용됩니다.

## 추가 도움이 필요하신가요?

문제가 계속되면 관리자에게 문의해주세요.

**연락처**: [관리자 이메일]
```

**Rationale**:

- User-friendly Korean language
- Clear step-by-step instructions
- Multiple solution paths
- Explains "why" for user understanding
- Provides contact for support

### Success Criteria

#### Manual Verification:

- [ ] User guide is easy to follow (should be able to solve all issues following the steps in order)

## Checklist

### Phase 1: Update Documentation

- [ ] Update `docs/spec/tech-details.md`
- [ ] Add "Embedded Browser Handling" section
- [ ] Document detection logic
- [ ] Document prevention logic
- [ ] Document recovery flow
- [ ] Document supported platforms
- [ ] Document detected browsers
- [ ] Document error handling

### Phase 2: Create User Guide

- [ ] Create `docs/user/browser-requirements.md`
- [ ] Add supported browsers list
- [ ] Add unsupported browsers list
- [ ] Add "KakaoTalk link" troubleshooting
- [ ] Add Method 1: Auto browser open
- [ ] Add Method 2: Manual browser open
- [ ] Add Method 3: Direct URL entry
- [ ] Add explanation section
- [ ] Add contact information

### Deployment

**Pre-Deployment:**

- [ ] Code review completed and approved
- [ ] All automated tests passing
- [ ] Manual testing completed
- [ ] Documentation reviewed
- [ ] User guide reviewed

**Staging Deployment:**

- [ ] Deploy to staging environment
- [ ] Verify staging deployment health
- [ ] Run smoke tests on staging
- [ ] Test on actual Samsung Galaxy device with KakaoTalk
- [ ] Test on iPhone with Safari
- [ ] Monitor logs for 24 hours
- [ ] Collect user feedback (if applicable)

**Production Deployment:**

- [ ] Create production deployment PR
- [ ] Get stakeholder approval
- [ ] Deploy to production environment
- [ ] Verify production deployment health
- [ ] Monitor error rates for first hour
- [ ] Monitor OAuth success/failure rates
- [ ] Check embedded browser detection rate
- [ ] Monitor external browser redirect success rate

**Post-Deployment Monitoring (First Week):**

- [ ] Track OAuth 403 errors from embedded browsers
- [ ] Track modal appearance rate
- [ ] Track external browser redirect success rate
- [ ] Track user complaints/support tickets
- [ ] Verify success metrics achieved
- [ ] Document any issues found
- [ ] Plan fixes for any issues
