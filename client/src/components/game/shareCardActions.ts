import { isIosBuild } from "@/lib/edition";

export const SHARE_CARD_FILE_NAME = "a-dark-cave.png";

export function downloadShareCard(blob: Blob, fileName = SHARE_CARD_FILE_NAME): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function pngBlob(blob: Blob): Blob {
  return blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });
}

export function shareCardFile(blob: Blob, fileName = SHARE_CARD_FILE_NAME): File {
  return new File([pngBlob(blob)], fileName, { type: "image/png" });
}

/**
 * Copy the card as a PNG. The ClipboardItem is built in the tap, before any
 * await. iOS drops image copies that start after the gesture ends.
 */
export function copyShareCard(blob: Promise<Blob | null>): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    return Promise.reject(new Error("Clipboard image copy not supported"));
  }
  const png = blob.then((value) => {
    if (!value) throw new Error("Failed to render share image");
    return pngBlob(value);
  });
  return navigator.clipboard.write([
    new ClipboardItem({
      "image/png": png,
    }),
  ]);
}

function canShareFiles(file: File): boolean {
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Open the system share sheet with the card. The message is the `text`
 * (on iOS that text carries the App Store link). Call this in the tap,
 * with a blob that is already rendered.
 */
export function shareShareCard(blob: Blob, text: string, link?: string): Promise<void> {
  const file = shareCardFile(blob);
  if (canShareFiles(file)) {
    return navigator.share({
      files: [file],
      title: "A Dark Cave",
      text,
    });
  }
  if (typeof navigator.share === "function") {
    return navigator.share({
      title: "A Dark Cave",
      text,
      ...(link ? { url: link } : {}),
    });
  }
  return Promise.reject(new Error("Share is not available"));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read image"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Web: browser download. iOS app: the PNG is added to Photos.
 */
export async function saveShareCard(blob: Blob): Promise<void> {
  if (!isIosBuild) {
    downloadShareCard(blob);
    return;
  }
  const data = await blobToBase64(blob);
  const { Media } = await import("@capacitor-community/media");
  await Media.savePhoto({ path: `data:image/png;base64,${data}` });
}
