"""Generate favicon, PWA, OG, and Electron icons from the source logo PNG."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "build-resources" / "logo-source.png"

logo = Image.open(SOURCE).convert("RGB")
resample = Image.Resampling.LANCZOS


def save_square(path: Path, size: int) -> None:
    resized = logo.resize((size, size), resample)
    path.parent.mkdir(parents=True, exist_ok=True)
    resized.save(path, optimize=True)
    print(f"Wrote {path} ({size}x{size})")


def save_og_image(path: Path, width: int, height: int, logo_size: int) -> None:
    canvas = Image.new("RGB", (width, height), (0, 0, 0))
    resized = logo.resize((logo_size, logo_size), resample)
    x = (width - logo_size) // 2
    y = (height - logo_size) // 2
    canvas.paste(resized, (x, y))
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path, optimize=True)
    print(f"Wrote {path} ({width}x{height}, logo {logo_size})")


def main() -> None:
    public = ROOT / "client" / "public"
    build = ROOT / "build-resources"

    for size in (16, 32, 48):
        save_square(public / f"favicon-{size}x{size}.png", size)

    save_square(public / "apple-touch-icon.png", 180)
    save_square(public / "pwa-192x192.png", 192)
    save_square(public / "pwa-512x512.png", 512)
    save_square(public / "og-image.png", 500)
    save_square(build / "icon.png", 512)
    save_og_image(public / "og-image-1200x630.png", 1200, 630, 500)

    ico_sizes = [16, 32, 48, 64, 128, 256]
    ico_images = [logo.resize((s, s), resample) for s in ico_sizes]
    for ico_path in (public / "favicon.ico", build / "icon.ico"):
        ico_images[0].save(
            ico_path,
            format="ICO",
            sizes=[(s, s) for s in ico_sizes],
            append_images=ico_images[1:],
        )
        print(f"Wrote {ico_path}")

    print("Done.")


if __name__ == "__main__":
    main()
