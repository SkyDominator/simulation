
## Appendix

### Code References

**Detection Logic**:
- `src/frontend/src/utils/browserDetection.ts` - Detection utilities
- `src/frontend/src/pages/LoginPage.tsx:28-50` - OAuth handler
- `src/frontend/src/context/AuthContext.tsx:56-92` - Auth context

**UI Components**:
- `src/frontend/src/components/EmbeddedBrowserWarningModal.tsx` - Warning modal
- `src/frontend/src/pages/LoginPage.tsx:105-112` - Google login button

**Configuration**:
- `src/frontend/src/supabaseClient.ts:16-22` - Supabase auth config
- `src/frontend/vite.config.ts:60-85` - PWA manifest

### Related Documentation

- **Research**: `docs/research/IS-89/research-00.md`
- **SSD**: `docs/spec/ssd.md` (Section 7: Auth, Section 10: Simulation)
- **Technical Details**: `docs/spec/tech-details.md`
- **Frontend Guidelines**: `docs/coding/frontend.md`
- **Issue**: GitHub Issue #89

### Known Limitations

1. **Detection Coverage**: May miss new/unknown embedded browsers
2. **Android Intent URLs**: Some devices may not support intent:// scheme
3. **User Education**: Requires user to understand browser difference
4. **Kakao OAuth**: Not verified if Kakao login works in KakaoTalk webview

### FAQ

**Q: Why not just support OAuth in embedded browsers?**
A: Google's security policy blocks it. We cannot bypass this restriction.

**Q: Will Kakao OAuth also be affected?**
A: Unknown. Kakao may have special handling for their own app. Needs testing.

**Q: Can we whitelist KakaoTalk with Google?**
A: No. Google enforces this policy broadly for security reasons.

**Q: What about iOS?**
A: iOS currently works, but detection provides consistent UX and prepares for potential future iOS policy changes.

**Q: How do we know the detection is accurate?**
A: Comprehensive testing + logging + error handling catches missed detections.

---