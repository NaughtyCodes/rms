import { test, expect } from '@playwright/test';

test.describe('Invoices and Reports', () => {

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    const inputs = page.locator('input');
    await inputs.nth(0).fill('admin');
    await inputs.nth(1).fill('admin123');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page.locator('.sidebar').first()).toBeVisible({ timeout: 10000 });
  });

  test('should view the invoice history list', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('h1', { hasText: 'Invoices' })).toBeVisible({ timeout: 10000 });

    // Check if table renders
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check for "View" or print button on an invoice if one exists
    const rows = page.locator('tbody tr');
    if (await rows.count() > 0 && !(await rows.first().innerText()).includes('No invoices')) {
        await expect(rows.first().locator('button', { hasText: /View|🖨️/i }).first()).toBeVisible();
    }
  });

  test('should load the reports dashboard properly', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1', { hasText: 'Reports' })).toBeVisible({ timeout: 10000 });

    // Verify report cards are visible
    await expect(page.locator('text=Revenue').first()).toBeVisible();
    await expect(page.locator('text=Bills').first()).toBeVisible();
  });

});
