import { LayersIcon } from "@/components/icons";

interface ResultsCountProps {
  visible: number;
  total: number;
}

export default function ResultsCount({ visible, total }: ResultsCountProps) {
  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-slate-100 bg-white/95 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-panel backdrop-blur-md sm:px-4">
      <LayersIcon className="h-3.5 w-3.5 text-slate-400" />
      <span>
        <span className="font-semibold text-slate-900">{visible}</span>
        <span className="hidden sm:inline"> of {total} posts</span>
        <span className="sm:hidden">/{total}</span>
      </span>
    </div>
  );
}
