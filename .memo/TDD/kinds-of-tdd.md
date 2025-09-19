No, TDD doesn't **always** require writing tests first, though that's the classic and most strict interpretation. Let me explain the different approaches:

## Classic TDD (Red-Green-Refactor)
The traditional TDD cycle is:
1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve the code while keeping tests green

## Practical Variations

### 1. **Pragmatic TDD**
- Write tests alongside code development
- Sometimes write a small piece of functionality, then immediately write tests
- Focus on high test coverage rather than strict order

### 2. **Outside-In TDD**
- Start with acceptance tests (user story level)
- Work down to unit tests as you implement
- Tests guide the design but may not always come first

### 3. **Legacy Code TDD**
- Add tests to existing code before modifying it
- Write characterization tests to understand current behavior
- Then apply TDD for new features

## When Tests Don't Come First

**Exploration/Prototyping**:

```python
# Sometimes you need to explore an API first
def explore_api():
    # Quick prototype to understand behavior
    response = external_api.call()
    print(response.structure)  # What does this look like?

# Then write tests based on what you learned
def test_api_integration():
    response = external_api.call()
    assert response.status == 200
```

**Spike Solutions**:
- Write throwaway code to solve technical unknowns
- Then start over with TDD using lessons learned

**Complex Algorithms**:
- Sometimes you need to work out the math/logic first
- Then write comprehensive tests around the working algorithm

## Modern TDD Approaches

Many teams use **"TDD-ish"** approaches:
- Write tests for critical business logic first
- Write integration tests early to define interfaces
- Add unit tests as code complexity grows
- Focus on testability and high coverage

## Key Principles (Order Flexible)
1. **Tests as Design Tools**: Tests help clarify requirements
2. **Safety Net**: Tests catch regressions
3. **Documentation**: Tests show how code should be used
4. **Refactoring Confidence**: Tests enable safe code changes

## Example from Our Codebase
Looking at our JWT tests, we likely:
1. Had some authentication requirements
2. Implemented basic JWT validation
3. Added comprehensive tests to cover edge cases
4. Refactored with test protection

The **spirit of TDD** (safety, design, documentation) matters more than rigid adherence to the red-green-refactor sequence. The goal is robust, well-tested code that's easy to maintain