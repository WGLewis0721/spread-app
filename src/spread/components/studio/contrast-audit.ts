import type { Page } from "playwright";

export type StudioContrastViolation = {
  text: string;
  element: string;
  reason: "unprotected-wallpaper" | "low-contrast" | "unknown-ink";
  contrast?: number;
};

/**
 * Browser-computed, conservative audit of visible planner text on Studio's live wallpaper.
 * Fail closed on unprotected text: the backdrop behind a loose node must resolve to an
 * opaque ancestor, and its rendered ink must clear WCAG AA. Arbitrary wallpaper pixels
 * are never treated as a safe text background.
 */
export async function auditStudioContrast(page: Page): Promise<StudioContrastViolation[]> {
  return page.evaluate(() => {
    const scope = document.querySelector<HTMLElement>("[data-studio-appearance]");
    if (!scope) return [{ text: "(studio)", element: "body", reason: "unprotected-wallpaper" as const }];
    type Color = { r: number; g: number; b: number; a: number };
    function parse(input: string): Color | null {
      const m = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/.exec(input);
      if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) };
      // Chromium resolves CSS color-mix() to modern color(srgb ...) notation.
      const modern = /^color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\)$/.exec(input);
      if (!modern) return null;
      return { r: 255 * Number(modern[1]), g: 255 * Number(modern[2]), b: 255 * Number(modern[3]), a: modern[4] === undefined ? 1 : Number(modern[4]) };
    }
    function luminance(c: Color) {
      const linear = (n: number) => {
        const x = n / 255;
        return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
    }
    function ratio(a: Color, b: Color) {
      const x = luminance(a), y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    }
    const violations: StudioContrastViolation[] = [];
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (!text) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,svg,[aria-hidden='true'],[inert]")) continue;
      const inkStyle = getComputedStyle(parent);
      if (inkStyle.display === "none" || inkStyle.visibility === "hidden") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > innerHeight
        || rect.right < 0 || rect.left > innerWidth) continue;
      const ink = parse(inkStyle.color);
      const label = parent.tagName.toLowerCase() + (parent.className && typeof parent.className === "string"
        ? "." + parent.className.trim().replace(/\s+/g, ".").slice(0, 100) : "");
      if (!ink || ink.a < 0.995) {
        violations.push({ text: text.slice(0, 75), element: label, reason: "unknown-ink" });
        continue;
      }
      const layers: Color[] = [];
      for (let element: HTMLElement | null = parent; element && scope.contains(element); element = element.parentElement) {
        const style = getComputedStyle(element);
        const color = parse(style.backgroundColor);
        if (color && color.a > 0) layers.push(color);
        if (color && color.a >= 0.995) break;
      }
      if (layers.length === 0) {
        violations.push({ text: text.slice(0, 75), element: label, reason: "unprotected-wallpaper" });
        continue;
      }
      const compose = (base: Color) => layers.slice().reverse().reduce((under, overlay) => ({
        r: overlay.r * overlay.a + under.r * (1 - overlay.a),
        g: overlay.g * overlay.a + under.g * (1 - overlay.a),
        b: overlay.b * overlay.a + under.b * (1 - overlay.a),
        a: 1,
      }), base);
      // If no opaque plate exists, test BOTH black and white photo pixels.
      // A translucent glass card passes only when worst-case contrast clears WCAG AA.
      const contrast = Math.min(
        ratio(ink, compose({ r: 0, g: 0, b: 0, a: 1 })),
        ratio(ink, compose({ r: 255, g: 255, b: 255, a: 1 })),
      );
      if (contrast + 1e-5 < 4.5) {
        violations.push({ text: text.slice(0, 75), element: label, reason: "low-contrast", contrast: Math.round(contrast * 100) / 100 });
      }
    }
    return violations;
  });
}
