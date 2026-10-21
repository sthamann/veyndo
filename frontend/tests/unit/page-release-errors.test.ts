/** Missing release dependencies expose recovery instructions without leaking arbitrary diagnostics. */
import { expect, it } from "vitest";
import { responseError } from "../../src/shared/i18n/errors-i18n";

it.each([
  ["en-GB", "same publication"],
  ["de-DE", "dieselbe Veröffentlichung"],
  ["fr-FR", "même publication"],
  ["es-ES", "misma publicación"],
])("explains page dependencies in %s", (locale, recovery) => {
  localStorage.setItem("rac-locale", locale);
  for (const diagnostic of [
    "Page translation language is not enabled for this shop",
    "Page channel does not belong to this shop",
  ]) {
    const error = responseError(diagnostic, 400);
    expect(error.message).toContain(recovery);
    expect(error).toMatchObject({ diagnostic, status: 400 });
  }
  expect(
    responseError("private-value@example.test", 400).message,
  ).not.toContain("private-value@example.test");
});
