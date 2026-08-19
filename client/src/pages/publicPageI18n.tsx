import { Trans } from "react-i18next";
import {
  REDDIT_URL,
  SITE,
  STEAM_DEMO_URL,
  STEAM_URL,
} from "@shared/publicPages";

export const publicPageLinkClassName = "underline";

export const publicPageLinkComponents = {
  site: <a href={SITE} className={publicPageLinkClassName} />,
  steam: <a href={STEAM_URL} className={publicPageLinkClassName} />,
  demo: <a href={STEAM_DEMO_URL} className={publicPageLinkClassName} />,
  email: <a href="mailto:support@a-dark-cave.com" className={publicPageLinkClassName} />,
  reddit: <a href={REDDIT_URL} className={publicPageLinkClassName} />,
};

export function PublicPageTrans({ i18nKey }: { i18nKey: string }) {
  return (
    <Trans i18nKey={i18nKey} ns="ui" components={publicPageLinkComponents} />
  );
}
