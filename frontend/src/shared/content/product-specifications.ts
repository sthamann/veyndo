/** Match the native field-level specification merge; explicit blanks survive and no unrelated English fallback is invented. */
export type SpecificationMap = Record<
  string,
  Record<string, string> | undefined
>;
export function productSpecifications(
  map: SpecificationMap = {},
  language: string,
  main = language,
) {
  return Object.fromEntries(
    [main.split("-")[0], main, language.split("-")[0], language].flatMap(
      (key) => Object.entries(map[key] ?? {}),
    ),
  );
}
