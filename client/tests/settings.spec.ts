import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Settings and Configuration', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    const inputs = page.locator('input');
    await inputs.nth(0).fill('admin');
    await inputs.nth(1).fill('admin123');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page.locator('.sidebar').first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 10000 });
  });

  test('should update print configurations and upload a logo', async ({ page }) => {
    await page.goto('/admin/print-config');
    await expect(page.locator('h1', { hasText: 'Print & Bill Configuration' })).toBeVisible({ timeout: 10000 });

    // Create a dummy image file if it doesn't exist
    const imagePath = path.join(__dirname, 'test-logo.png');
    if (!fs.existsSync(imagePath)) {
      // 1x1 pixel PNG base64
      const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      fs.writeFileSync(imagePath, Buffer.from(base64Png, 'base64'));
    }

    // Upload logo
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(imagePath);
    
    // Check if image preview is visible
    // The CSS class is .logo-preview-thumb
    const preview = page.locator('.logo-preview-thumb');
    await expect(preview).toBeVisible({ timeout: 10000 });

    // Save Settings
    await page.getByRole('button', { name: 'Save Settings', exact: true }).click();

    // Verify toast or success state
    await expect(page.locator('.text-success').first()).toBeVisible({ timeout: 5000 });
  });

});
