import { expect, test } from "@playwright/test";

test("muestra la portada publica con acciones de autenticacion", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Sistema de inventario Conviventia/);
  await expect(
    page.getByRole("heading", { name: "Sistema de inventario Conviventia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /systemact conviventia/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Iniciar sesión" }).first(),
  ).toHaveAttribute("href", "/auth/login");
  await expect(
    page.getByRole("link", { name: "Registrarse" }),
  ).toHaveAttribute("href", "/auth/sign-up");
});

test("expone metadatos SEO publicos basicos", async ({ page, request }) => {
  await page.goto("/");

  await expect(
    page.locator('meta[name="description"]'),
  ).toHaveAttribute("content", /sistema interno de inventario/i);
  await expect(
    page.locator('meta[property="og:title"]'),
  ).toHaveAttribute("content", /SYSTEMACT/i);

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("<urlset");
});

test("redirige rutas protegidas al login cuando no hay sesion", async ({
  page,
}) => {
  await page.goto("/inicio");

  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});

test("protege las descargas de Excel sin sesion", async ({ page }) => {
  await page.goto("/api/export/bienes");

  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});
