import { useEffect } from "react";

export function useBrowserFrame() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      root.style.setProperty("--browser-bottom", `${covered}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--browser-bottom");
    };
  }, []);

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      const node = event.target;
      if (!(node instanceof HTMLElement)) return;
      if (!node.closest(".sheet, form")) return;
      if (node.tagName !== "INPUT" && node.tagName !== "TEXTAREA") return;
      window.setTimeout(() => {
        node.scrollIntoView({ block: "nearest", inline: "nearest" });
      }, 280);
    }
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
}

export function useLockPageScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
