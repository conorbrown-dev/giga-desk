import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Username or email').fill('demo');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('giga-desk-demo');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByRole('link', { name: 'View projects' }).click();

  const projectLink = page.getByRole('link', { name: 'KCDEMO · Keycloak Showcase' });
  if (await projectLink.count() === 0) {
    await page.getByLabel(/Project key/).fill('KCDEMO');
    await page.getByLabel(/Name/).fill('Keycloak Showcase');
    await page.getByLabel(/Description/).fill('Production-shaped identity and project planning demo');
    await page.getByLabel(/Business goal/).fill('Show Ryan a secure, working project and feature workflow');
    await page.getByRole('button', { name: 'Add project' }).click();
  }
  await projectLink.click();

  const featureLink = page.getByRole('link', { name: 'Keycloak production readiness' });
  if (await featureLink.count() === 0) {
    await page.getByLabel(/Title/).fill('Keycloak production readiness');
    await page.getByLabel(/Description/).fill('Prepare and verify the production authentication deployment');
    await page.getByLabel(/Acceptance criteria/).fill('Keycloak login protects project routes\nProjects can be created with a real access token\nFeatures can be added to authenticated projects');
    await page.getByRole('button', { name: 'Add feature' }).click();
  }
  await featureLink.waitFor();
  process.stdout.write('Verified real Keycloak login and persisted KCDEMO Project/Feature flow.\n');
} finally {
  await browser.close();
}
