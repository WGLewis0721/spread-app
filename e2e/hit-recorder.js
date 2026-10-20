(() => {
  const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const describe = (el) => {
    const t = el.closest("button,[role=checkbox],[role=tab],[role=option],[role=radio],[role=switch],a,input,textarea,select,label,[role=listitem]") || el;
    const name = t.getAttribute("aria-label") || t.getAttribute("placeholder") || t.innerText || t.textContent || "";
    const holder = el.closest("[role=dialog],[role=alertdialog]");
    let ctx = "";
    if (holder) {
      const label = holder.getAttribute("aria-label") || (holder.getAttribute("aria-labelledby") && document.getElementById(holder.getAttribute("aria-labelledby"))?.textContent) || "";
      ctx = clean(label);
    } else {
      const group = el.closest("[role=list][aria-label],[role=listbox][aria-label],[role=radiogroup][aria-label],[role=region][aria-label],[role=group][aria-label]");
      if (group) ctx = clean(group.getAttribute("aria-label"));
    }
    return `${t.tagName.toLowerCase()}${t.getAttribute("role") ? "[" + t.getAttribute("role") + "]" : ""}|${clean(name)}|ctx=${ctx}`;
  };
  const send = (kind, name) => {
    try {
      window.__hit(kind, name);
    } catch {
      /* the binding is not there yet while the page is still starting */
    }
  };
  document.addEventListener("click", (e) => send("click", describe(e.target)), true);
  document.addEventListener("change", (e) => send("change", describe(e.target)), true);
  let timer = 0;
  document.addEventListener(
    "input",
    (e) => {
      const target = e.target;
      clearTimeout(timer);
      timer = setTimeout(() => send("input", describe(target)), 150);
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Enter", "Tab"].includes(e.key)) send("key", `${e.key}|${describe(e.target)}`);
  }, true);
  document.addEventListener("wheel", () => send("wheel", "window"), { capture: true, passive: true });
  let drag = null;
  document.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest("[data-drag]");
    drag = handle ? { name: describe(handle), x: e.clientX, y: e.clientY, moved: false } : null;
  }, true);
  document.addEventListener("pointermove", (e) => {
    if (drag && !drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12) drag.moved = true;
  }, true);
  document.addEventListener("pointerup", () => {
    if (drag && drag.moved) send("drag", drag.name);
    drag = null;
  }, true);
  let touch = null;
  document.addEventListener("touchstart", (e) => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { capture: true, passive: true });
  document.addEventListener("touchend", (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    if (Math.abs(t.clientX - touch.x) > 40 && Math.abs(t.clientX - touch.x) > Math.abs(t.clientY - touch.y)) send("swipe", "window");
    touch = null;
  }, { capture: true, passive: true });
})();
