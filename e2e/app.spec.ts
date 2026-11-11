import { expect, test } from '@playwright/test';

test('abre el formulario de registro de candidatos', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/registro$/);
  await expect(page.getByRole('heading', { name: 'Nuevo talento' })).toBeVisible();
});
