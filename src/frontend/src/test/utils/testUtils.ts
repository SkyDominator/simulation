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

// Mock mobile viewport
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
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

// Mock desktop viewport
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
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

// Reset viewport
export const resetViewport = () => {
  delete (window as any).innerWidth
  delete (window as any).innerHeight
}

// Simulate act for async state updates
export const waitForReactUpdate = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}