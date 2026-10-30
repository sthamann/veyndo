/** Configuration freshness is independent of whether a fictional purchase succeeded. */
import { useLocale } from "../../shared/i18n/i18n";
import type { Run } from "./scenario-types";

const labels = {
  current: [
    "Configuration at the start and end matches the current shop.",
    "Die Konfiguration bei Start und Abschluss stimmt mit dem aktuellen Shop überein.",
    "La configuration au début et à la fin correspond à la boutique actuelle.",
    "La configuración al inicio y al final coincide con la tienda actual.",
  ],
  stale: [
    "Your shop has changed since this test. Run these customers again before reviewing publication.",
    "Dein Shop wurde seit diesem Test geändert. Teste diese Kunden vor der Veröffentlichungsprüfung erneut.",
    "Votre boutique a changé depuis ce test. Relancez ces clients avant de vérifier la publication.",
    "Tu tienda cambió después de esta prueba. Repite estos clientes antes de revisar la publicación.",
  ],
  changed_during_run: [
    "The configuration changed during this test. Repeat it against one saved shop version.",
    "Die Konfiguration wurde während des Tests geändert. Wiederhole ihn mit einem gespeicherten Shopstand.",
    "La configuration a changé pendant le test. Répétez-le sur une version enregistrée.",
    "La configuración cambió durante la prueba. Repítela sobre una versión guardada.",
  ],
  unverified: [
    "A complete configuration comparison is unavailable. Review the saved results and check the shop again.",
    "Der vollständige Konfigurationsvergleich ist nicht verfügbar. Die gespeicherten Testergebnisse bleiben erhalten. Prüfe den Shop erneut.",
    "La comparaison complète de configuration est indisponible. Les résultats enregistrés restent accessibles. Vérifiez à nouveau la boutique.",
    "La comparación completa de configuración no está disponible. Los resultados guardados se conservan. Revisa la tienda de nuevo.",
  ],
};

export default function ScenarioEvidence({ run }: { run: Run }) {
  const { locale } = useLocale();
  if (!run.preview?.scenario) return null;
  const status = run.configurationReview ?? "unverified";
  const index =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  return (
    <p
      role="status"
      className={status === "current" ? undefined : "scenario-error"}
    >
      {labels[status][index]}
    </p>
  );
}
