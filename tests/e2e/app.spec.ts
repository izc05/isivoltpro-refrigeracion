import { expect, test } from '@playwright/test'

test('navigates core mobile flows', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'IsiVoltPro' })).toBeVisible()
  await page.getByRole('link', { name: /Presión - Temperatura/ }).click()
  await expect(page.getByRole('heading', { name: 'Presión - Temperatura' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Temp. °C' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /Rocío/ })).toBeVisible()
  await page.getByRole('button', { name: 'Calcular' }).click()
  await expect(page.getByText('PRESIÓN MEDIDA')).toBeVisible()
  await expect(page.getByText('9,00 bar(g)')).toBeVisible()
  await expect(page.getByText('6,67 °C')).toBeVisible()
  await expect(page.getByText('≈ 8,50 bar(g)')).toBeVisible()
  await expect(page.getByText('Para mezclas zeotrópicas')).toHaveCount(0)
  await page.getByRole('link', { name: /Intervenciones/ }).click()
  await expect(page.getByRole('heading', { name: 'Registro de intervenciones' })).toBeVisible()
})
