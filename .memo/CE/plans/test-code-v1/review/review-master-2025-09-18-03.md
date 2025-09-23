# Test Plan Master Review - 2025-09-18-03

## Review Overview

This review examines the test plan master document (`test-code-00-master.md`) for clarity, format consistency, and contents consistency in accordance with the SSD v0.2.1 specifications.

## 1. Clarity Issues

### 1.1 Ambiguous Coverage Terminology

**Issue**: The document uses inconsistent terminology for coverage targets:

- Line 4: "backend ≥40% (path toward 70%); frontend ≥25% (path toward 60%)"
- Section 8 Coverage & Reporting: "backend 40% / frontend 25% initial gates"
- Rollout Plan: "Backend: start 40% → +5% every 2 months until 60%, then +3% toward 70%+"

**Suggestion**: Clarify that the parenthetical values represent long-term targets and establish a clear distinction between "initial gates" and "target progression." Use consistent terminology throughout (e.g., "initial threshold," "progression target," "final target").

### 1.2 Incomplete Command Implementation Status

**Issue**: Several commands are referenced in Command Summary but their implementation status is unclear:

- `perf.run (future)` - marked as future but included in current scope
- `coverage.merge (future)` - marked as future but coverage reporting is in scope

**Suggestion**: Either remove future commands from the current plan or clarify their implementation priority. If they are scaffolds for future implementation, explicitly state this in the command descriptions.

### 1.3 Vague Error Handling Specifications

**Issue**: Line 332 states "Error envelope structure (if provided) idempotence" which is unclear about:

- What constitutes an error envelope
- When it's provided vs. not provided
- What idempotence means in this context

**Suggestion**: Define the error envelope structure based on SSD §15 error handling patterns and clarify idempotence requirements for error responses.

### 1.4 Inconsistent Deferred Item Handling

**Issue**: Multiple items are marked as "Deferred" or "else mark Deferred" without clear criteria:

- Achievement rate override (line 152)
- Consent 423 enforcement scenarios (multiple locations)
- Migration/schema drift automation

**Suggestion**: Establish clear criteria for what makes an item deferred and consistently apply this classification. Consider creating a dedicated "Deferred Items" section for transparency.

### 1.5 Unclear Repository Boundary Implementation

**Issue**: Section 2.2 "Repository Boundary Checklist" introduces concepts not explained elsewhere:

- What constitutes "repository interfaces"
- How service layer isolation will be implemented
- Relationship to existing codebase structure

**Suggestion**: Either expand this section with implementation details consistent with the existing FastAPI structure in SSD, or move it to a design document separate from the test plan.

## 2. Format Consistency Issues

### 2.1 Inconsistent Task Numbering

**Issue**: Task numbering is inconsistent across sections:

- Backend Unit Tests: numbered 1-13
- Backend Integration Tests: numbered 1-14
- Some sections restart numbering, others continue

**Suggestion**: Adopt a consistent numbering scheme across all test layer sections. Consider using hierarchical numbering (e.g., 1.1, 1.2) to maintain context.

### 2.2 Mixed List Formatting

**Issue**: The document uses both numbered lists and bullet points inconsistently:

- Goals section uses bullet points
- Out of Scope uses bullet points
- Tasks sections use numbered lists
- Some subsections mix both formats

**Suggestion**: Standardize list formatting based on content type: numbered lists for sequential tasks, bullet points for parallel/unordered items.

### 2.3 Inconsistent Table Formatting

**Issue**: Tables vary in structure and completeness:

- Risk & Mitigation Summary has complete Impact/Mitigation columns
- Command Summary lacks consistent column structure
- Dependencies & Prerequisites table is incomplete

**Suggestion**: Standardize table formats and ensure all tables are complete. Consider adding Status columns where appropriate.

### 2.4 Heading Level Inconsistency

**Issue**: Section headings use inconsistent levels:

- Some subsections use `###` under `##` sections
- Others jump to `####`
- "Test Layers & Tasks" section mixes heading levels irregularly

**Suggestion**: Establish a consistent heading hierarchy: `##` for major sections, `###` for test layers, `####` for task categories.

## 3. Contents Consistency Issues

### 3.1 Contradiction in OTP Attempt Limits

**Issue**: The document references inconsistent OTP attempt limits:

- Line 158: "OTP verify attempt limit constant (6) assertion (document SSD discrepancy)"
- SSD §7.1: "OTP rate limiting: 3 sends per 15 min, 6 verify attempts"
- Line 240: "OTP: exceed verify attempts (attempt beyond limit) → 429"

**Suggestion**: Reconcile the OTP attempt limit specification with SSD and clearly document any intentional deviations. The current text suggests awareness of a discrepancy but doesn't resolve it.

### 3.2 Scope Inconsistency for Performance Testing

**Issue**: Performance testing appears in both current scope and future enhancements:

- Section 7 includes it as a current test layer
- Future Enhancements mentions "Performance regression detection and alerting"
- Some performance tasks are marked as informational vs. gating

**Suggestion**: Clarify which aspects of performance testing are in current scope (baseline measurement) vs. future scope (regression detection, alerting). Make the distinction between informational and gating explicit.

### 3.3 Inconsistent Admin Endpoint Coverage

**Issue**: Admin functionality coverage is inconsistent:

- Privacy policy admin endpoints are extensively covered
- Notice admin endpoints are briefly mentioned
- Admin authentication checking is covered
- But no mention of user management or other admin functions that might exist

**Suggestion**: Review SSD admin endpoint specifications and ensure complete coverage of all admin functionality. If some admin features are out of scope, explicitly state this.

### 3.4 Contradictory PII Policy Implementation

**Issue**: PII masking has conflicting requirements:

- Section 9 requires "no raw phone numbers"
- But OTP testing inherently requires phone number handling
- Mock SMS provider reduces but doesn't eliminate phone number exposure

**Suggestion**: Clarify PII policy for test environments. Define what constitutes "allowed" phone numbers (e.g., clearly fake numbers, specific test patterns) and provide concrete examples.

### 3.5 Environment Strategy Contradictions

**Issue**: Environment strategy has internal contradictions:

- "Real Supabase (or local equivalent)" is vague
- "Mock SMS provider unless ALLOW_REAL_SMS=1" conflicts with PII policy
- CI environment strategy doesn't specify database isolation approach

**Suggestion**: Define specific environment configurations for each context (local dev, CI, staging) with clear specifications for database, authentication, and external service handling.

## 4. SSD Consistency Check

### 4.1 Missing SSD Alignment for Test Scope

**Issue**: Some SSD features are not adequately covered in the test plan:

- SSD §13.4 MainPage Navigation features (bulk operations, summary reports)
- SSD §13.5 Mobile-First Responsive Design testing
- SSD §21 Backup and Recovery validation

**Suggestion**: Either expand test coverage to include these SSD features or explicitly document them as out of scope with justification.

### 4.2 API Contract Mismatch

**Issue**: The test plan references API endpoints that may not fully align with SSD §9:

- Parameter conversion (scheduled_payment → investments) is mentioned but not fully specified in SSD
- Some admin endpoints in the test plan are more extensive than SSD examples

**Suggestion**: Verify all API endpoints referenced in the test plan against the complete SSD API specification and reconcile any mismatches.

## 5. Implementation Clarity Gaps

### 5.1 Missing Test Data Strategy

**Issue**: While PII policy is defined, comprehensive test data strategy is missing:

- No specification for test user creation
- No mention of test simulation data sets
- Unclear how whitelist test data will be managed

**Suggestion**: Add a test data management section covering user accounts, simulation scenarios, and whitelist management for testing.

### 5.2 Unclear CI Integration Points

**Issue**: CI integration is mentioned but lacks specifics:

- Which tests run in which CI phases
- How environment variables are managed in CI
- Database setup/teardown procedures

**Suggestion**: Define a clear CI pipeline structure with specific test execution phases and environment setup procedures.

## 6. Priority Recommendations

### High Priority (Blocking Issues)

1. **Resolve OTP attempt limit contradiction** - This affects core authentication testing
2. **Clarify environment strategy** - Essential for test implementation
3. **Define error envelope structure** - Needed for integration test assertions

### Medium Priority (Quality Issues)

1. **Standardize formatting** - Improves maintainability
2. **Reconcile admin endpoint coverage** - Ensures complete test coverage
3. **Clarify deferred item criteria** - Improves project planning

### Low Priority (Enhancement)

1. **Add test data strategy** - Can be addressed during implementation
2. **Expand CI integration details** - Can evolve with implementation

## 7. Conclusion

The test plan demonstrates comprehensive coverage of the LOLClub Simulation application but requires refinement in several areas to ensure clarity and consistency. The primary issues involve ambiguous specifications, formatting inconsistencies, and some contradictions with the SSD. Addressing the high-priority recommendations will provide a solid foundation for test implementation.

Most issues can be resolved through clarification and standardization rather than fundamental restructuring, indicating the overall plan structure is sound.
