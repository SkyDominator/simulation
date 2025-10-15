# Embedded Browser Login Guide

## Overview

This guide helps users understand and resolve login issues when accessing the Light of Life Club Simulation application through embedded/in-app browsers like KakaoTalk, Facebook, or Instagram.

## What is an Embedded Browser?

An **embedded browser** (or in-app browser) is a web browser that opens within another application. Examples include:

- **KakaoTalk in-app browser**: When you click a link in KakaoTalk messages
- **Facebook in-app browser**: When you open links from Facebook posts
- **Instagram in-app browser**: When you click links in Instagram bio or posts
- **Twitter/X in-app browser**: When you open links from tweets
- **Line in-app browser**: When you click links in Line chats

## The Problem

Google OAuth (Google login) **does not work** in embedded browsers due to security restrictions. When you try to log in with Google through an embedded browser, you'll see:

1. A warning modal explaining the limitation
2. Instructions to open the application in a standard browser
3. An "Open in Browser" button

## Solution: Open in Standard Browser

### For Android Users (Samsung Galaxy, etc.)

**Option 1: Use the "Open in Browser" Button**
1. When you see the warning modal, tap **"Open in Browser"**
2. The application will automatically open in your default browser (Chrome, Samsung Internet, etc.)
3. Log in with Google OAuth from the standard browser

**Option 2: Manually Open in Browser**

**From KakaoTalk:**
1. Tap the **three dots (⋮)** in the top-right corner
2. Select **"Open in Chrome"** or **"Open in browser"**
3. Log in with Google OAuth from Chrome

**From Facebook/Instagram:**
1. Tap the **three dots (⋮)** or menu icon
2. Select **"Open in external browser"**
3. Log in with Google OAuth from your default browser

### For iOS Users (iPhone, iPad)

**From Safari or any app:**
1. Look for the **Share button** (square with arrow pointing up)
2. Select **"Open in Safari"** or **"Open in Chrome"**
3. Log in with Google OAuth from the standard browser

## Why This Happens

Google restricts OAuth authentication in embedded browsers for security reasons:

- **User-Agent Blocking**: Google detects embedded browser user-agents and blocks authentication
- **Security Policy**: Embedded browsers may not meet Google's security requirements for OAuth flows
- **Fraud Prevention**: Prevents potential phishing attacks through in-app browsers

## Alternative: Use Kakao Login

If you prefer to stay in the embedded browser, you can:

1. Use **Kakao OAuth** instead of Google OAuth
2. Kakao login may work in some embedded browsers (depending on the platform)

**Note**: This is not guaranteed to work in all embedded browsers.

## Technical Details

The application automatically detects the following embedded browsers:

- KakaoTalk (`KAKAOTALK` in user-agent)
- Android WebView (`wv` or `WebView`)
- Facebook (`FBAN`, `FBAV`)
- Instagram (`Instagram`)
- Twitter/X (`Twitter`)
- Line (`Line`)
- Naver (`Naver`)

When detected, the application will:

1. Display a warning modal before attempting OAuth
2. Provide instructions and an "Open in Browser" button
3. Log the detection for debugging purposes

## Troubleshooting

### The "Open in Browser" button doesn't work

**Try manually copying the URL:**
1. Long-press on the address bar
2. Copy the URL
3. Open Chrome/Safari and paste the URL
4. Log in from the standard browser

### I don't see the warning modal

If you don't see the warning modal but still can't log in:

1. Check if you're in an embedded browser (look for in-app browser indicators)
2. Try manually opening in a standard browser
3. Clear your browser cache and cookies
4. Contact support if the issue persists

### Kakao login also doesn't work

Some embedded browsers may block all OAuth flows:

1. **Always use a standard browser** (Chrome, Safari, Samsung Internet)
2. Bookmark the application for easy access
3. Avoid clicking links from messaging apps

## Best Practices

**For the best experience:**

1. **Bookmark the application** in your standard browser:
   - **Production**: `https://simulation.lightoflifeclub.com`
   - **Staging**: `https://staging-simulation.lightoflifeclub.com`

2. **Use Chrome, Safari, or Samsung Internet** for accessing the application

3. **Avoid in-app browsers** for applications requiring authentication

4. **Add to Home Screen** (PWA):
   - Open the application in Chrome/Safari
   - Tap **"Add to Home Screen"**
   - Access the application as a standalone PWA

## Contact Support

If you continue to experience issues:

- **Email**: [Support email address]
- **Issue Tracker**: [GitHub Issues link]
- **Help**: Open the application and tap **Help** → **Report Issue**

## Related Resources

- [Google OAuth Security Best Practices](https://developers.google.com/identity/protocols/oauth2/policies)
- [Progressive Web App (PWA) Guide](../future/enterprise.md)
- [Technical Specification](../spec/tech-details.md)
