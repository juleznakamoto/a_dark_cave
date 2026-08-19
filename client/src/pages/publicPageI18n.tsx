import { Trans } from "react-i18next";
import {
  PUBLIC_STEAM_DEMO_URL,
  PUBLIC_STEAM_URL,
  REDDIT_URL,
  SITE,
} from "@shared/publicPages";

export const publicPageLinkClassName = "underline";

const externalLinkProps = {
  className: publicPageLinkClassName,
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

export const publicPageLinkComponents = {
  site: <a href={SITE} className={publicPageLinkClassName} />,
  steam: <a href={PUBLIC_STEAM_URL} {...externalLinkProps} />,
  demo: <a href={PUBLIC_STEAM_DEMO_URL} {...externalLinkProps} />,
  email: (
    <a href="mailto:support@a-dark-cave.com" className={publicPageLinkClassName} />
  ),
  reddit: <a href={REDDIT_URL} {...externalLinkProps} />,
};

export function PublicPageTrans({ i18nKey }: { i18nKey: string }) {
  return (
    <Trans i18nKey={i18nKey} ns="ui" components={publicPageLinkComponents} />
  );
}
