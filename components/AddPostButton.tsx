import { PlusIcon } from "@/components/icons";

interface AddPostButtonProps {
  onClick: () => void;
}

export default function AddPostButton({ onClick }: AddPostButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-indigo-600 text-white shadow-panel transition hover:scale-105 hover:bg-indigo-500 active:scale-95 sm:h-auto sm:w-auto sm:px-5 sm:py-3"
    >
      <PlusIcon className="h-5 w-5" />
      <span className="hidden text-sm font-semibold sm:inline">Add Post</span>
    </button>
  );
}
