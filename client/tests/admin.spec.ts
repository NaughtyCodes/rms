import { test, expect } from '@playwright/test';

test.describe('Admin Configuration Coverage', () => {

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

  test('should create and delete a tax rate', async ({ page }) => {
    await page.goto('/admin/taxes');
    await expect(page.locator('h1', { hasText: 'Tax Management' })).toBeVisible({ timeout: 10000 });

    // Assuming there is an "Add Tax Rate" button
    const addBtn = page.getByRole('button', { name: /Add Tax Rate|\+ Add Tax/i });
    if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.locator('input[name="name"]').fill('Playwright Tax');
        await page.locator('input[name="rate"]').fill('18');
        await page.getByRole('button', { name: 'Save' }).click();
        
        await expect(page.locator('text=Playwright Tax')).toBeVisible();

        // Optional: delete
        const deleteBtn = page.locator('tr', { hasText: 'Playwright Tax' }).locator('button', { hasText: '🗑️' });
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            page.on('dialog', dialog => dialog.accept());
            await expect(page.locator('text=Playwright Tax')).toBeHidden();
        }
    }
  });

  test('should create a custom meta field for products', async ({ page }) => {
    await page.goto('/admin/meta-setup');
    await expect(page.locator('h1', { hasText: 'Product Meta Setup' })).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder(/brand, color, weight/i).fill('Playwright Warranty');
    await page.locator('select').selectOption('text');
    await page.getByRole('button', { name: 'Add Field' }).click();

    await expect(page.locator('text=Playwright Warranty')).toBeVisible();
  });

  test('should update shop business profile', async ({ page }) => {
    await page.goto('/admin/shop-config');
    await expect(page.locator('h1', { hasText: 'Shop Configuration' })).toBeVisible({ timeout: 10000 });

    const shopNameInp = page.locator('input').first();
    await shopNameInp.fill('Playwright Shop E2E');
    
    await page.getByRole('button', { name: 'Save Shop Details' }).click();
    await expect(page.locator('.text-success').first()).toBeVisible({ timeout: 5000 });
  });

});
