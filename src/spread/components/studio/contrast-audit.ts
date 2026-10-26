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
      if (!m) return null;
      return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) };
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
      let bg: Color | null = null;
      for (let element: HTMLElement | null = parent; element && scope.contains(element); element = element.parentElement) {
        const style = getComputedStyle(element);
        const color = parse(style.backgroundColor);
        // A translucent fill over arbitrary wallpaper never guarantees readable text.
        // If a stronger, solid surface is below it, composite the tint over that surface.
        if (color && color.a >= 0.995) {
          bg = color;
          break;
        }
      }
      if (!bg) {
        violations.push({ text: text.slice(0, 75), element: label, reason: "unprotected-wallpaper" });
        continue;
      }
      const contrast = ratio(ink, bg);
      if (contrast + 1e-5 < 4.5) {
        violations.push({ text: text.slice(0, 75), element: label, reason: "low-contrast", contrast: Math.round(contrast * 100) / 100 });
      }
    }
    return violations;
  });
}
