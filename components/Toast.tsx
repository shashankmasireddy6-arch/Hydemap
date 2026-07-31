interface ToastProps {
  message: string | null;
}

// Bottom-center, self-contained — the parent owns the timing (see the
// auto-clear effect in app/page.tsx), this just renders whatever message
// it's given or nothing at all.
export default function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
        {message}
      </div>
    </div>
  );
}
