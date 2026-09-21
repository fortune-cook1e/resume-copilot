import { expect, test } from '@playwright/test';

test('the preserved homepage loads from the web workspace', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Resume Copilot/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your story.');
  await expect(page.getByRole('link', { name: 'Open workspace' })).toHaveAttribute(
    'href',
    '/dashboard/resumes',
  );
});
