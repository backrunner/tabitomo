import { test, expect } from '@playwright/test';

test.describe('Main Layout Rendering', () => {
  test('should render the main app container with gradient background', async ({ page }) => {
    await page.goto('/');

    // Check that the main app container exists
    const appContainer = page.locator('div.min-h-screen');
    await expect(appContainer).toBeVisible();

    // Verify gradient background classes are applied
    await expect(appContainer).toHaveClass(/bg-gradient-to-br/);
  });

  test('should show loading state or main content', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('domcontentloaded');

    // Check that the root div exists
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // App should render either loading or main content
    const hasContent = await root.locator('*').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('should render translation tool or welcome wizard', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Check if either the welcome wizard or translation tool is rendered
    const hasWelcomeWizard = await page.getByText(/Welcome to tabitomo/i).isVisible().catch(() => false);
    const hasTranslationTool = await page.locator('textarea, [role="textbox"]').first().isVisible().catch(() => false);

    // One of them should be present
    expect(hasWelcomeWizard || hasTranslationTool).toBeTruthy();
  });

  test('should have proper viewport meta for mobile PWA', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag (use first() to handle potential duplicates)
    const viewportMeta = await page.locator('meta[name="viewport"]').first().getAttribute('content');
    expect(viewportMeta).toContain('viewport-fit=cover');
  });

  test('should have PWA manifest linked', async ({ page }) => {
    await page.goto('/');

    // Check manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');
  });

  test('should not have horizontal scroll', async ({ page }) => {
    await page.goto('/');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Check that body doesn't have horizontal overflow
    const bodyOverflow = await page.evaluate(() => {
      const body = document.body;
      return {
        scrollWidth: body.scrollWidth,
        clientWidth: body.clientWidth,
        overflowX: window.getComputedStyle(body).overflowX,
      };
    });

    // Body should have overflow hidden
    expect(bodyOverflow.overflowX).toBe('hidden');
  });

  test('should render without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // There should be no JavaScript errors
    expect(errors).toHaveLength(0);
  });
});

test.describe('Mobile PWA Safe Areas', () => {
  test('should handle safe area insets on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/');

    // Check that main container has proper safe area handling
    const appContainer = page.locator('div.min-h-screen').first();
    const styles = await appContainer.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        paddingTop: computed.paddingTop,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
      };
    });

    // Padding should be applied (at least base padding of 1rem = 16px)
    expect(parseInt(styles.paddingTop)).toBeGreaterThanOrEqual(16);
    expect(parseInt(styles.paddingBottom)).toBeGreaterThanOrEqual(16);
  });
});
