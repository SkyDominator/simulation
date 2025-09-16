
1. Is the current pre-auth flow (whitelist + OTP + consent) efficient (in terms of software architecture and performance) and secure (against common threats such as replay attacks and data leaks)?
5. Does the onboarding process (OTP + consent) provide a smooth user experience?
    1. Are there any potential friction points that could lead to user drop-off?
    2. Is the process clearly communicated to users (e.g., via progress indicators)?
    3. Are all possible edge cases (e.g., invalid OTP, expired links, navigating back and forth, resending OTP, temporary server errors, etc.) handled gracefully without issues?


3. Are users able to go back to the previous page in any circumstances?
        1. If so, is the state preserved correctly (e.g., re-entering phone number does not require re-verification)?
        2. Is the state management robust enough to handle unexpected user behavior (e.g., navigating back and forth)?
        3. Are there any potential issues with session expiration or data loss during navigation?