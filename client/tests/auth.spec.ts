import { test, expect } from '@playwright/test';

test.describe('Authentication and Branch Context', () => {

  test('should login successfully as admin', async ({ page }) => {
    await page.goto('/');

    const inputs = page.locator('input');
    await inputs.nth(0).fill('admin');
    await inputs.nth(1).fill('admin123');
    
    await page.locator('button:has-text("Sign In")').click();

    await expect(page.locator('.sidebar, .dashboard, h1:has-text("Dashboard")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to branches and verify context', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    const inputs = page.locator('input');
    await inputs.nth(0).waitFor({ state: 'visible' });
    await inputs.nth(0).fill('admin');
    await inputs.nth(1).fill('admin123');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page.locator('.sidebar').first()).toBeVisible();

    // 2. Navigate to Branches
    await page.goto('/admin/branches');
    await expect(page.locator('h1', { hasText: 'Branch Management' })).toBeVisible();

    // 3. Optional: Add a test branch or at least ensure the table loads
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Check if the add branch button exists
    const addBtn = page.locator('button', { hasText: '+ Add New Branch' });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      const modalInput = page.locator('input[name="name"]');
      await modalInput.fill('Test Branch Playwright');
      await page.locator('button', { hasText: 'Save Branch' }).click();
      await expect(page.locator('text=Test Branch Playwright').first()).toBeVisible();
    }
  });

});
