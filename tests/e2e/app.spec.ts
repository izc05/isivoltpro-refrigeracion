import { expect, test } from '@playwright/test'

test('navigates core mobile flows', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Refrigeración' })).toBeVisible()
  await page.getByRole('link', { name: /Presión-Temperatura/ }).click()
  await expect(page.getByRole('heading', { name: 'Presión-Temperatura' })).toBeVisible()
  await page.getByRole('button', { name: 'Calcular' }).click()
  await expect(page.locator('.result').filter({ hasText: 'No hay suficientes datos' })).toBeVisible()
  await page.getByRole('link', { name: /Intervenciones/ }).click()
  await expect(page.getByRole('heading', { name: 'Intervenciones' })).toBeVisible()
})
