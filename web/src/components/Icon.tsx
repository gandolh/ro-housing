const PATHS = {
  chevron: <path d="M6 9l6 6 6-6" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  warn: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5" />
      <path d="M12 18v.01" />
    </>
  ),
  xcircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  check: <path d="M5 12l5 5 9-10" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" />
      <circle cx="9" cy="10" r="2" />
      <path d="M3 18l6-5 4 3 3-2 5 4" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1-5L16 4l4 4L9 19z" />
      <path d="M14 6l4 4" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  rss: (
    <>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </>
  ),
  ring: <circle cx="12" cy="12" r="6" />,
  dot: <circle cx="12" cy="12" r="12" />,
};

export type IconName = keyof typeof PATHS;

/** A 24-unit line icon in the current colour. `fill` fills it (a saved bookmark, the `new` dot). Decorative:
 *  the control around it carries the name. */
export function Icon({
  name,
  size = 16,
  fill = false,
  className,
}: {
  name: IconName;
  size?: number;
  fill?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "shrink-0"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={name === "ring" ? 3 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
