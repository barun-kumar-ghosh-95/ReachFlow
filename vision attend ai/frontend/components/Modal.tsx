import Modal from "@/components/Modal";

export default function ModalWrapper({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`w-full bg-white dark:bg-slateish-900 rounded-2xl shadow-card-lg border border-slate-200 dark:border-slateish-800 ${
          wide ? "max-w-3xl" : "max-w-xl"
        } max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slateish-800">
          <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
          <button
            className="btn-ghost !p-2 rounded-lg"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">{children}</div>
      </div>
    </div>
  );
}
