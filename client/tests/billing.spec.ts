import { test, expect } from '@playwright/test';

test.describe('Billing System Flow', () => {

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

  test('should add products to cart and process bill', async ({ page }) => {
    // 1. First create a product to ensure one exists for billing
    await page.goto('/inventory');
    await expect(page.locator('h1', { hasText: 'Inventory' })).toBeVisible({ timeout: 10000 });
    
    // Check if the product already exists to avoid duplicate errors on re-runs
    const searchInputInv = page.locator('input[placeholder="Search products..."]');
    await searchInputInv.fill('Billing Test Rice');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500); // give time to search
    
    // If table has empty state, create it
    const emptyState = page.locator('.empty-state');
    if (await emptyState.isVisible()) {
        await page.locator('button', { hasText: '+ Add Product' }).click();
        await page.locator('input[placeholder="e.g. Basmati Rice 1kg"]').fill('Billing Test Rice');
        const numInputs = page.locator('input[type="number"]');
        await numInputs.nth(0).fill('100'); // Cost
        await numInputs.nth(1).fill('150'); // Selling Price
        await numInputs.nth(2).fill('50');  // Quantity
        await numInputs.nth(3).fill('5');   // Low stock
        await page.getByRole('button', { name: 'Add Product', exact: true }).click();
        await expect(page.locator('text=Billing Test Rice').first()).toBeVisible({ timeout: 5000 });
    }

    // 2. Go to Billing
    await page.goto('/billing');
    await expect(page.locator('h1', { hasText: 'New Bill' })).toBeVisible();

    // The user should have seeded products available. Let's type in the search bar.
    const searchInput = page.locator('input[placeholder*="Search product"]');
    await searchInput.fill('Billing Test');
    
    // Suggestion box should appear
    const suggestionItem = page.locator('.suggestion-item').first();
    await expect(suggestionItem).toBeVisible({ timeout: 5000 });
    await suggestionItem.click();

    // Verify it was added to the cart
    const cartTable = page.locator('.table-wrapper table tbody tr');
    await expect(cartTable.first()).toBeVisible();

    // Total should update (assuming cost > 0).
    const grandTotal = page.locator('.summary-total span').last();
    // Verify it's not "₹0.00"
    await expect(grandTotal).not.toHaveText('₹0.00');

    // Click Create Bill
    await page.locator('button', { hasText: /Create Bill/i }).click();

    // Verification: Receipt should be shown, buttons for Print should appear.
    await expect(page.locator('button', { hasText: /Print Receipt/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tax Invoice')).toBeVisible();
  });

  test('should process bill with UPI payment mode and customer details', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('h1', { hasText: 'Inventory' })).toBeVisible({ timeout: 10000 });
    
    // Check if the product already exists
    const searchInputInv = page.locator('input[placeholder="Search products..."]');
    await searchInputInv.fill('Billing Test Card');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    const emptyState = page.locator('.empty-state');
    if (await emptyState.isVisible()) {
        await page.locator('button', { hasText: '+ Add Product' }).click();
        await page.locator('input[placeholder="e.g. Basmati Rice 1kg"]').fill('Billing Test Card');
        const numInputs = page.locator('input[type="number"]');
        await numInputs.nth(0).fill('100');
        await numInputs.nth(1).fill('150');
        await page.getByRole('button', { name: 'Add Product', exact: true }).click();
    }

    await page.goto('/billing');
    await expect(page.locator('h1', { hasText: 'New Bill' })).toBeVisible();

    const searchInput = page.locator('input[placeholder*="Search product"]');
    await searchInput.fill('Billing Test Card');
    
    const suggestionItem = page.locator('.suggestion-item').first();
    await expect(suggestionItem).toBeVisible({ timeout: 10000 });
    await suggestionItem.click();

    await page.locator('select').first().selectOption('upi');

    await page.locator('input[placeholder="Optional"]').first().fill('Playwright Shopper');
    await page.locator('input[placeholder="Optional"]').last().fill('9876543210');

    await page.locator('button', { hasText: /Create Bill/i }).click();
    
    await expect(page.locator('text=Paid via Upi')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Playwright Shopper')).toBeVisible();
    await expect(page.locator('button', { hasText: /Print Receipt/i })).toBeVisible();
  });

});
