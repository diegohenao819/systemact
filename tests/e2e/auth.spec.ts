import { expect, test } from "@playwright/test";

test("muestra la portada publica con acciones de autenticacion", async ({
  page,
}) => {
  await page.goto("/");

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
