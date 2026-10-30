/** Explicit source attribution; removing it does not change or undo the approved proposal. */
import { useLocale } from "../../shared/i18n/i18n";
export default function ScenarioSource({
  taskId,
  onClear,
}: {
  taskId: string;
  onClear?: () => void;
}) {
  const { locale } = useLocale();
  const index =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  const title = [
    "Testing an applied agent proposal",
    "Übernommenen Agentenvorschlag testen",
    "Tester une proposition appliquée",
    "Probar una propuesta aplicada",
  ][index];
  const clear = [
    "Test without this reference",
    "Ohne diesen Bezug testen",
    "Tester sans cette référence",
    "Probar sin esta referencia",
  ][index];
  return (
    <div className="scenario-source">
      <details>
        <summary>{title}</summary>
        <code>{taskId}</code>
      </details>
      {onClear && (
        <button type="button" className="studio-secondary" onClick={onClear}>
          {clear}
        </button>
      )}
    </div>
  );
}
