/** Shared customer-test entry; installing/saving a draft remains the owning workspace's action. */
import Icon from "../../shared/ui/Icon";
import { canTestCustomers } from "./scenario-access";
import { useScenarioText } from "./scenario-i18n";
export default function ScenarioLaunch({
  rights,
  disabled,
  onClick,
}: {
  rights: string[];
  disabled?: boolean;
  onClick: () => void;
}) {
  const t = useScenarioText();
  return canTestCustomers(rights) ? (
    <button className="studio-secondary" disabled={disabled} onClick={onClick}>
      <Icon name="people" />
      {t("title")}
    </button>
  ) : null;
}
