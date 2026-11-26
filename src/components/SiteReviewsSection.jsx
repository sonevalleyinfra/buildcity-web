import { ClockIcon, PackageIcon, StarIcon } from "./ui/Icons";

const DEMO_REVIEWS = [
  {
    id: "rev-1",
    name: "Rajesh Verma",
    role: "Civil Contractor, Shivpur",
    initials: "RV",
    rating: 5,
    materialTag: "50 Bags UltraTech Cement",
    quote:
      "Subah 8 baje order place kiya tha, 11:30 baje site par gaadi khadi thi. Market se rate bhi sasta mila aur material 100% genuine tha.",
    speedBadge: "Delivered in 3.5 Hours",
    verified: true,
    bgGradient: "from-amber-500/10 via-orange-500/5 to-transparent",
  },
  {
    id: "rev-2",
    name: "Er. Amit Singh",
    role: "Site Engineer, DLW Road",
    initials: "AS",
    rating: 5,
    materialTag: "2.5 Tons Tata Tiscon 550D",
    quote:
      "Foundation casting ke liye emergency steel chahiye tha. Test certificate ke saath exact weight par site delivery mili. Full transparency!",
    speedBadge: "Delivered in 6 Hours",
    verified: true,
    bgGradient: "from-blue-500/10 via-sky-500/5 to-transparent",
  },
  {
    id: "rev-3",
    name: "Manoj Yadav",
    role: "Developer, Sigra Colony",
    initials: "MY",
    rating: 5,
    materialTag: "120 Bags Birla A1 Cement",
    quote:
      "Direct site par unloading ke saath hassle-free delivery. Cash on Delivery (COD) milne se builder community ka trust 100% rehta hai.",
    speedBadge: "Same-Day Dispatch",
    verified: true,
    bgGradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
  },
  {
    id: "rev-4",
    name: "Suresh Gupta",
    role: "Interior Contractor, Lanka",
    initials: "SG",
    rating: 5,
    materialTag: "Asian Paints Apex Ultima & Putty",
    quote:
      "Original sealed buckets aur proper GST invoice mila. Market ghoomne ka time bach gaya, ab saara maal BuildCity se hi mangwate hain.",
    speedBadge: "Delivered in 9.5 Hours",
    verified: true,
    bgGradient: "from-purple-500/10 via-indigo-500/5 to-transparent",
  },
];

export default function SiteReviewsSection() {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory scroll-px-4 px-4 pb-1 sm:gap-4">
      {DEMO_REVIEWS.map((rev) => (
        <figure
          key={rev.id}
          className="flex w-[280px] shrink-0 snap-start flex-col justify-between rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 sm:w-[320px]"
        >
          <div>
            <div className="mb-3 flex items-center gap-1" aria-label={`Rated ${rev.rating} out of 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon key={i} filled={i < rev.rating} className={`h-4 w-4 ${i < rev.rating ? "text-amber-400" : "text-slate-300"}`} />
              ))}
            </div>
            <blockquote className="text-sm leading-relaxed text-slate-700">“{rev.quote}”</blockquote>
            <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
              <PackageIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{rev.materialTag}</span>
            </p>
          </div>

          <figcaption className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-950 text-xs font-semibold text-white">
                {rev.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-navy-950">{rev.name}</span>
                <span className="block truncate text-xs text-slate-500">{rev.role}</span>
              </span>
            </span>
            {rev.speedBadge && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500">
                <ClockIcon className="h-3.5 w-3.5" />
                {rev.speedBadge}
              </span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
