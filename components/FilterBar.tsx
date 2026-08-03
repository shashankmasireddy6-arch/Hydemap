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
    <div className="pointer-events-auto flex w-full flex-col gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-panel backdrop-blur-md sm:w-auto sm:flex-row sm:items-center sm:gap-3">
      {/* Post type dropdown */}
      <div className="flex flex-col gap-1 sm:w-32">
        <label
          htmlFor="post-type"
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
        >
          <SlidersIcon className="h-3 w-3" />
          Post type
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: swatchColor }}
          />
          <select
            id="post-type"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as PostType | "All")}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-6 pr-6 text-xs font-medium text-slate-800 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="All">All types</option>
            {POST_TYPE_CONFIG.map((config) => (
              <option key={config.label} value={config.label}>
                {config.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="hidden h-9 w-px bg-slate-100 sm:block" />

      {/* Budget range slider */}
      <div className="flex flex-col gap-1 sm:w-44">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <WalletIcon className="h-3 w-3" />
            Budget
          </span>
          <span className="whitespace-nowrap rounded-full bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
            {formatCurrency(budget.min)} &ndash; {formatCurrency(budget.max)}
          </span>
        </div>
        <div className="relative flex h-5 items-center">
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
            className="range-thumb pointer-events-none absolute h-5 w-full appearance-none bg-transparent"
          />
          <input
            type="range"
            min={budgetLimits.min}
            max={budgetLimits.max}
            value={budget.max}
            onChange={handleMaxChange}
            className="range-thumb pointer-events-none absolute h-5 w-full appearance-none bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
