import { Trans } from "react-i18next";
import {
  REDDIT_URL,
  SITE,
  STEAM_DEMO_URL,
  STEAM_URL,
} from "@shared/publicPages";

const linkClassName = "underline";

export const publicPageLinkComponents = {
  site: <a href={SITE} className={linkClassName} />,
  steam: <a href={STEAM_URL} className={linkClassName} />,
  demo: <a href={STEAM_DEMO_URL} className={linkClassName} />,
  email: <a href="mailto:support@a-dark-cave.com" className={linkClassName} />,
  reddit: <a href={REDDIT_URL} className={linkClassName} />,
};

export function PublicPageTrans({ i18nKey }: { i18nKey: string }) {
  return (
    <Trans i18nKey={i18nKey} ns="ui" components={publicPageLinkComponents} />
  );
}
