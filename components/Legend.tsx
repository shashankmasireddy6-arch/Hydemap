import { POST_TYPE_CONFIG } from "@/types/post";
import { PostTypeIcon } from "@/components/icons";

export default function Legend() {
  return (
    <div className="pointer-events-auto max-w-[calc(100vw-3rem)] rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-panel backdrop-blur-md sm:p-4">
      <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:block">
        Legend
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 sm:flex-col sm:gap-y-1.5">
        {POST_TYPE_CONFIG.map((config) => (
          <li key={config.label} className="flex items-center gap-2 text-sm text-slate-700">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: config.color }}
            >
              <PostTypeIcon type={config.label} className="h-3 w-3 text-white" />
            </span>
            {/* Labels collapse away on very small screens; the colored icon
                badge alone still communicates the category. */}
            <span className="hidden sm:inline">{config.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
