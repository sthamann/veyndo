/** Native validation locates the editor control without exposing model diagnostics as product copy. */
import { expect, it } from "vitest";
import { responseError } from "../../src/shared/i18n/errors-i18n";
it.each([
  ["en-GB", "view 2", "block 3"],
  ["de-DE", "Ansicht 2", "Baustein 3"],
  ["fr-FR", "vue 2", "bloc 3"],
  ["es-ES", "vista 2", "bloque 3"],
])("locates unresolved native bindings in %s", (locale, view, block) => {
  localStorage.setItem("rac-locale", locale);
  const error = responseError("Private untrusted model detail", 400, {
    kind: "validation_error",
    pointer: "/views/1/blocks/2/writeAction",
  });
  expect(error.message).toContain(view);
  expect(error.message).toContain(block);
  expect(error.message).not.toContain("Private untrusted");
  expect(error).toMatchObject({ pointer: "/views/1/blocks/2/writeAction" });
  expect(responseError("Unknown detail", 400).message).not.toBe(error.message);
  expect(
    responseError("Unknown detail", 403, {
      kind: "permission_denied",
      pointer: "/views/1/blocks/2/writeAction",
    }).message,
  ).not.toBe(error.message);
});
