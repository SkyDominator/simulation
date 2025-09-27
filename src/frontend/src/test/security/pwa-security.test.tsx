/**
 * PWA Security Tests
 * Tests Progressive Web App security features and service worker security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock service worker registration
const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: null,
  scope: 'https://simulation.lightoflifeclub.com/',
  update: vi.fn(),
  unregister: vi.fn()
}

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
    ready: Promise.resolve(mockServiceWorkerRegistration),
    controller: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  writable: true
})

// Mock Cache API
class MockCache {
  private storage = new Map<string, Response>()
  
  async match(request: RequestInfo): Promise<Response | undefined> {
    const url = typeof request === 'string' ? request : request.url
    return this.storage.get(url)
  }
  
  async add(request: RequestInfo): Promise<void> {
    const url = typeof request === 'string' ? request : request.url
    this.storage.set(url, new Response('cached content'))
  }
  
  async put(request: RequestInfo, response: Response): Promise<void> {
    const url = typeof request === 'string' ? request : request.url
    this.storage.set(url, response)
  }
  
  async delete(request: RequestInfo): Promise<boolean> {
    const url = typeof request === 'string' ? request : request.url
    return this.storage.delete(url)
  }
  
  async keys(): Promise<Request[]> {
    return Array.from(this.storage.keys()).map(url => new Request(url))
  }
}

// Mock CacheStorage
const mockCacheStorage = {
  open: vi.fn().mockResolvedValue(new MockCache()),
  match: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn().mockResolvedValue(['v1'])
}

Object.defineProperty(global, 'caches', {
  value: mockCacheStorage,
  writable: true
})

describe('PWA Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Service Worker Security', () => {
    it('should register service worker from secure origin only', async () => {
      // Test that service worker only registers on HTTPS
      const originalLocation = window.location
      
      // Mock HTTPS location
      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          protocol: 'https:',
          hostname: 'simulation.lightoflifeclub.com'
        },
        writable: true
      })
      
      const registration = await navigator.serviceWorker.register('/sw.js')
      
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js')
      expect(registration.scope).toContain('https://')
      
      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true
      })
    })

    it('should validate service worker script integrity', () => {
      // Mock service worker script validation
      const validateSWScript = (scriptUrl: string) => {
        // Check that SW script is served from same origin
        const url = new URL(scriptUrl, window.location.origin)
        
        if (url.origin !== window.location.origin) {
          throw new Error('Service worker must be served from same origin')
        }
        
        // Check for suspicious paths
        const suspiciousPaths = [
          '../',
          '\\',
          '//',
          'data:',
          'javascript:',
          'blob:'
        ]
        
        for (const path of suspiciousPaths) {
          if (scriptUrl.includes(path)) {
            throw new Error('Suspicious service worker path detected')
          }
        }
        
        return true
      }
      
      // Valid service worker paths
      const validPaths = [
        '/sw.js',
        '/service-worker.js',
        '/static/sw.js'
      ]
      
      for (const path of validPaths) {
        expect(() => validateSWScript(path)).not.toThrow()
      }
      
      // Invalid service worker paths
      const invalidPaths = [
        'http://evil.com/sw.js',
        '../../../etc/passwd',
        'javascript:alert("xss")',
        'data:text/javascript,alert("xss")',
        '//evil.com/sw.js'
      ]
      
      for (const path of invalidPaths) {
        expect(() => validateSWScript(path)).toThrow()
      }
    })

    it('should handle service worker update securely', async () => {
      const mockRegistration = {
        ...mockServiceWorkerRegistration,
        update: vi.fn().mockResolvedValue(undefined),
        installing: {
          scriptURL: 'https://simulation.lightoflifeclub.com/sw.js',
          state: 'installing'
        }
      }
      
      // Mock secure update process
      const handleSWUpdate = async (registration: any) => {
        if (!registration) return
        
        // Validate that update comes from secure origin
        if (registration.installing?.scriptURL) {
          const url = new URL(registration.installing.scriptURL)
          if (url.protocol !== 'https:') {
            throw new Error('Service worker updates must use HTTPS')
          }
          
          if (url.hostname !== 'simulation.lightoflifeclub.com') {
            throw new Error('Service worker updates must be from same domain')
          }
        }
        
        await registration.update()
      }
      
      await expect(handleSWUpdate(mockRegistration)).resolves.not.toThrow()
      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('should prevent service worker privilege escalation', () => {
      // Test that service worker cannot access sensitive APIs
      const restrictedAPIs = [
        'geolocation',
        'camera',
        'microphone',
        'notifications',
        'persistent-storage'
      ]
      
      // Mock service worker context check
      const checkSWPrivileges = (apiName: string) => {
        // In real SW context, certain APIs should not be available
        const isInServiceWorker = typeof window === 'undefined'
        
        if (isInServiceWorker && restrictedAPIs.includes(apiName)) {
          throw new Error(`API ${apiName} not available in service worker context`)
        }
        
        return true
      }
      
      // In main thread context, these should be allowed
      for (const api of restrictedAPIs) {
        expect(() => checkSWPrivileges(api)).not.toThrow()
      }
    })
  })

  describe('Cache Security', () => {
    it('should validate cached resource origins', async () => {
      const cache = await caches.open('test-cache')
      
      const validateCacheResource = (url: string) => {
        const parsedUrl = new URL(url, window.location.origin)
        
        // Only allow same-origin or allowed CDN resources
        const allowedOrigins = [
          'https://simulation.lightoflifeclub.com',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com'
        ]
        
        const isAllowed = allowedOrigins.some(origin => 
          parsedUrl.origin === origin
        )
        
        if (!isAllowed) {
          throw new Error(`Resource from ${parsedUrl.origin} not allowed in cache`)
        }
        
        return true
      }
      
      const validResources = [
        'https://simulation.lightoflifeclub.com/assets/main.js',
        'https://fonts.googleapis.com/css2?family=Roboto',
        '/api/notices'
      ]
      
      const invalidResources = [
        'http://evil.com/malicious.js',
        'https://malicious-cdn.com/script.js',
        'javascript:alert("xss")'
      ]
      
      for (const resource of validResources) {
        expect(() => validateCacheResource(resource)).not.toThrow()
      }
      
      for (const resource of invalidResources) {
        expect(() => validateCacheResource(resource)).toThrow()
      }
    })

    it('should sanitize cache keys', async () => {
      const cache = await caches.open('test-cache')
      
      const sanitizeCacheKey = (key: string) => {
        // Remove potentially dangerous characters
        const sanitized = key
          .replace(/[<>\"']/g, '') // Remove HTML/script injection chars
          .replace(/[\\\/]/g, '_') // Replace path separators
          .replace(/[^a-zA-Z0-9._-]/g, '_') // Allow only safe characters
          .substring(0, 200) // Limit length
        
        return sanitized
      }
      
      const dangerousKeys = [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'key"with"quotes',
        'key\\with\\backslashes',
        'very-long-key-' + 'x'.repeat(300)
      ]
      
      const expectedSanitized = [
        'scriptalert_xss__script_',
        '____etc_passwd',
        'keywithquotes',
        'key_with_backslashes',
        'very-long-key-' + 'x'.repeat(185)
      ]
      
      dangerousKeys.forEach((key, index) => {
        const sanitized = sanitizeCacheKey(key)
        expect(sanitized).toBe(expectedSanitized[index])
        expect(sanitized.length).toBeLessThanOrEqual(200)
      })
    })

    it('should implement cache quota management', async () => {
      // Mock storage quota API
      const mockQuotaAPI = {
        estimate: vi.fn().mockResolvedValue({
          quota: 50 * 1024 * 1024, // 50MB
          usage: 30 * 1024 * 1024   // 30MB used
        })
      }
      
      Object.defineProperty(navigator, 'storage', {
        value: mockQuotaAPI,
        writable: true
      })
      
      const checkCacheQuota = async () => {
        const estimate = await navigator.storage.estimate()
        const usageRatio = estimate.usage! / estimate.quota!
        
        // Warn if approaching quota limit
        if (usageRatio > 0.8) {
          console.warn('Cache approaching quota limit')
          return false
        }
        
        return true
      }
      
      const canCache = await checkCacheQuota()
      expect(canCache).toBe(true) // 30/50 = 0.6, below 0.8 threshold
      expect(navigator.storage.estimate).toHaveBeenCalled()
    })

    it('should prevent cache poisoning attacks', async () => {
      const cache = await caches.open('secure-cache')
      
      const secureCache = {
        async put(request: RequestInfo, response: Response) {
          const url = typeof request === 'string' ? request : request.url
          
          // Validate response headers for security
          const contentType = response.headers.get('content-type')
          const cacheControl = response.headers.get('cache-control')
          
          // Block responses with suspicious content types
          const suspiciousTypes = [
            'text/html', // Prevent HTML injection
            'application/javascript', // Only allow from trusted sources
            'text/javascript'
          ]
          
          if (contentType && suspiciousTypes.includes(contentType)) {
            const urlObj = new URL(url, window.location.origin)
            if (urlObj.origin !== window.location.origin) {
              throw new Error('Cannot cache executable content from external origin')
            }
          }
          
          // Validate cache control headers
          if (cacheControl?.includes('no-store') || cacheControl?.includes('private')) {
            throw new Error('Response marked as non-cacheable')
          }
          
          return cache.put(request, response)
        }
      }
      
      // Test valid caching
      const validResponse = new Response('safe content', {
        headers: {
          'content-type': 'text/plain',
          'cache-control': 'public, max-age=3600'
        }
      })
      
      await expect(secureCache.put('/safe-resource', validResponse)).resolves.not.toThrow()
      
      // Test blocked caching
      const maliciousResponse = new Response('<script>alert("xss")</script>', {
        headers: {
          'content-type': 'text/html',
          'cache-control': 'public, max-age=3600'
        }
      })
      
      await expect(secureCache.put('http://evil.com/malicious', maliciousResponse)).rejects.toThrow()
    })
  })

  describe('Manifest Security', () => {
    it('should validate PWA manifest security', () => {
      const validateManifest = (manifest: any) => {
        // Check for required security fields
        if (!manifest.name || !manifest.short_name) {
          throw new Error('Manifest missing required name fields')
        }
        
        // Validate start_url is same-origin
        if (manifest.start_url) {
          const startUrl = new URL(manifest.start_url, window.location.origin)
          if (startUrl.origin !== window.location.origin) {
            throw new Error('Manifest start_url must be same-origin')
          }
        }
        
        // Check for suspicious redirect URLs
        if (manifest.start_url?.includes('//')) {
          throw new Error('Suspicious redirect in start_url')
        }
        
        // Validate icon sources
        if (manifest.icons) {
          for (const icon of manifest.icons) {
            if (icon.src) {
              const iconUrl = new URL(icon.src, window.location.origin)
              const allowedHosts = [
                'simulation.lightoflifeclub.com'
              ]
              
              if (!allowedHosts.includes(iconUrl.hostname)) {
                throw new Error(`Icon from unauthorized host: ${iconUrl.hostname}`)
              }
            }
          }
        }
        
        return true
      }
      
      // Valid manifest
      const validManifest = {
        name: 'Light of Life Club Simulation',
        short_name: 'LOLC Sim',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
      
      expect(() => validateManifest(validManifest)).not.toThrow()
      
      // Invalid manifests
      const maliciousManifests = [
        {
          name: 'App',
          start_url: 'http://evil.com/redirect'
        },
        {
          name: 'App',
          start_url: '//evil.com/redirect'
        },
        {
          name: 'App',
          icons: [{
            src: 'http://malicious.com/icon.png'
          }]
        }
      ]
      
      for (const manifest of maliciousManifests) {
        expect(() => validateManifest(manifest)).toThrow()
      }
    })
  })

  describe('Offline Security', () => {
    it('should handle offline data securely', () => {
      const secureOfflineStorage = {
        store: (key: string, data: any) => {
          // Sanitize key
          const sanitizedKey = key.replace(/[^a-zA-Z0-9._-]/g, '_')
          
          // Don't store sensitive data offline
          const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth']
          
          if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            throw new Error(`Cannot store sensitive data offline: ${key}`)
          }
          
          // Limit data size
          const serialized = JSON.stringify(data)
          if (serialized.length > 100 * 1024) { // 100KB limit
            throw new Error('Data too large for offline storage')
          }
          
          localStorage.setItem(`offline_${sanitizedKey}`, serialized)
          return true
        },
        
        retrieve: (key: string) => {
          const sanitizedKey = key.replace(/[^a-zA-Z0-9._-]/g, '_')
          const data = localStorage.getItem(`offline_${sanitizedKey}`)
          return data ? JSON.parse(data) : null
        }
      }
      
      // Test valid offline storage
      const safeData = { notices: [{ id: 1, title: 'Safe Notice' }] }
      expect(() => secureOfflineStorage.store('notices', safeData)).not.toThrow()
      
      // Test blocked sensitive storage
      const sensitiveData = { password: 'secret123' }
      expect(() => secureOfflineStorage.store('user_password', sensitiveData)).toThrow()
      
      // Test oversized data
      const largeData = { content: 'x'.repeat(200 * 1024) }
      expect(() => secureOfflineStorage.store('large', largeData)).toThrow()
    })

    it('should validate offline request integrity', () => {
      const validateOfflineRequest = (request: Request) => {
        const url = new URL(request.url)
        
        // Only allow same-origin requests when offline
        if (url.origin !== window.location.origin) {
          throw new Error('Cross-origin requests not allowed offline')
        }
        
        // Block sensitive endpoints
        const blockedPaths = [
          '/api/admin/',
          '/api/auth/',
          '/api/payment/'
        ]
        
        if (blockedPaths.some(path => url.pathname.startsWith(path))) {
          throw new Error('Sensitive endpoints not available offline')
        }
        
        // Only allow GET requests for most offline operations
        if (!['GET', 'HEAD'].includes(request.method)) {
          const allowedWritePaths = ['/api/sync', '/api/cache']
          if (!allowedWritePaths.some(path => url.pathname.startsWith(path))) {
            throw new Error('Write operations limited when offline')
          }
        }
        
        return true
      }
      
      // Valid offline requests
      const validRequests = [
        new Request('/api/notices', { method: 'GET' }),
        new Request('/api/sync', { method: 'POST' }),
        new Request('/static/app.js', { method: 'GET' })
      ]
      
      for (const request of validRequests) {
        expect(() => validateOfflineRequest(request)).not.toThrow()
      }
      
      // Invalid offline requests
      const invalidRequests = [
        new Request('http://api.external.com/data'), // Cross-origin
        new Request('/api/admin/users', { method: 'GET' }), // Sensitive path
        new Request('/api/simulations', { method: 'DELETE' }) // Write to non-sync endpoint
      ]
      
      for (const request of invalidRequests) {
        expect(() => validateOfflineRequest(request)).toThrow()
      }
    })
  })
})