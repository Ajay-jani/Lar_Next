const { test, expect } = require('@playwright/test')

test('mobile navigation opens and links to the tools directory', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Open navigation menu' }).click()

  const mobileNav = page.locator('#mobile-site-nav')
  await expect(mobileNav.getByRole('link', { name: 'All Tools' })).toBeVisible()
  await mobileNav.getByRole('link', { name: 'All Tools' }).click()
  await expect(page).toHaveURL(/\/tools$/)
  await expect(page.getByRole('heading', { name: 'Fast Utilities for Real Work' })).toBeVisible()
})
