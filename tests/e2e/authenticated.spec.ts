import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("flujos autenticados", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    !email || !password,
    "Define E2E_USER_EMAIL y E2E_USER_PASSWORD para correr estos flujos.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(email ?? "");
    await page.getByLabel("Password").fill(password ?? "");
    const submit = page.getByRole("button", { name: /^login$/i });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page).toHaveURL(/\/inicio/);
  });

  test("muestra navegacion principal para un usuario autenticado", async ({
    page,
  }) => {
    await expect(page.getByRole("link", { name: "Bienes" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Transferencias" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Historial" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reportes" })).toBeVisible();
  });

  test("permite descargar el inventario general en Excel", async ({ page }) => {
    await page.goto("/bienes");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: /exportar/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^bienes-\d{8}-\d{4}\.xlsx$/);
  });
});
