import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Staff login and dashboards', () => {
  test('login page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole('heading', { name: 'Staff Sign In' })).toBeVisible();
  });

  test('OPD quick login → OPD dashboard visible', async ({ page }) => {
    await page.goto(`${BASE}/login?switch=1`);
    await page.getByRole('button', { name: /OPD/i }).click();
    await expect(page).toHaveURL(`${BASE}/dashboard`, { timeout: 15000 });
    await expect(page.getByText(/Billing Counter|Good (Morning|Afternoon|Evening)/i).first()).toBeVisible();
  });

  test('Doctor quick login → doctor dashboard visible', async ({ page }) => {
    await page.goto(`${BASE}/login?switch=1`);
    await page.getByRole('button', { name: /Doctor/i }).click();
    await expect(page).toHaveURL(`${BASE}/doctor/dashboard`, { timeout: 15000 });
    await expect(page.getByText('Doctor')).toBeVisible();
    await expect(page.getByText(/Dashboard|Patients|Prescriptions/i).first()).toBeVisible();
  });

  test('manual OPD credentials redirect to OPD dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('#staff-email').fill('opd@saffocare.local');
    await page.locator('#staff-password').fill('opd123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(`${BASE}/dashboard`, { timeout: 15000 });
    await expect(page.getByText(/Billing Counter|Good (Morning|Afternoon|Evening)/i).first()).toBeVisible();
  });

  test('manual doctor credentials redirect to doctor dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('#staff-email').fill('doctor@saffocare.local');
    await page.locator('#staff-password').fill('doctor123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(`${BASE}/doctor/dashboard`, { timeout: 15000 });
  });
});
