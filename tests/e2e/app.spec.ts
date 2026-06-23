import { expect, test } from '@playwright/test'

test('navigates core mobile flows', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'IsiVoltPro' })).toBeVisible()
  await page.getByRole('link', { name: /Presión - Temperatura/ }).click()
  await expect(page.getByRole('heading', { name: 'Presión - Temperatura' })).toBeVisible()
  await page.getByRole('button', { name: 'Calcular' }).click()
  await expect(page.locator('.result, .empty-table').filter({ hasText: /No hay suficientes datos|Tabla pendiente/ }).first()).toBeVisible()
  await page.getByRole('link', { name: /Intervenciones/ }).click()
  await expect(page.getByRole('heading', { name: 'Registro de intervenciones' })).toBeVisible()
})
