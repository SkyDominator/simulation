import { test, expect } from '@playwright/test'
import { TestHelpers, APIHelpers } from '../utils/test-helpers'
import { loginTestUser } from '../utils/auth-helpers'

/**
 * CAT-PWA: Progressive Web App Features Tests
 * Tests PWA installation, offline functionality, and service worker caching
 */

test.describe('PWA Features', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await loginTestUser(page)
    await APIHelpers.mockSimulationAPI(page)
  })

  test('E2E-025: PWA installation prompt appears', async ({ page, context }) => {
    // Enable PWA features in browser context
    await context.grantPermissions(['notifications'])
    
    await page.goto('/')
    
    // Wait for service worker registration
    await page.waitForFunction(() => 'serviceWorker' in navigator, { timeout: 10000 })
    
    // Simulate beforeinstallprompt event
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as any
      event.prompt = () => Promise.resolve({ outcome: 'accepted' })
      event.platforms = ['web']
      window.dispatchEvent(event)
    })
    
    // Install prompt should appear
    await expect(page.locator('[data-testid="install-prompt"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="install-prompt-message"]')).toContainText('홈 화면에 추가')
    
    // Verify install button is present and accessible
    const installButton = page.locator('[data-testid="install-pwa"]')
    await expect(installButton).toBeVisible()
    await expect(installButton).toHaveAttribute('aria-label', '앱을 홈 화면에 추가')
    
    // Dismiss button should also be present
    const dismissButton = page.locator('[data-testid="dismiss-install"]')
    await expect(dismissButton).toBeVisible()
    
    // Test dismiss functionality
    await dismissButton.click()
    await expect(page.locator('[data-testid="install-prompt"]')).not.toBeVisible()
  })

  test('E2E-026: PWA installs successfully', async ({ page, context }) => {
    await context.grantPermissions(['notifications'])
    await page.goto('/')
    
    // Wait for service worker
    await page.waitForFunction(() => 'serviceWorker' in navigator)
    
    // Simulate install prompt
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as any
      event.prompt = () => Promise.resolve({ outcome: 'accepted' })
      event.platforms = ['web']
      window.dispatchEvent(event)
    })
    
    await expect(page.locator('[data-testid="install-prompt"]')).toBeVisible()
    
    // Click install button
    await page.click('[data-testid="install-pwa"]')
    
    // Should show installation success message
    await expect(page.locator('[data-testid="install-success"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="install-success-message"]')).toContainText('앱이 성공적으로 설치되었습니다')
    
    // Verify PWA features are enabled
    await expect(page.locator('[data-testid="pwa-installed-indicator"]')).toBeVisible()
    
    // Check if running in standalone mode (simulated)
    const isStandalone = await page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone ||
             document.referrer.includes('android-app://')
    })
    
    // If in standalone mode, verify PWA-specific UI
    if (isStandalone) {
      await expect(page.locator('[data-testid="pwa-header"]')).toBeVisible()
      await expect(page.locator('[data-testid="browser-ui"]')).not.toBeVisible()
    }
  })

  test('E2E-027: Basic offline functionality works', async ({ page, context }) => {
    await page.goto('/')
    
    // Wait for service worker and initial cache
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => 'serviceWorker' in navigator)
    
    // Wait for service worker to be ready
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready
      }
    })
    
    // Allow time for initial caching
    await page.waitForTimeout(2000)
    
    // Verify app works online first
    await helpers.waitForMainPage()
    
    // Go offline
    await context.setOffline(true)
    
    // Reload page - should still work from cache
    await page.reload()
    
    // Basic elements should still be visible from cache
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 10000 })
    await helpers.waitForMainPage()
    
    // Offline indicator should appear
    await expect(page.locator('text=/오프라인|Offline/')).toBeVisible()
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('오프라인 상태입니다')
    
    // Test offline navigation
    await page.click('[data-testid="nav-help"]')
    await expect(page.locator('[data-testid="help-page"]')).toBeVisible()
    
    // Cached content should be available
    await expect(page.locator('[data-testid="help-content"]')).toBeVisible()
    
    // Actions requiring network should be disabled or queued
    await page.click('[data-testid="nav-simulations"]')
    await page.click('[data-testid="create-simulation-fab"]')
    
    // Should show offline message for network-dependent actions
    await expect(page.locator('[data-testid="offline-action-blocked"]')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
    
    // Offline indicator should disappear
    await expect(page.locator('text=/오프라인|Offline/')).not.toBeVisible({ timeout: 5000 })
    
    // Should show reconnection success
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible()
  })

  test('E2E-028: Service worker caches static resources', async ({ page }) => {
    await page.goto('/')
    
    // Wait for service worker registration and activation
    const serviceWorkerReady = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        return registration.active !== null
      }
      return false
    })
    
    expect(serviceWorkerReady).toBe(true)
    
    // Check that service worker is caching resources
    const cacheNames = await page.evaluate(async () => {
      if ('caches' in window) {
        return await caches.keys()
      }
      return []
    })
    
    expect(cacheNames.length).toBeGreaterThan(0)
    
    // Verify specific resources are cached
    const cachedResources = await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        const staticCache = cacheNames.find(name => name.includes('static') || name.includes('workbox'))
        
        if (staticCache) {
          const cache = await caches.open(staticCache)
          const requests = await cache.keys()
          return requests.map(request => request.url)
        }
      }
      return []
    })
    
    // Should cache main resources
    const expectedCachedResources = [
      '/index.html',
      '/assets/',
      '/manifest.json'
    ]
    
    for (const resource of expectedCachedResources) {
      const isCached = cachedResources.some(url => url.includes(resource))
      expect(isCached).toBe(true)
    }
    
    // Test cache-first strategy for static assets
    await page.route('**/assets/**', route => {
      // Block network requests to test cache
      route.abort()
    })
    
    // Reload page - static assets should still load from cache
    await page.reload()
    await helpers.waitForMainPage()
    
    // Test network-first strategy for API calls
    await page.route('**/api/notices', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 1, title: 'Test Notice', content: 'Cached notice' }]
        })
      })
    })
    
    // API calls should go through with fallback to cache
    await page.click('[data-testid="nav-notices"]')
    await expect(page.locator('[data-testid="notices-page"]')).toBeVisible()
  })
})

test.describe('PWA Advanced Features', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await loginTestUser(page)
  })

  test('Background sync queues actions when offline', async ({ page, context }) => {
    await page.goto('/')
    
    // Create a simulation while online
    await page.click('[data-testid="create-simulation-fab"]')
    await helpers.selectPlan('A')
    await helpers.clickNext()
    await page.fill('input[aria-label*="시작"], input[placeholder*="시작"]', '1')
    await helpers.clickNext()
    await page.fill('input[aria-label*="현재"], input[placeholder*="현재"]', '1')
    await helpers.clickNext()
    await page.fill('input[aria-label*="회차"], input[placeholder*="회차"]', '10')
    await helpers.clickNext()
    await helpers.fillInvestmentAmount(1, '1000000')
    
    // Go offline before saving
    await context.setOffline(true)
    
    // Try to create simulation
    await page.click('[data-testid="create-simulation"]')
    
    // Should show queued message
    await expect(page.locator('[data-testid="action-queued"]')).toBeVisible()
    await expect(page.locator('[data-testid="queue-message"]')).toContainText('연결 시 자동으로 저장됩니다')
    
    // Verify action is queued
    await expect(page.locator('[data-testid="queued-actions-count"]')).toContainText('1')
    
    // Come back online
    await context.setOffline(false)
    await APIHelpers.mockSimulationAPI(page)
    
    // Should automatically sync queued actions
    await expect(page.locator('[data-testid="sync-in-progress"]')).toBeVisible()
    await helpers.waitForNotification('시뮬레이션이 생성되었습니다')
    
    // Queue should be empty
    await expect(page.locator('[data-testid="queued-actions-count"]')).toContainText('0')
  })

  test('Push notifications work correctly', async ({ page, context }) => {
    await context.grantPermissions(['notifications'])
    await page.goto('/')
    
    // Request notification permission
    const notificationPermission = await page.evaluate(async () => {
      if ('Notification' in window) {
        return await Notification.requestPermission()
      }
      return 'denied'
    })
    
    if (notificationPermission === 'granted') {
      // Test notification display
      await page.evaluate(() => {
        if ('serviceWorker' in navigator && 'Notification' in window) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Test Notification', {
              body: '시뮬레이션이 완료되었습니다.',
              icon: '/assets/icon-192x192.png',
              badge: '/assets/badge-72x72.png',
              tag: 'simulation-complete',
              data: { simulationId: 'test-123' }
            })
          })
        }
      })
      
      // Verify notification appears (in a real browser)
      // Note: In Playwright, notifications don't actually appear in UI
      // but we can verify the API calls were made correctly
      
      const notificationShown = await page.evaluate(() => {
        return 'Notification' in window && Notification.permission === 'granted'
      })
      
      expect(notificationShown).toBe(true)
    }
  })

  test('App manifest and theme color work correctly', async ({ page }) => {
    await page.goto('/')
    
    // Verify manifest is linked
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(manifestLink).toBe('/manifest.json')
    
    // Fetch and verify manifest content
    const manifestResponse = await page.request.get('/manifest.json')
    expect(manifestResponse.status()).toBe(200)
    
    const manifest = await manifestResponse.json()
    
    // Verify required manifest fields
    expect(manifest.name).toBe('Light of Life Club Simulation')
    expect(manifest.short_name).toBe('LLCS')
    expect(manifest.display).toBe('standalone')
    expect(manifest.orientation).toBe('landscape')
    expect(manifest.theme_color).toBe('#1976d2')
    expect(manifest.background_color).toBe('#ffffff')
    
    // Verify icons array
    expect(manifest.icons).toBeDefined()
    expect(manifest.icons.length).toBeGreaterThan(0)
    
    // Check for required icon sizes
    const iconSizes = manifest.icons.map((icon: any) => icon.sizes)
    expect(iconSizes).toContain('192x192')
    expect(iconSizes).toContain('512x512')
    
    // Verify theme color is applied
    const themeColorMeta = await page.locator('meta[name="theme-color"]').getAttribute('content')
    expect(themeColorMeta).toBe('#1976d2')
  })

  test('PWA update mechanism works', async ({ page }) => {
    await page.goto('/')
    
    // Wait for service worker
    await page.waitForFunction(() => 'serviceWorker' in navigator)
    
    // Simulate service worker update
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          // Simulate update found
          const event = new Event('message')
          ;(event as any).data = {
            type: 'CACHE_UPDATED',
            meta: 'workbox-precache'
          }
          window.dispatchEvent(event)
        })
      }
    })
    
    // Should show update available notification
    await expect(page.locator('[data-testid="update-available"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="update-message"]')).toContainText('새 버전이 사용 가능합니다')
    
    // Verify update actions
    await expect(page.locator('[data-testid="update-now"]')).toBeVisible()
    await expect(page.locator('[data-testid="update-later"]')).toBeVisible()
    
    // Test "Update Now" functionality
    await page.click('[data-testid="update-now"]')
    
    // Should trigger page reload for update
    await expect(page.locator('[data-testid="updating-app"]')).toBeVisible()
    
    // After update, should show success message
    await page.reload()
    await expect(page.locator('[data-testid="update-success"]')).toBeVisible({ timeout: 5000 })
  })

  test('PWA works in different display modes', async ({ page }) => {
    // Test standalone mode (simulated)
    await page.addInitScript(() => {
      // Mock standalone display mode
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query.includes('display-mode: standalone'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {}
        })
      })
    })
    
    await page.goto('/')
    
    // Should detect standalone mode and show PWA UI
    const isStandalone = await page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches
    })
    
    if (isStandalone) {
      await expect(page.locator('[data-testid="pwa-titlebar"]')).toBeVisible()
      await expect(page.locator('[data-testid="browser-chrome"]')).not.toBeVisible()
    }
    
    // Test fullscreen mode
    await page.addInitScript(() => {
      Object.defineProperty(document, 'fullscreenEnabled', { value: true })
      Object.defineProperty(document, 'fullscreenElement', { value: document.body })
    })
    
    await page.reload()
    
    // Should adapt to fullscreen
    const isFullscreen = await page.evaluate(() => {
      return document.fullscreenElement !== null
    })
    
    if (isFullscreen) {
      await expect(page.locator('[data-testid="fullscreen-ui"]')).toBeVisible()
    }
  })

  test('Data storage and quota management', async ({ page }) => {
    await page.goto('/')
    
    // Test storage quota
    const storageEstimate = await page.evaluate(async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        return await navigator.storage.estimate()
      }
      return null
    })
    
    if (storageEstimate) {
      expect(storageEstimate.quota).toBeGreaterThan(0)
      expect(storageEstimate.usage).toBeDefined()
    }
    
    // Test persistent storage request
    const persistentStorage = await page.evaluate(async () => {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        return await navigator.storage.persist()
      }
      return false
    })
    
    // Should attempt to get persistent storage
    expect(typeof persistentStorage).toBe('boolean')
    
    // Test storage cleanup when quota is low
    await page.evaluate(() => {
      // Simulate low storage scenario
      if ('localStorage' in window) {
        const largeData = 'x'.repeat(1000000) // 1MB of data
        for (let i = 0; i < 10; i++) {
          try {
            localStorage.setItem(`large-data-${i}`, largeData)
          } catch (e) {
            // Quota exceeded
            break
          }
        }
      }
    })
    
    // App should handle storage quota gracefully
    await expect(page.locator('[data-testid="storage-warning"]')).toBeVisible({ timeout: 5000 })
    
    // Should offer cleanup options
    await expect(page.locator('[data-testid="cleanup-storage"]')).toBeVisible()
    
    await page.click('[data-testid="cleanup-storage"]')
    await helpers.waitForNotification('저장 공간이 정리되었습니다')
  })
})