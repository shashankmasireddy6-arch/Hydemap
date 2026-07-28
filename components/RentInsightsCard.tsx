import { PriceRange } from "@/lib/rentInsights";
import { formatCurrency } from "@/lib/format";
import { ChartIcon } from "@/components/icons";

interface RentInsightsCardProps {
  averageRent: number | null;
  rentPaidRange: PriceRange | null;
}

export default function RentInsightsCard({ averageRent, rentPaidRange }: RentInsightsCardProps) {
  // Nothing to say for the current view — stay out of the way rather than
  // showing an empty card.
  if (averageRent === null && rentPaidRange === null) return null;

  return (
    <div className="pointer-events-auto flex max-w-xs flex-col gap-1 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-panel backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <ChartIcon className="h-3.5 w-3.5" />
        Rent insights
      </div>

      {averageRent !== null && (
        <p className="text-sm text-slate-600">
          Average rent in this area:{" "}
          <span className="font-semibold text-slate-900">{formatCurrency(averageRent)}</span>
        </p>
      )}

      {rentPaidRange !== null && (
        <p className="text-sm text-slate-600">
          People are paying between{" "}
          <span className="font-semibold text-slate-900">
            {formatCurrency(rentPaidRange.min)} – {formatCurrency(rentPaidRange.max)}
          </span>
        </p>
      )}
    </div>
  );
}
