# E2E Test Configuration Guide

## Stop Tests After Failures

### Configuration: `maxFailures`

In `playwright.config.ts`, the `maxFailures: 5` option stops the test run after 5 test failures:

```typescript
export default defineConfig({
  maxFailures: 5, // Stop after 5 test failures
  // ... other config
});
```

**How it works:**
- Playwright counts failed tests (not failed assertions)
- Once 5 tests fail, remaining tests are skipped
- Useful for fast-failing in CI or when debugging multiple issues

**Alternative CLI option:**
```bash
npx playwright test --max-failures=5
```

---

## Save Test Output to File

### Option 1: Using Multiple Reporters (Recommended)

Configure in `playwright.config.ts`:

```typescript
reporter: [
  ['list'], // Console output with verbose details
  ['json', { outputFile: 'test-results/results.json' }],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
],
```

**Generated files:**
- `test-results/results.json` - Machine-readable JSON report
- `playwright-report/index.html` - Interactive HTML report with screenshots/videos

**View HTML report:**
```bash
npm run test:e2e:report
# or
npx playwright show-report
```

### Option 2: Redirect Terminal Output (PowerShell)

```powershell
# Redirect both stdout and stderr to file
npx playwright test > test-results/e2e-output.log 2>&1

# Or use the npm script:
npm run test:e2e:save
```

**Note:** On Windows PowerShell, use `>` for redirection. The `2>&1` redirects errors to the same file.

### Option 3: Save Only Failure Details

Use the `line` reporter with filtering:

```bash
npx playwright test --reporter=line > test-results/failures-only.log 2>&1
```

---

## Available Test Scripts

```json
{
  "test:e2e": "playwright test",                    // Run all tests
  "test:e2e:ui": "playwright test --ui",           // Interactive UI mode
  "test:e2e:debug": "playwright test --debug",     // Debug mode
  "test:e2e:report": "playwright show-report",     // View HTML report
  "test:e2e:save": "playwright test > test-results/e2e-output.log 2>&1"  // Save to file
}
```

---

## Useful CLI Options

### Run specific project:
```bash
npx playwright test --project="Mobile Chrome"
```

### Run specific test file:
```bash
npx playwright test e2e/specs/auth-session.spec.ts
```

### Verbose output:
```bash
npx playwright test --reporter=list
```

### Stop on first failure:
```bash
npx playwright test --max-failures=1
```

### Run with specific number of workers:
```bash
npx playwright test --workers=1
```

---

## Report Formats

### Available Reporters

1. **list** (default) - Line-by-line output with detailed failure info
2. **dot** - Compact output with dots for each test
3. **line** - Single line per test
4. **json** - Machine-readable JSON format
5. **html** - Interactive HTML report
6. **junit** - JUnit XML format (for CI integration)

### Multiple Reporters Example

```typescript
reporter: [
  ['list'],
  ['json', { outputFile: 'test-results/results.json' }],
  ['html', { outputFolder: 'playwright-report' }],
  ['junit', { outputFile: 'test-results/junit.xml' }],
],
```

---

## Output File Locations

```
src/frontend/
├── test-results/
│   ├── results.json          # JSON report
│   ├── e2e-output.log        # Full terminal output
│   ├── junit.xml             # JUnit format (if configured)
│   └── [test-name]/          # Individual test artifacts
│       ├── trace.zip         # Traces (if enabled)
│       ├── video.webm        # Videos (if enabled)
│       └── screenshot.png    # Screenshots (if enabled)
└── playwright-report/
    └── index.html            # HTML report
```

---

## Best Practices

1. **Development:** Use `--ui` mode for interactive debugging
2. **CI/CD:** Enable multiple reporters (json + html) and set `maxFailures`
3. **Debugging specific failures:** Use `--max-failures=1` to focus on first issue
4. **Save output:** Use redirection or JSON reporter for failure analysis
5. **Review reports:** HTML reporter is best for visual inspection of failures

---

## Troubleshooting

### PowerShell Redirection Issues

If `>` redirection doesn't work, try:
```powershell
npx playwright test | Out-File -FilePath test-results/e2e-output.log -Encoding UTF8
```

### Large Output Files

If output is too large, filter with:
```bash
npx playwright test --reporter=line  # Minimal output
npx playwright test --reporter=dot   # Even more compact
```

### View Specific Test Details

After running tests, check:
1. `test-results/results.json` - Search for test name
2. `playwright-report/index.html` - Visual inspection
3. Individual test folders in `test-results/` for artifacts

---

## Current Configuration

✅ `maxFailures: 5` - Stops after 5 failures
✅ Multiple reporters configured (list, json, html)
✅ Reports saved to `test-results/` and `playwright-report/`
✅ npm script `test:e2e:save` for terminal output capture
