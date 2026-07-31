import { PostType } from "@/types/post";

interface IconProps {
  className?: string;
}

const base = "stroke-current fill-none";
const strokeProps = {
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
      </g>
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <path d="M12 2h7a1 1 0 0 1 1 1v7l-9.3 9.3a1 1 0 0 1-1.4 0l-6.6-6.6a1 1 0 0 1 0-1.4L12 2Z" />
        <circle cx="15.5" cy="8.5" r="1.4" />
      </g>
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <circle cx="8.5" cy="8" r="3" />
        <circle cx="16.2" cy="9.2" r="2.3" />
        <path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M14.7 14.3c2.5 0.2 4.6 2.2 4.8 5.7" />
      </g>
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-4.3-4.3" />
      </g>
    </svg>
  );
}

export function CheckBadgeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.3 12.5l2.5 2.5 5-5" />
      </g>
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <path className={base} d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <path className={base} d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.4" />
      </g>
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <line x1="4" x2="20" y1="6" y2="6" />
        <circle cx="9" cy="6" r="2" />
        <line x1="4" x2="20" y1="12" y2="12" />
        <circle cx="15" cy="12" r="2" />
        <line x1="4" x2="20" y1="18" y2="18" />
        <circle cx="7" cy="18" r="2" />
      </g>
    </svg>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <rect x="3" y="6" width="18" height="13" rx="2.2" />
        <path d="M3 10h18" />
        <circle cx="16.5" cy="14" r="1.1" />
      </g>
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <path className={base} d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <path d="M4 20V10" />
        <path d="M11 20V4" />
        <path d="M18 20v-7" />
      </g>
    </svg>
  );
}

export function LayersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <path d="M12 3 3 8l9 5 9-5-9-5Z" />
        <path d="M3 12l9 5 9-5" />
        <path d="M3 16l9 5 9-5" />
      </g>
    </svg>
  );
}

// Map control icons — metro/transit lines and the satellite toggle.
export function TransitIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <line x1="4" y1="8" x2="20" y2="8" />
        <line x1="4" y1="16" x2="20" y2="16" />
        <line x1="7" y1="5" x2="7" y2="19" />
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="17" y1="5" x2="17" y2="19" />
      </g>
    </svg>
  );
}

export function SatelliteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <circle cx="12" cy="12" r="6" />
        <ellipse cx="12" cy="12" rx="10" ry="3.8" />
      </g>
    </svg>
  );
}

export function AqiIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <g className={base}>
        <path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5" />
        <path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5" />
        <path d="M3 16h8a2 2 0 1 1-2 2" />
      </g>
    </svg>
  );
}

/**
 * Single source of truth for the per-post-type icon, reused by the legend,
 * the filter dropdown, and (as raw SVG markup) the map markers/popups.
 */
export function PostTypeIcon({ type, className }: { type: PostType; className?: string }) {
  switch (type) {
    case "Rent":
      return <HomeIcon className={className} />;
    case "Sale":
      return <TagIcon className={className} />;
    case "Sharing":
      return <UsersIcon className={className} />;
    case "Rent Paid":
      return <CheckBadgeIcon className={className} />;
  }
}

// Raw SVG inner-markup (path/shape elements only, no wrapping <svg>) for the
// same icon set, used inside Google Maps' HTML-string marker icons and info
// windows where React can't render directly. Keep these visually in sync
// with the
// components above if either changes.
export const POST_TYPE_ICON_MARKUP: Record<PostType, string> = {
  Rent: `<path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />`,
  Sale: `<path d="M12 2h7a1 1 0 0 1 1 1v7l-9.3 9.3a1 1 0 0 1-1.4 0l-6.6-6.6a1 1 0 0 1 0-1.4L12 2Z" /><circle cx="15.5" cy="8.5" r="1.4" />`,
  Sharing: `<circle cx="8.5" cy="8" r="3" /><circle cx="16.2" cy="9.2" r="2.3" /><path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M14.7 14.3c2.5 0.2 4.6 2.2 4.8 5.7" />`,
  "Rent Paid": `<circle cx="12" cy="12" r="9" /><path d="M8.3 12.5l2.5 2.5 5-5" />`,
};
