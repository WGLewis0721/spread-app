const ICONS = {
  "app-icon-spread-cards.svg": "app-icon-spread-cards.svg",
  "icon-add.svg": "icon-add.svg",
  "icon-backup.svg": "icon-backup.svg",
  "icon-check.svg": "icon-check.svg",
  "icon-drag.svg": "icon-drag.svg",
  "icon-edit.svg": "icon-edit.svg",
  "icon-export.svg": "icon-export.svg",
  "icon-new-life.svg": "icon-new-life.svg",
  "icon-outline.svg": "icon-outline.svg",
  "icon-palette.svg": "icon-palette.svg",
  "icon-photo.svg": "icon-photo.svg",
  "icon-print.svg": "icon-print.svg",
  "icon-restore.svg": "icon-restore.svg",
  "icon-rollover.svg": "icon-rollover.svg",
  "icon-settings.svg": "icon-settings.svg",
  "icon-share.svg": "icon-share.svg",
  "icon-spread-list.svg": "icon-spread-list.svg",
  "icon-table.svg": "icon-table.svg",
  "icon-trash.svg": "icon-trash.svg",
  "icon-week.svg": "icon-week.svg",
} as const;

export function SpreadIcon({
  name,
  size,
  className,
}: {
  name: keyof typeof ICONS;
  size: number;
  className?: string;
}) {
  const base = import.meta.env.BASE_URL || "/";
  return (
    <img
      src={`${base}icons/${ICONS[name]}`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={className ? `shrink-0 ${className}` : "shrink-0"}
    />
  );
}
