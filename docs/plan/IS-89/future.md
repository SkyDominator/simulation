
## Future Enhancements

### Phase 7: Native Google Sign-In (Long-term)
**Timeline**: 1-2 months
**Effort**: 1-2 weeks development
**Benefit**: Seamless OAuth in embedded browsers

**Implementation**:
1. Add Google Sign-In SDK for Android
2. Implement native auth flow
3. Use `signInWithIdToken()` Supabase method
4. Maintain fallback to browser flow

### Phase 8: Deep Linking
**Timeline**: 2-3 months
**Effort**: 1 week development
**Benefit**: Better browser transition

**Implementation**:
1. Configure Android App Links
2. Configure iOS Universal Links
3. Handle deep link routing
4. Preserve auth state across transitions

### Phase 9: PWA Installation Promotion
**Timeline**: 1-2 months
**Effort**: 3-5 days development
**Benefit**: Avoid embedded browsers entirely

**Implementation**:
1. Add "Install App" banner for embedded browser users
2. Custom PWA install prompt
3. Track installation rate
4. Educate users about installed PWA benefits
