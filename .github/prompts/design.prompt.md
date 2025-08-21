# PWA UI/UX Design Guide for React (2025)

*A guide to creating user-friendly Progressive Web Apps with a native look and feel, leveraging modern design principles and React tooling.*

> The best PWA doesn't feel like a website in a wrapper. It feels like an app that was delivered through the web.

---

## The Look: Visual Principles 🎨

The visual design must be clean, adaptive, and personal.

* **Foundation: Material Design 3 (MD3)**
    * Google's latest design system is the gold standard for PWAs.
    * **Key Features:** Dynamic color theming, updated component styles, and enhanced accessibility.
    * **Implementation:** Use a component library like **MUI for React** which has excellent MD3 support.

* **Layout: Adaptive & Responsive**
    * **Mobile-First:** Design for the smallest screen and scale up.
    * **Modern CSS:** Utilize CSS Grid and Container Queries to create layouts that adapt to their container, not just the viewport. This is crucial for components that need to work anywhere.

---

## The Feel: Interaction & Experience ✨

How the app responds to input is what separates a great PWA from a website.

* **Navigation: Platform-Aware**
    * **Mobile:** Use a persistent **Bottom Tab Bar** for primary navigation.
    * **Desktop/Tablet:** Transition to a **Side Navigation Rail** or a traditional header to make use of screen real estate.

* **Performance: Instant & Smooth**
    * **Animations:** Use performant CSS properties like `transform` and `opacity` for smooth, GPU-accelerated animations.
    * **Offline UX:** Design clear UI states for offline mode. Use banners or toasts to inform the user of their connection status and enable optimistic UI updates.

* **Installation: Seamless**
    * Design a non-intrusive, custom "Add to Home Screen" prompt within your UI to encourage installation after the user has engaged with the app.

---

## Recommended React Implementation

```jsx
// A basic shell component structure for a PWA
import { Box } from '@mui/material';
import MobileNavigation from './MobileNavigation';
import DesktopNavigation from './DesktopNavigation';
import useIsMobile from '../hooks/useIsMobile';

function AppShell({ children }) {
  const isMobile = useIsMobile();

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {isMobile ? <MobileNavigation /> : <DesktopNavigation />}
      
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {/* Main content goes here */}
        {children}
      </Box>
    </Box>
  );
}
```

# Key Libraries:

* UI Components: @mui/material
* Data & State Management: @tanstack/react-query (for handling loading/error states and offline caching)
* PWA Service Worker: workbox-precaching