"use client";

import { PostType, POST_TYPE_CONFIG, getPostColor } from "@/types/post";
import { ChevronDownIcon, SlidersIcon, WalletIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";

export interface BudgetRange {
  min: number;
  max: number;
}

interface FilterBarProps {
  selectedType: PostType | "All";
  onTypeChange: (type: PostType | "All") => void;
  budget: BudgetRange;
  onBudgetChange: (budget: BudgetRange) => void;
  budgetLimits: BudgetRange;
}

export default function FilterBar({
  selectedType,
  onTypeChange,
  budget,
  onBudgetChange,
  budgetLimits,
}: FilterBarProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), budget.max);
    onBudgetChange({ ...budget, min: value });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), budget.min);
    onBudgetChange({ ...budget, max: value });
  };

  const swatchColor = selectedType === "All" ? "#94a3b8" : getPostColor(selectedType);

  return (
    <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-panel backdrop-blur-md sm:flex-row sm:items-center sm:gap-5 sm:p-4">
      {/* Post type dropdown */}
      <div className="flex flex-col gap-1.5 sm:w-48">
        <label
          htmlFor="post-type"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
        >
          <SlidersIcon className="h-3.5 w-3.5" />
          Post type
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: swatchColor }}
          />
          <select
            id="post-type"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as PostType | "All")}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-8 text-sm font-medium text-slate-800 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="All">All types</option>
            {POST_TYPE_CONFIG.map((config) => (
              <option key={config.label} value={config.label}>
                {config.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="hidden h-10 w-px bg-slate-100 sm:block" />

      {/* Budget range slider */}
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <WalletIcon className="h-3.5 w-3.5" />
            Budget
          </span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            {formatCurrency(budget.min)} &ndash; {formatCurrency(budget.max)}
          </span>
        </div>
        <div className="relative flex h-6 items-center">
          <div className="absolute h-1 w-full rounded-full bg-slate-200" />
          <div
            className="absolute h-1 rounded-full bg-indigo-600"
            style={{
              left: `${((budget.min - budgetLimits.min) / (budgetLimits.max - budgetLimits.min)) * 100}%`,
              right: `${100 - ((budget.max - budgetLimits.min) / (budgetLimits.max - budgetLimits.min)) * 100}%`,
            }}
          />
          <input
            type="range"
            min={budgetLimits.min}
            max={budgetLimits.max}
            value={budget.min}
            onChange={handleMinChange}
            className="range-thumb pointer-events-none absolute h-6 w-full appearance-none bg-transparent"
          />
          <input
            type="range"
            min={budgetLimits.min}
            max={budgetLimits.max}
            value={budget.max}
            onChange={handleMaxChange}
            className="range-thumb pointer-events-none absolute h-6 w-full appearance-none bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
