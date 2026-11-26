import { Link } from "react-router-dom";
import { ChevronRightIcon } from "./Icons";

// Section title row used across storefront pages: title (+ optional count/badge) and a quiet "See all".
export default function SectionHeader({ title, badge, linkTo, linkLabel = "See all", as: Tag = "h2" }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Tag className="truncate text-base font-semibold tracking-tight text-navy-950 sm:text-lg">{title}</Tag>
        {badge}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="group inline-flex shrink-0 items-center gap-0.5 rounded-lg py-1 text-sm font-medium text-brand-700 transition-colors hover:text-brand-600"
        >
          {linkLabel}
          <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
