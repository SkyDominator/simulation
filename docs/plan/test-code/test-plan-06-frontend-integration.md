# Test Plan – Frontend Integration Tests (Concrete v1.0)

This covers integration tests for complete user flows and multi-component interactions in the frontend. Tests validate end-to-end business processes with mocked external services.

Target: Integration tests in `src/frontend/src/test/integration/UserFlowIntegration.test.tsx` focusing on critical user paths.

**Testability Note**: As of commit 080669f, key pages support API dependency injection via optional `apiService` prop (PlanEditor, ConsentPage, AdminPolicyPage, MainPage, NoticeBoardModal), enabling proper service-layer mocking in integration tests.

--------------------------------------------------------------------------------
## 1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* Complete user onboarding flows (OTP → Auth → First Simulation)
* Simulation CRUD operations across multiple components
* Data export and backup workflows
* Authentication state management across navigation
* Error recovery and resilience patterns
* API dependency injection for network-layer mocking

**Out of Scope:**
* Browser-specific behavior (covered in E2E)
* Real API calls (mocked at service layer via dependency injection)
* Performance testing
* Cross-browser compatibility

**Test Philosophy:**
* Test complete business workflows from start to finish
* Mock external services (Supabase, API endpoints) via apiService injection
* Validate state management across component boundaries
* Ensure data flows correctly through application layers
* Test error handling and recovery mechanisms
* Use dependency injection for clean, maintainable mocks

--------------------------------------------------------------------------------
## 2. Test Category Matrix
--------------------------------------------------------------------------------

### 2.1 Onboarding Flow Integration (CAT-INT-ONBOARD)

**Why**: Validate complete user onboarding process  
**Location**: `src/test/integration/UserFlowIntegration.test.tsx`  
**Cases**:

* INT-ONBOARD-001: Complete full user onboarding from whitelist to first simulation
* INT-ONBOARD-002: Handle OTP failures gracefully in full flow
* INT-ONBOARD-003: Verify OTP verification transitions to next step
* INT-ONBOARD-004: Handle consent flow integration with OTP
* INT-ONBOARD-005: Validate OAuth integration after OTP completion

### 2.2 Simulation CRUD Flow (CAT-INT-SIM)

**Why**: Ensure simulation lifecycle operations work end-to-end  
**Cases**:

* INT-SIM-001: Complete full simulation lifecycle (create → run → update → delete)
* INT-SIM-002: Handle simulation run errors gracefully
* INT-SIM-003: Update simulation parameters and verify results invalidation
* INT-SIM-004: Verify simulation memo updates persist correctly
* INT-SIM-005: Test concurrent simulation operations
* INT-SIM-006: Validate simulation state across page navigation

### 2.3 Data Export/Backup Flow (CAT-INT-DATA)

**Why**: Validate data export and backup functionality  
**Cases**:

* INT-DATA-001: Export simulation data correctly
* INT-DATA-002: Handle empty data export gracefully
* INT-DATA-003: Validate export format and completeness
* INT-DATA-004: Test bulk export operations
* INT-DATA-005: Verify exported data integrity

### 2.4 Authentication State Management (CAT-INT-AUTH)

**Why**: Ensure authentication state persists across navigation  
**Cases**:

* INT-AUTH-001: Maintain session state across page navigation
* INT-AUTH-002: Handle authentication errors in integrated flow
* INT-AUTH-003: Verify token refresh during long sessions
* INT-AUTH-004: Test logout flow clears all state
* INT-AUTH-005: Handle session expiry gracefully

### 2.5 Error Recovery and Resilience (CAT-INT-ERR)

**Why**: Validate application resilience to failures  
**Cases**:

* INT-ERR-001: Recover from network errors gracefully
* INT-ERR-002: Handle concurrent operations safely
* INT-ERR-003: Validate retry mechanisms
* INT-ERR-004: Test partial failure scenarios
* INT-ERR-005: Ensure data consistency after errors

--------------------------------------------------------------------------------
## 3. Fixtures & Infrastructure
--------------------------------------------------------------------------------

### 3.1 Mock API Service Factory

```typescript
export const createMockApiService = (): ApiServiceInterface => ({
  deleteSimulation: vi.fn(),
  runSimulation: vi.fn(),
  getSimulations: vi.fn().mockResolvedValue([]),
  getSimulationDetails: vi.fn(),
  createSimulation: vi.fn(),
  updateSimulation: vi.fn(),
  updateSimulationMemo: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  recordConsent: vi.fn(),
  getPrivacyPolicy: vi.fn(),
  // ... other methods
})
```

### 3.2 OTP Flow Helpers

```typescript
export const mockSuccessfulOTP = (apiService: ApiServiceInterface) => {
  const mockOtpResponse: OTPSendResponse = {
    success: true,
    message: 'OTP sent successfully',
    user_hash: 'test-hash-123',
    expires_in_seconds: 300
  }
  
  const mockVerifyResponse: OTPVerifyResponse = {
    success: true,
    message: 'OTP verified successfully'
  }

  vi.mocked(apiService.sendOtp).mockResolvedValue(mockOtpResponse)
  vi.mocked(apiService.verifyOtp).mockResolvedValue(mockVerifyResponse)
}

export const mockFailedOTP = (apiService: ApiServiceInterface) => {
  const mockFailureResponse: OTPSendResponse = {
    success: false,
    message: '가입 허용 명단에 없는 사용자입니다.'
  }
  
  vi.mocked(apiService.sendOtp).mockResolvedValue(mockFailureResponse)
}
```

### 3.3 Simulation Test Data

```typescript
export const createTestSimulation = (overrides?: Partial<Plan>): Plan => ({
  simulation_id: 'sim-test-123',
  plan_id: 'A',
  memo: 'Test simulation',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  starting_company_round: 1,
  current_company_round: 1,
  simulation_rounds: 12,
  investments: [{ round: 1, amount: 1000000 }],
  sales_achievement_rates: [],
  simulation_results: null,
  ...overrides
})
```

--------------------------------------------------------------------------------
## 4. Representative Test Snippets
--------------------------------------------------------------------------------

### 4.1 INT-ONBOARD-001: Complete Onboarding Flow

```typescript
it('should complete full user onboarding from whitelist to first simulation', async () => {
  const user = userEvent.setup()
  
  // Mock successful OTP flow
  mockSuccessfulOTP(mockApiService)
  
  // Render WhitelistCheckPage
  renderWithProviders(
    <WhitelistCheckPage 
      onVerified={mockOnVerified} 
      apiService={mockApiService}
    />
  )
  
  // Fill whitelist form
  const nameInput = screen.getByLabelText(/이름/i)
  const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
  const submitButton = screen.getByRole('button', { name: /인증번호 받기/i })
  
  await user.type(nameInput, '홍길동')
  await user.type(phoneInput, '010-1234-5678')
  await user.click(submitButton)
  
  // Verify OTP was sent
  await waitFor(() => {
    expect(mockApiService.sendOtp).toHaveBeenCalledWith('홍길동', '010-1234-5678')
  }, { timeout: 10000 })
  
  // Verify transition to next step
  await waitFor(() => {
    const otpInputs = screen.queryAllByRole('textbox')
    expect(otpInputs.length > 0).toBeTruthy()
  }, { timeout: 10000 })
}, 25000)
```

### 4.2 INT-SIM-001: Complete Simulation Lifecycle

```typescript
it('should complete full simulation lifecycle (create → run → update → delete)', async () => {
  const user = userEvent.setup()
  
  // Setup simulation data
  const testSimulation = createTestSimulation()
  const runResponse: SimulationRunResponse = {
    simulation_id: testSimulation.simulation_id,
    history: [],
    summary: {
      total_rounds: 12,
      final_profit: 1000000,
      total_investment: 10000000,
      total_revenue: 11000000
    },
    success: true
  }
  
  // Mock API responses
  vi.mocked(mockApiService.createSimulation).mockResolvedValue({
    simulation_id: testSimulation.simulation_id,
    success: true
  })
  vi.mocked(mockApiService.runSimulation).mockResolvedValue(runResponse)
  vi.mocked(mockApiService.getSimulations).mockResolvedValue([testSimulation])
  
  // 1. Create simulation
  renderWithProviders(
    <PlanEditor {...planEditorProps} apiService={mockApiService} />
  )
  
  // ... fill form and submit ...
  
  // 2. Run simulation
  await user.click(screen.getByRole('button', { name: /실행/i }))
  
  await waitFor(() => {
    expect(mockApiService.runSimulation).toHaveBeenCalled()
  })
  
  // 3. Verify results displayed
  expect(mockSetSimulationResult).toHaveBeenCalledWith(
    expect.objectContaining({ simulation_id: testSimulation.simulation_id })
  )
  
  // 4. Update simulation
  // ... test update flow ...
  
  // 5. Delete simulation
  // ... test delete flow ...
})
```

### 4.3 INT-ERR-001: Network Error Recovery

```typescript
it('should recover from network errors gracefully', async () => {
  const user = userEvent.setup()
  
  // First call fails, second succeeds
  vi.mocked(mockApiService.getSimulations)
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce([])
  
  renderWithProviders(
    <MainPage {...mockProps} apiService={mockApiService} />
  )
  
  // Should show error state
  await waitFor(() => {
    expect(screen.getByText(/오류/i)).toBeInTheDocument()
  })
  
  // Click retry button
  const retryButton = screen.getByRole('button', { name: /다시 시도/i })
  await user.click(retryButton)
  
  // Should recover and show data
  await waitFor(() => {
    expect(screen.queryByText(/오류/i)).not.toBeInTheDocument()
    expect(mockApiService.getSimulations).toHaveBeenCalledTimes(2)
  })
})
```

--------------------------------------------------------------------------------
## 5. Test Execution
--------------------------------------------------------------------------------

**Location**: `src/frontend/src/test/integration/`

**Run Commands**:

```bash
# Run all integration tests
cd src/frontend
npm run test -- src/test/integration

# Run specific test file
npm run test -- src/test/integration/UserFlowIntegration.test.tsx

# Run with verbose output
npm run test -- src/test/integration --reporter=verbose
```

**VS Code Debug**: Use launch configuration "Integration Test: Frontend"

--------------------------------------------------------------------------------
## 6. Coverage Requirements
--------------------------------------------------------------------------------

* **Target Coverage**: ≥70% for integration flows
* **Critical Paths**: 100% coverage for onboarding and simulation CRUD
* **Error Paths**: ≥80% coverage for error handling and recovery

--------------------------------------------------------------------------------
## 7. Test Summary
--------------------------------------------------------------------------------

| Category | Test Cases | Priority | Dependencies |
|----------|-----------|----------|--------------|
| INT-ONBOARD | 5 | Critical | MockApiService, OTP helpers |
| INT-SIM | 6 | Critical | Simulation test data |
| INT-DATA | 5 | High | Export utilities |
| INT-AUTH | 5 | High | MockAuthProvider |
| INT-ERR | 5 | Medium | Error simulation |

**Total: 26 test cases**

--------------------------------------------------------------------------------
## 8. Integration Testing Principles
--------------------------------------------------------------------------------

1. **End-to-End Flows**: Test complete business processes from start to finish
2. **State Management**: Verify state consistency across components
3. **Error Handling**: Test graceful degradation and recovery
4. **Mock External Services**: Use service layer mocks, not component mocks
5. **Realistic Data**: Use test data that matches production scenarios
6. **Async Operations**: Properly handle and wait for async operations
7. **Cleanup**: Ensure tests clean up state between runs

--------------------------------------------------------------------------------
## 9. Maintenance Notes
--------------------------------------------------------------------------------

* Update test flows when user journeys change
* Keep mock data synchronized with API contracts
* Review critical paths quarterly for completeness
* Document any known limitations or workarounds
* Maintain timeout values appropriate for CI environment
