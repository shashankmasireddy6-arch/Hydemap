import { Property } from "@/types/post";
import { PropertyMatch } from "@/lib/matching";
import { formatCurrency } from "@/lib/format";
import { CloseIcon, HomeIcon } from "@/components/icons";

interface MatchesPanelProps {
  requirement: Property;
  matches: PropertyMatch[];
  onClose: () => void;
  onSelectMatch: (match: PropertyMatch) => void;
}

const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

export default function MatchesPanel({ requirement, matches, onClose, onSelectMatch }: MatchesPanelProps) {
  const count = matches.length;
  const countLabel = count === 1 ? "1 matching property found" : `${count} matching properties found`;

  return (
    <div className="pointer-events-auto flex w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/95 shadow-panel backdrop-blur-md">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{countLabel}</p>
          <p className="truncate text-xs text-slate-500">for &ldquo;{requirement.title}&rdquo;</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {count === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-500">
          No nearby Rent posts within budget yet. Check back as more posts are added.
        </p>
      ) : (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {matches.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                onClick={() => onSelectMatch(match)}
                className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <HomeIcon className="h-3.5 w-3.5 text-green-600" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{match.title}</span>
                  <span className="block text-xs text-slate-500">
                    {formatCurrency(match.price)} · {formatDistance(match.distanceKm)} away
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
