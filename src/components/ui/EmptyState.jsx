import { Link } from "react-router-dom";

// Calm empty/zero-result block: icon in a soft circle, one line of title, one of help, one action.
export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction, className = "" }) {
  const actionClass =
    "mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-navy-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-900 active:scale-[0.98]";
  return (
    <div className={`bc-rise-in flex flex-col items-center px-6 py-14 text-center ${className}`}>
      {Icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <h2 className="text-base font-semibold text-navy-950">{title}</h2>
      {description && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className={actionClass}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && !actionTo && onAction && (
        <button type="button" onClick={onAction} className={actionClass}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
