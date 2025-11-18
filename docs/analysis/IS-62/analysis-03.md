## Problems

The current E2E codes are not consistent with the ux-flow specification in `docs/spec/ux-flow.md`.

## Tasks

Using shared resources and fixtures, re-implement all E2E-JOURNEY tests from scratch. They must tests all the UX flows in docs/spec/ux-flow.md. Re-use the existing cases or test codes if possible ONLY if they fit the instructions below.

## Notes

### Plans for test simulations

Use these 2 test plans for simulations (so all tests should be done against the 2 cases below)

```
A플랜, 
가입한 회차 선택: 28
현재 회차 선택: 29
시뮬레이션 총 회차 선택: 30
4회차부터 매출 달성율: 모두 65%
개인 회차 매출액: 110, 242, 이후 모두 최소 매출액
```

```
P플랜, 
가입한 회차 선택: 13
현재 회차 선택: 18
시뮬레이션 총 회차 선택: 21
4회차부터 매출 달성율: 개인 회차 4, 5회차는 64%, 6회차부터 모두 65%
개인 회차 매출액: 550, 33, 33, 55, 110, 77, 이후 모두 최소 매출액
```

### Test id consistency

The test ids in the frontend code and its current test codes have the following issues:

- There are missing test ids in many components, causing test codes to not get elements.
- There are test ids that are not consistent with the test codes. Unify into a single naming.

Should be fixed in this task.

### Remove the legacy test codes

Remove all existing E2E-JOURNEY test codes that are being replaced by the new implementations.

## Divide & Conquer

- Create multiple implementation planning tasks to solve the issues above.
- Each plan file should be an independently solvable problem unit.