import { useUiTranslation } from "@/i18n/useUiTranslation";

/** Shop and New Game share this Cruel Mode summary. */
export function CruelModeEffectsList() {
  const { t } = useUiTranslation();
  const lines = [
    t("shop.cruelMode.moreEvents"),
    t("shop.cruelMode.moreItems"),
    t("shop.cruelMode.strongerEnemies"),
    t("shop.cruelMode.harderChallenges"),
    t("shop.cruelMode.reusePurchases"),
  ];
  return (
    <div className="space-y-0.5 text-xs">
      {lines.map((line) => (
        <div key={line}>• {line}</div>
      ))}
    </div>
  );
}
