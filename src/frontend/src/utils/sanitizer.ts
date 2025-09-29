/**
 * HTML Sanitization Utility using DOMPurify
 * 
 * This utility provides secure HTML sanitization to prevent XSS attacks
 * when rendering user-generated content or API responses that contain HTML.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML string to sanitize
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string, options?: DOMPurify.Config): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Default configuration - allows basic formatting tags but removes scripts/handlers
  const defaultConfig: DOMPurify.Config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'class'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
    ADD_ATTR: ['target'],
    ...options
  };

  return DOMPurify.sanitize(html, defaultConfig);
}

/**
 * Sanitize HTML for rich text content (notices, policy content)
 * Allows more formatting tags for content management
 */
export function sanitizeRichContent(html: string): string {
  return sanitizeHtml(html, {
    ALLOWED_TAGS: [
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Text formatting
      'p', 'br', 'strong', 'b', 'i', 'em', 'u',
      // Lists
      'ul', 'ol', 'li',
      // Links and spans
      'a', 'span',
      // Containers and blocks
      'div', 'blockquote',
      // Code
      'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id'],
    ADD_ATTR: ['target'],
    KEEP_CONTENT: true
  });
}

/**
 * Sanitize URLs to prevent javascript: and data: URL attacks
 * @param url - URL string to validate
 * @returns Safe URL or empty string if dangerous
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript):/i;
  if (dangerousProtocols.test(url.trim())) {
    console.warn(`Security Warning: Blocked dangerous URL: ${url}`);
    return '';
  }

  // Allow relative URLs, http, https, mailto
  const allowedProtocols = /^(https?|mailto|tel):/i;
  const isRelative = !url.includes(':') || url.startsWith('/');
  
  if (isRelative || allowedProtocols.test(url)) {
    return url;
  }

  console.warn(`Security Warning: Blocked unknown protocol URL: ${url}`);
  return '';
}

/**
 * React component helper for safely rendering HTML content
 * Use this instead of dangerouslySetInnerHTML
 */
export function createSafeHtml(html: string, options?: DOMPurify.Config) {
  return {
    __html: sanitizeHtml(html, options)
  };
}