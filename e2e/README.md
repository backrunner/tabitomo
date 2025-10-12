# E2E Tests

End-to-end tests for tabitomo using Playwright.

## Setup

Install Playwright browsers:

```bash
pnpm test:install
```

## Running Tests

### Run all tests (headless mode)
```bash
pnpm test:e2e
```

### Run tests with UI mode (interactive)
```bash
pnpm test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
pnpm test:e2e:headed
```

## Test Coverage

### Main Layout Tests (`main-layout.spec.ts`)

Tests the core rendering and layout functionality:

- ✅ Main app container renders with gradient background
- ✅ Loading state displays correctly
- ✅ Translation tool or welcome wizard appears
- ✅ PWA viewport meta tag is properly configured
- ✅ Manifest link is present
- ✅ No horizontal scroll overflow
- ✅ No JavaScript errors on page load

### Mobile PWA Tests

- ✅ Safe area insets are properly handled on mobile devices

## CI/CD Integration

Tests are automatically run before deployment:

```bash
pnpm deploy  # Builds, tests, then deploys
```

The deploy will fail if any E2E tests fail, ensuring only working builds are deployed.

## Writing New Tests

Add new test files to the `e2e/` directory with the `.spec.ts` extension.

Example:

```typescript
import { test, expect } from '@playwright/test';

test('my new test', async ({ page }) => {
  await page.goto('/');
  // Your test code here
});
```

See [Playwright documentation](https://playwright.dev/docs/intro) for more details.
