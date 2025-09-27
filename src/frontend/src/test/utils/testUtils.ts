import { vi } from 'vitest'

export const mockFetchResponse = (data: any, ok = true, status = 200) => {
  const mockFetch = vi.mocked(fetch)
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response)
}

export const mockFetchError = (status = 500, statusText = 'Internal Server Error') => {
  const mockFetch = vi.mocked(fetch)
  mockFetch.mockRejectedValueOnce(new Error(`${status} ${statusText}`))
}

// Improved mock mobile viewport that works with Material-UI useMediaQuery
export const mockMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  })
  
  // Mock matchMedia for Material-UI useMediaQuery
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: query.includes('max-width') ? true : false, // Simulate mobile breakpoint
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

// Improved mock desktop viewport
export const mockDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1920,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 1080,
  })
  
  // Mock matchMedia for Material-UI useMediaQuery  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: query.includes('max-width') ? false : true, // Simulate desktop breakpoint
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

// Reset viewport
export const resetViewport = () => {
  // Reset to default values instead of trying to delete
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  })
  // Reset matchMedia to default desktop behavior
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock navigator.onLine for network status tests
export const mockOnlineStatus = (isOnline: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: isOnline,
  })
  
  // Dispatch the appropriate event
  const event = new Event(isOnline ? 'online' : 'offline')
  window.dispatchEvent(event)
}

// Simulate act for async state updates
export const waitForReactUpdate = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}