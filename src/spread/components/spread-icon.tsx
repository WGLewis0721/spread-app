const ICONS = {
  "app-icon-spread-cards.svg": "app-icon-spread-cards.svg",
  "icon-settings.svg": "icon-settings.svg",
  "icon-edit.svg": "icon-edit.svg",
  "icon-share.svg": "icon-share.svg",
  "icon-trash.svg": "icon-trash.svg",
  "icon-new-life.svg": "icon-new-life.svg",
} as const;

export function SpreadIcon({ name, size }: { name: keyof typeof ICONS; size: number }) {
  const base = import.meta.env.BASE_URL || "/";
  return (
    <img
      src={`${base}icons/${ICONS[name]}`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className="shrink-0"
    />
  );
}
