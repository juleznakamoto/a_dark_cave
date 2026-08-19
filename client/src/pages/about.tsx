import { ABOUT_NAV_LINKS } from "@shared/publicPages";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import PublicDocPage from "@/pages/publicDocPage";
import {
  PublicPageTrans,
  publicPageLinkClassName,
} from "@/pages/publicPageI18n";

export default function About() {
  const { t } = useUiTranslation();
  return (
    <PublicDocPage path="/about" heading={t("publicPages.aboutHeading")}>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.intro1" />
      </p>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.intro2" />
      </p>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.intro3" />
      </p>
      <h2>{t("publicPages.about.howHeading")}</h2>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.how1" />
      </p>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.how2" />
      </p>
      <h2>{t("publicPages.about.likedHeading")}</h2>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.liked1" />
      </p>
      <h2>{t("publicPages.about.whoHeading")}</h2>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.who1" />
      </p>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.who2" />
      </p>
      <h2>{t("publicPages.about.platformsHeading")}</h2>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.platforms1" />
      </p>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.platforms2" />
      </p>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.platforms3" />
      </p>
      <h2>{t("publicPages.about.meHeading")}</h2>
      <p>
        <PublicPageTrans i18nKey="publicPages.about.me1" />
      </p>
      <p>
        {ABOUT_NAV_LINKS.map((link, index) => (
          <span key={link.id}>
            {index > 0 ? " · " : null}
            <a href={link.href} className={publicPageLinkClassName}>
              {t(`publicPages.about.${link.id}`)}
            </a>
          </span>
        ))}
      </p>
    </PublicDocPage>
  );
}
