import { expect, test } from "@playwright/test";

/**
 * Installing the game to a home screen is what removes the browser's address bar from play
 * altogether (manifest.ts). None of it is visible in the running app, so a broken manifest or a
 * missing icon would go unnoticed until someone tried to install it.
 */
test("is linked, installable, and its icons resolve", async ({
  page,
  request,
}) => {
  await page.goto("/");

  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();

  // standalone is the whole point: an installed game has no address bar to appear mid-gesture.
  expect(manifest.display).toBe("standalone");
  expect(manifest.name).toBe("Betapet");
  expect(manifest.start_url).toBe("/");

  // Android needs a maskable icon to avoid cropping the artwork into a default badge.
  expect(
    manifest.icons.some((icon: { purpose?: string }) =>
      icon.purpose?.includes("maskable"),
    ),
  ).toBe(true);

  for (const icon of manifest.icons as { src: string }[]) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok(), `${icon.src} should be served`).toBe(true);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }
});

test("declares itself installable to iOS as well", async ({ page }) => {
  await page.goto("/");

  // iOS ignores the manifest's display mode and reads this instead.
  await expect(
    page.locator('meta[name="mobile-web-app-capable"]'),
  ).toHaveAttribute("content", "yes");
});
