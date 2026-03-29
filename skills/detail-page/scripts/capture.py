#!/usr/bin/env python3
"""HTML to PNG/PDF capture using Playwright headless browser."""
import sys
import argparse
import json
from pathlib import Path


def check_playwright():
    """Check if Playwright is installed."""
    try:
        from playwright.sync_api import sync_playwright
        return True
    except ImportError:
        print(json.dumps({
            "success": False,
            "error": "playwright_not_installed",
            "message": "Playwright가 설치되지 않았습니다. 설치하려면: pip install playwright && playwright install chromium"
        }))
        return False


def capture_html(input_path, output_path, fmt="png", width=1080, height=1080):
    """Capture HTML file as PNG or PDF."""
    from playwright.sync_api import sync_playwright

    input_path = Path(input_path).resolve()
    output_path = Path(output_path).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(f"file://{input_path}")
        page.wait_for_load_state("networkidle")

        if fmt == "png":
            page.screenshot(path=str(output_path), full_page=True, type="png")
        elif fmt == "pdf":
            page.pdf(path=str(output_path), print_background=True)

        browser.close()

    return str(output_path)


def main():
    parser = argparse.ArgumentParser(description="Capture HTML as PNG/PDF")
    parser.add_argument("--input", required=True, help="Path to HTML file")
    parser.add_argument("--output", required=True, help="Output file path")
    parser.add_argument("--format", default="png", choices=["png", "pdf"])
    parser.add_argument("--width", type=int, default=1080)
    parser.add_argument("--height", type=int, default=1080)
    args = parser.parse_args()

    if not check_playwright():
        sys.exit(1)

    input_file = Path(args.input)
    if not input_file.exists():
        print(json.dumps({
            "success": False,
            "error": "file_not_found",
            "message": f"파일을 찾을 수 없습니다: {args.input}"
        }))
        sys.exit(1)

    try:
        result = capture_html(
            args.input, args.output, args.format, args.width, args.height
        )
        print(json.dumps({
            "success": True,
            "output": result,
            "format": args.format
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": "capture_failed",
            "message": str(e)
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
