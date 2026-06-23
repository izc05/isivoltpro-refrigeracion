import { expect, test } from '@playwright/test'

test('navigates core mobile flows', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'IsiVoltPro' })).toBeVisible()
  await page.getByRole('link', { name: /Presión - Temperatura/ }).click()
  await expect(page.getByRole('heading', { name: 'Presión - Temperatura' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Temp. °C' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /Rocío/ })).toBeVisible()
  await page.getByRole('button', { name: 'Calcular' }).click()
  await page.getByRole('link', { name: /Intervenciones/ }).click()
  await expect(page.getByRole('heading', { name: 'Registro de intervenciones' })).toBeVisible()
})
