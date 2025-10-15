/**
 * Browser detection utilities for identifying embedded/in-app browsers
 * that don't support standard OAuth flows.
 */

/**
 * Detects if the current browser is an embedded/in-app browser
 * @returns true if running in an embedded browser, false otherwise
 */
export function isEmbeddedBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || "";

  // Common in-app browser markers
  const embeddedMarkers = [
    "KAKAOTALK", // KakaoTalk in-app browser
    "wv", // Android WebView
    "WebView", // Generic WebView
    "FBAN", // Facebook App
    "FBAV", // Facebook App (alternative)
    "Instagram", // Instagram in-app browser
    "Twitter", // Twitter in-app browser
    "Line", // Line messenger
    "Naver", // Naver app
  ];

  const isEmbedded = embeddedMarkers.some((marker) => ua.includes(marker));

  // Log detection result
  if (isEmbedded) {
    console.info("[BrowserDetection] Embedded browser detected:", {
      userAgent: ua,
      browserName: getBrowserName(),
      browserType: "embedded",
    });
  }

  return isEmbedded;
}

/**
 * Gets the browser type classification
 * @returns Browser type: 'standard', 'embedded', or 'unknown'
 */
export function getBrowserType(): "standard" | "embedded" | "unknown" {
  if (typeof window === "undefined") return "unknown";

  if (isEmbeddedBrowser()) return "embedded";
  return "standard";
}

/**
 * Gets the current browser name for display purposes
 * @returns Browser name or 'Unknown'
 */
export function getBrowserName(): string {
  if (typeof window === "undefined") return "Unknown";

  const ua = navigator.userAgent || navigator.vendor || "";

  // Detect specific in-app browsers
  if (ua.includes("KAKAOTALK")) return "KakaoTalk";
  if (ua.includes("FBAN") || ua.includes("FBAV")) return "Facebook";
  if (ua.includes("Instagram")) return "Instagram";
  if (ua.includes("Twitter")) return "Twitter";
  if (ua.includes("Line")) return "Line";
  if (ua.includes("Naver")) return "Naver";

  // Detect standard browsers
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("SamsungBrowser")) return "Samsung Internet";

  return "Unknown";
}

/**
 * Generates a URL to open the current page in the system default browser
 * @returns URL string with intent:// scheme for Android or current URL for iOS
 */
export function getExternalBrowserUrl(): string {
  const currentUrl = window.location.href;

  // Detect platform
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    // Android intent URL to open in external browser
    // Format: intent://<host><path>#Intent;scheme=https;end
    const url = new URL(currentUrl);
    return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=https;end`;
  }

  // For iOS and other platforms, return the direct URL
  // iOS will prompt user to choose browser when clicked
  return currentUrl;
}

/**
 * Attempts to open the current page in the system default browser
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function openInExternalBrowser(): Promise<boolean> {
  try {
    const externalUrl = getExternalBrowserUrl();
    console.info("[BrowserDetection] Opening external browser:", {
      currentUrl: window.location.href,
      externalUrl,
      platform: /Android/i.test(navigator.userAgent)
        ? "Android"
        : /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? "iOS"
        : "Other",
    });

    window.location.href = externalUrl;
    return true;
  } catch (error) {
    console.error("[BrowserDetection] Failed to open external browser:", error);
    return false;
  }
}
