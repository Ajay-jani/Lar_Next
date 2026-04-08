const { test, expect } = require('@playwright/test')
const { makePdfUpload } = require('./helpers/pdf')

test('tools catalog highlights bulk-ready PDF services and related tools', async ({ page }) => {
  await page.goto('/tools')

  await expect(page.getByText('Bulk PDF Service').first()).toBeVisible()
  const mergerLinks = page.locator('a[href="/tools/pdf-merger"]')
  await expect(mergerLinks.first()).toBeVisible()

  await mergerLinks.first().click()
  await expect(page).toHaveURL(/\/tools\/pdf-merger$/)
  await expect(page.getByText('Related Tools')).toBeVisible()
  await expect(page.getByText('Bulk PDF Service').first()).toBeVisible()
})

test('pdf compressor accepts a .pdf upload even when the MIME type is generic', async ({ page }) => {
  await page.goto('/tools/pdf-compressor')

  await page.locator('input[type="file"]').setInputFiles(
    makePdfUpload('qa-sample.pdf', 'Compression Flow PDF')
  )

  await expect(page.getByText('qa-sample.pdf')).toBeVisible()
  await expect(page.getByLabel(/Download optimized PDF/i)).toBeVisible()
})

test('pdf merger accepts multiple .pdf uploads with generic MIME types', async ({ page }) => {
  await page.goto('/tools/pdf-merger')

  await page.locator('input[type="file"][multiple]').setInputFiles([
    makePdfUpload('alpha.pdf', 'Alpha'),
    makePdfUpload('beta.pdf', 'Beta'),
  ])

  await expect(page.getByText(/PDF Files \(2\)/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'alpha.pdf' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'beta.pdf' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Merge .* from 2 PDFs/i })).toBeEnabled()
})

test('pdf signer creates a signed file with the default typed signature flow', async ({ page }) => {
  await page.goto('/tools/pdf-signer')

  await page.locator('input[type="file"][accept=".pdf,application/pdf"]').setInputFiles(
    makePdfUpload('agreement.pdf', 'Agreement PDF')
  )

  await expect(page.getByText('agreement.pdf')).toBeVisible()
  await page.getByRole('button', { name: 'Sign PDF' }).click()
  await expect(page.getByText('Signed PDF Ready')).toBeVisible()
  await expect(page.getByLabel(/Download signed PDF/i)).toBeVisible()
})
