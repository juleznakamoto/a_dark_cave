import fs from "fs";
import path from "path";
import {
  customizeSpaIndexHtml,
  isStaticAssetPath,
  resolveSpaHtmlResponse,
} from "@shared/publicSeo";

export function sendSpaIndexHtml(
  res: {
    status: (code: number) => typeof res;
    setHeader: (name: string, value: string) => void;
    send: (body: string) => void;
  },
  indexHtml: string,
  pathname: string,
): void {
  const { status, notFound } = resolveSpaHtmlResponse(pathname);
  const html = customizeSpaIndexHtml(indexHtml, pathname, { notFound });
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.send(html);
}

export function readIndexHtmlFile(indexPath: string): string {
  return fs.readFileSync(indexPath, "utf-8");
}

export { isStaticAssetPath, customizeSpaIndexHtml, resolveSpaHtmlResponse };
