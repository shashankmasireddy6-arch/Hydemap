import { MapPinIcon } from "@/components/icons";

interface PickLocationBannerProps {
  onCancel: () => void;
}

export default function PickLocationBanner({ onCancel }: PickLocationBannerProps) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-panel sm:gap-3">
      <MapPinIcon className="h-4 w-4 shrink-0 text-indigo-300" />
      <span className="hidden sm:inline">Click anywhere on the map to set the pin</span>
      <span className="sm:hidden">Tap the map to set the pin</span>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold transition hover:bg-white/20"
      >
        Cancel
      </button>
    </div>
  );
}
