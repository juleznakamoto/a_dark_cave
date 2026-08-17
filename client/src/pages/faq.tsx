import { FAQ_ITEM_IDS } from "@shared/publicPages";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import PublicDocPage from "@/pages/publicDocPage";
import { PublicPageTrans } from "@/pages/publicPageI18n";

export default function Faq() {
  const { t } = useUiTranslation();
  return (
    <PublicDocPage path="/faq" heading={t("publicPages.faqHeading")}>
      {FAQ_ITEM_IDS.map((id) => (
        <section key={id}>
          <h2>{t(`publicPages.faq.${id}.q`)}</h2>
          <p>
            <PublicPageTrans i18nKey={`publicPages.faq.${id}.a`} />
          </p>
        </section>
      ))}
    </PublicDocPage>
  );
}
