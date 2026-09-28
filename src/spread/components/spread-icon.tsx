const ICONS = {
  "app-icon-spread-cards.svg": "app-icon-spread-cards.svg",
  "icon-add.svg": "icon-add.svg",
  "icon-backup.svg": "icon-backup.svg",
  "icon-check.svg": "icon-check.svg",
  "icon-drag.svg": "icon-drag.svg",
  "icon-edit.svg": "icon-edit.svg",
  "icon-export.svg": "icon-export.svg",
  "icon-month.svg": "icon-month.svg",
  "icon-new-life.svg": "icon-new-life.svg",
  "icon-notes.svg": "icon-notes.svg",
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

const TINTED = new Set<keyof typeof ICONS>([
  "icon-add.svg",
  "icon-backup.svg",
  "icon-check.svg",
  "icon-drag.svg",
  "icon-edit.svg",
  "icon-export.svg",
  "icon-month.svg",
  "icon-notes.svg",
  "icon-outline.svg",
  "icon-palette.svg",
  "icon-photo.svg",
  "icon-print.svg",
  "icon-restore.svg",
  "icon-rollover.svg",
  "icon-settings.svg",
  "icon-share.svg",
  "icon-spread-list.svg",
  "icon-table.svg",
  "icon-week.svg",
]);

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
  const src = `${base}icons/${ICONS[name]}`;
  if (TINTED.has(name)) {
    return (
      <span
        aria-hidden="true"
        className={className ? `inline-block shrink-0 ${className}` : "inline-block shrink-0 text-accent"}
        style={{
          width: size,
          height: size,
          background: "currentColor",
          WebkitMask: `url(${src}) center / contain no-repeat`,
          mask: `url(${src}) center / contain no-repeat`,
        }}
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={className ? `shrink-0 ${className}` : "shrink-0"}
    />
  );
}
