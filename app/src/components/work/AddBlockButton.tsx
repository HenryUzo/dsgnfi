type AddBlockButtonProps = {
  onClick: () => void;
};

export function AddBlockButton({ onClick }: AddBlockButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/80 hover:border-white hover:text-white"
    >
      Add block
    </button>
  );
}
