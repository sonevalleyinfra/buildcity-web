import { Link } from "react-router-dom";
import Logo from "./Logo";
import { COMPANY_CONTACT } from "../data/legalPolicies";
import { MailIcon, PhoneIcon, PinIcon, RupeeIcon, ShieldCheckIcon, StoreIcon, TruckIcon } from "./ui/Icons";

const TRUST_POINTS = [
  { icon: ShieldCheckIcon, title: "Genuine brands", text: "Sourced from authorised dealers" },
  { icon: TruckIcon, title: "District delivery", text: "Free on eligible orders" },
  { icon: RupeeIcon, title: "Cash on delivery", text: "Pay when material reaches site" },
  { icon: PinIcon, title: "Order tracking", text: "Status updates till delivery" },
];

export default function Footer() {
  const materialsList = [
    { name: "Cement & binding", query: "cement" },
    { name: "Sand & aggregates", query: "sand" },
    { name: "Bricks & fly ash blocks", query: "brick" },
    { name: "TMT steel & rebars", query: "steel" },
    { name: "Paint, putty & wall care", query: "paint" },
    { name: "Pipes & plumbing", query: "plumbing" },
  ];

  const policyLinks = [
    { name: "Terms & Conditions", path: "/terms" },
    { name: "Privacy Policy", path: "/privacy" },
    { name: "Return & Refund Policy", path: "/refund" },
    { name: "Shipping & Delivery Policy", path: "/shipping" },
  ];

  const linkClass = "text-slate-400 hover:text-white transition-colors inline-block py-1";

  return (
    <footer data-storefront className="relative z-20 bg-[#07132B] text-slate-300 pt-10 pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5 pb-8 mb-8 border-b border-white/10">
          {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-200 ring-1 ring-white/10">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{title}</span>
                <span className="block text-xs leading-snug text-slate-400">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-8">
          <div className="sm:col-span-2 lg:col-span-4 space-y-4">
            <Link to="/" aria-label="BuildCity home" className="inline-block rounded-lg">
              <Logo variant="light" size="md" />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              {COMPANY_CONTACT.tagline}. Connecting contractors, builders, retailers and homeowners with verified local material suppliers.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-white/5 px-2.5 py-1 text-slate-300 ring-1 ring-white/10">B2B & B2C</span>
              <span className="rounded-md bg-white/5 px-2.5 py-1 text-slate-300 ring-1 ring-white/10">Eastern Uttar Pradesh</span>
            </div>
          </div>

          <nav className="lg:col-span-3" aria-label="Policies">
            <h3 className="mb-2 text-sm font-semibold text-white">Policies</h3>
            <ul className="text-sm">
              {policyLinks.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} className={linkClass}>
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link to="/vendor/login" className="inline-flex items-center gap-2 py-1 text-sm font-medium text-sky-300 transition-colors hover:text-sky-200">
                  <StoreIcon className="h-4 w-4" />
                  Partner / vendor login
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label="Materials">
            <h3 className="mb-2 text-sm font-semibold text-white">Materials</h3>
            <ul className="text-sm">
              {materialsList.map((m) => (
                <li key={m.query}>
                  <Link to={`/search?q=${encodeURIComponent(m.query)}`} className={linkClass}>
                    {m.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sm:col-span-2 lg:col-span-3">
            <h3 className="mb-2 text-sm font-semibold text-white">Grievance & contact</h3>
            <dl className="space-y-3 rounded-2xl bg-white/[0.03] p-4 text-sm ring-1 ring-white/10">
              <div>
                <dt className="text-xs text-slate-400">Grievance officer</dt>
                <dd className="font-medium text-white">{COMPANY_CONTACT.grievanceOfficer.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Phone</dt>
                <dd>
                  <a href={`tel:${COMPANY_CONTACT.grievanceOfficer.contact}`} className="inline-flex items-center gap-1.5 font-medium text-sky-300 hover:text-sky-200 tabular-nums">
                    <PhoneIcon className="h-3.5 w-3.5" />
                    +91 {COMPANY_CONTACT.grievanceOfficer.contact}
                  </a>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-400">Email</dt>
                <dd className="min-w-0">
                  <a href={`mailto:${COMPANY_CONTACT.email}`} className="inline-flex max-w-full items-center gap-1.5 font-medium text-sky-300 hover:text-sky-200">
                    <MailIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{COMPANY_CONTACT.email}</span>
                  </a>
                </dd>
              </div>
              <div className="border-t border-white/10 pt-3">
                <dt className="text-xs text-slate-400">Registered address</dt>
                <dd className="text-[13px] leading-snug text-slate-300">
                  {COMPANY_CONTACT.address}, {COMPANY_CONTACT.city}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} BuildCity. All rights reserved. Governed by the applicable laws of India.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/refund" className="hover:text-white transition-colors">Refunds</Link>
            <Link to="/shipping" className="hover:text-white transition-colors">Shipping</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
