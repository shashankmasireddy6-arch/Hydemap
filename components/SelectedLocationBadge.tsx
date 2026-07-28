import { CloseIcon, MapPinIcon } from "@/components/icons";

interface SelectedLocationBadgeProps {
  latitude: number;
  longitude: number;
  onAddPost: () => void;
  onClear: () => void;
}

export default function SelectedLocationBadge({
  latitude,
  longitude,
  onAddPost,
  onClear,
}: SelectedLocationBadgeProps) {
  return (
    <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-slate-100 bg-white/95 px-3 py-1.5 text-sm text-slate-700 shadow-panel backdrop-blur-md sm:gap-3 sm:px-4 sm:py-2">
      <MapPinIcon className="h-4 w-4 shrink-0 text-indigo-600" />
      <span className="truncate text-slate-500">
        {latitude.toFixed(4)}, {longitude.toFixed(4)}
      </span>
      <button
        type="button"
        onClick={onAddPost}
        className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500"
      >
        Add post here
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selected location"
        className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
