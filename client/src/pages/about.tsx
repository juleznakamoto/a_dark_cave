import { ABOUT_LINKS } from "@shared/publicPages";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import PublicDocPage from "@/pages/publicDocPage";
import { PublicPageTrans } from "@/pages/publicPageI18n";

const ABOUT_LINK_KEYS = ["support", "reddit", "steam", "itch"] as const;

export default function About() {
  const { t } = useUiTranslation();
  return (
    <PublicDocPage path="/about" heading={t("publicPages.aboutHeading")}>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.p1" />
      </p>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.p2" />
      </p>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.p3" />
      </p>
      <ul>
        {ABOUT_LINKS.map((link, index) => (
          <li key={link.href}>
            <a href={link.href}>{t(`publicPages.about.${ABOUT_LINK_KEYS[index]}`)}</a>
          </li>
        ))}
      </ul>
    </PublicDocPage>
  );
}
