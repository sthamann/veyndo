# Customer scenario workspace

Owns the private customer cohort editor, native run progress and saved comparisons.
Consumes Studio scope and the registered scenario/task API; it owns no commerce,
identity, inference or publication logic. Reports contain fictional profiles and
native observations, never provider credentials or cart capabilities.

`ScenarioStudio` coordinates scoped requests; `ScenarioReport` renders evidence;
`scenario-types` defines safe projections; `scenario-i18n` supplies EN/DE/FR/ES;
`scenarios.css` owns responsive presentation. Browser coverage and conversion
predictions must not be inferred from these API journeys.
