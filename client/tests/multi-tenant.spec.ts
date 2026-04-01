import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Lifecycle and Dynamic Schema Tests', () => {

  const timestamp = Date.now();
  const tenantName = `Playwright E2E Shop ${timestamp}`;
  const tenantSlug = `pw-shop-${timestamp}`;
  const adminUser = `pwadmin_${timestamp}`;
  const adminPass = 'securepw123';
  const customFieldName = `Dynamic Warranty ${timestamp}`;

  test('should verify dynamic tenant schema creation and cleanup isolation', async ({ page }) => {
    // ----------------------------------------------------
    // PHASE 1: SuperAdmin creates the isolated Tenant Space
    // ----------------------------------------------------
    await page.goto('/');
    const inputs = page.locator('input');
    await inputs.nth(0).fill('admin');
    await inputs.nth(1).fill('admin123');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 10000 });

    await page.goto('/superadmin/tenants');
    await expect(page.locator('h1', { hasText: 'Tenant Management' })).toBeVisible({ timeout: 10000 });
    
    // Open create modal
    await page.getByRole('button', { name: /\+ New Tenant/i }).click();

    // Fill form
    await page.locator('input[name="name"]').fill(tenantName);
    await page.locator('input[name="slug"]').fill(tenantSlug);
    await page.locator('input[name="adminUsername"]').fill(adminUser);
    await page.locator('input[name="adminPassword"]').fill(adminPass);
    await page.getByRole('button', { name: 'Save Tenant' }).click();

    // Verify creation in UI
    await expect(page.locator('h3', { hasText: tenantName })).toBeVisible({ timeout: 10000 });

    // Log out SuperAdmin
    await page.locator('.logout-btn').click();
    await expect(page).toHaveURL(/.*\/login/);

    // ----------------------------------------------------
    // PHASE 2: New Tenant Logs In and Dynamically Creates Schema
    // ----------------------------------------------------
    await inputs.nth(0).fill(adminUser);
    await inputs.nth(1).fill(adminPass);
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 10000 });

    // Validate we are isolated and logged in
    await expect(page.locator('.user-role').first()).toContainText('admin');

    // Dynamically insert schema (A new product meta field)
    await page.goto('/admin/meta-setup');
    await expect(page.locator('h1', { hasText: 'Product Meta Setup' })).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder(/e.g. brand, color, weight/i).fill(customFieldName);
    await page.locator('select[name="type"]').selectOption('text');
    await page.getByRole('button', { name: 'Add Field' }).click();

    await expect(page.locator('td', { hasText: customFieldName })).toBeVisible({ timeout: 10000 });

    // Dynamically delete the schema
    const deleteBtn = page.locator('tr', { hasText: customFieldName }).locator('.btn-delete');
    if (await deleteBtn.isVisible()) {
        page.on('dialog', dialog => dialog.accept());
        await deleteBtn.click();
        await expect(page.locator('td', { hasText: customFieldName })).toBeHidden({ timeout: 10000 });
    }

    // Log out isolated tenant admin
    await page.locator('.logout-btn').click();
    await expect(page).toHaveURL(/.*\/login/);

    // ----------------------------------------------------
    // PHASE 3: SuperAdmin Dynamically Dismantles Tenant Space
    // ----------------------------------------------------
    await inputs.nth(0).fill('admin');
    await inputs.nth(1).fill('admin123');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 10000 });

    await page.goto('/superadmin/tenants');

    // Locate the specific tenant card and orchestrate dynamic deletion
    const tenantCard = page.locator('.tenant-card', { hasText: tenantName });
    await expect(tenantCard).toBeVisible({ timeout: 10000 });

    page.on('dialog', dialog => dialog.accept());
    await tenantCard.locator('.btn-delete').click();

    // Verify completely purged from the workspace view
    await expect(tenantCard).toBeHidden({ timeout: 10000 });
  });

});
