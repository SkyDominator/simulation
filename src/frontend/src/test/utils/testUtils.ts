import { vi } from 'vitest'

export const mockFetchResponse = (data: any, ok = true, status = 200) => {
  const mockFetch = vi.mocked(fetch)
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
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
}

// Reset viewport
export const resetViewport = () => {
  delete (window as any).innerWidth
  delete (window as any).innerHeight
}