import { Link } from "react-router-dom";
import { COMPANY_CONTACT } from "../data/legalPolicies";

export default function Footer() {
  const materialsList = [
    { name: "Cement & Binding", query: "cement" },
    { name: "Sand & Aggregates (M-Sand)", query: "sand" },
    { name: "Bricks & Fly Ash Blocks", query: "brick" },
    { name: "TMT Steel & Rebars", query: "steel" },
    { name: "Paint, Putty & Wall Care", query: "paint" },
    { name: "Pipes & Plumbing Solutions", query: "plumbing" },
  ];

  const policyLinks = [
    { name: "Terms & Conditions", path: "/terms", icon: "📜" },
    { name: "Privacy Policy", path: "/privacy", icon: "🔒" },
    { name: "Return & Refund Policy", path: "/refund", icon: "🔄" },
    { name: "Shipping & Delivery Policy", path: "/shipping", icon: "🚚" },
  ];

  return (
    <footer className="bg-[#07132B] text-slate-300 pt-12 pb-24 sm:pb-12 border-t border-slate-800 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 🏆 Top Trust Highlights Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-10 mb-10 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center text-lg shrink-0">
              🛡️
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">100% Genuine</h4>
              <p className="text-[11px] text-slate-400">Direct from authorized brands</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center text-lg shrink-0">
              🚚
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">District Delivery</h4>
              <p className="text-[11px] text-slate-400">Free delivery on eligible orders</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 text-sky-400 flex items-center justify-center text-lg shrink-0">
              💵
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cash on Delivery</h4>
              <p className="text-[11px] text-slate-400">Pay upon site material arrival</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 text-purple-400 flex items-center justify-center text-lg shrink-0">
              📍
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live Site Tracking</h4>
              <p className="text-[11px] text-slate-400">Real-time dispatch updates</p>
            </div>
          </div>
        </div>

        {/* 🏛️ 4-Section Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10">
          {/* Section 1: About BuildCity (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-white font-black text-xl tracking-tight">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center text-base shadow-md">
                BC
              </div>
              <span className="text-white">BuildCity</span>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
              {COMPANY_CONTACT.tagline}. Connecting contractors, builders, retailers, and individual customers with certified local material distributors.
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-amber-300 font-bold border border-slate-700">
                B2B & B2C
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-emerald-300 font-bold border border-slate-700">
                Uttar Pradesh Hub
              </span>
            </div>
          </div>

          {/* Section 2: Policies & Legal (3 Cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">
              Policies & Legal
            </h3>
            <ul className="space-y-2 text-xs">
              {policyLinks.map((item, idx) => (
                <li key={idx}>
                  <Link
                    to={item.path}
                    className="text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-2 py-0.5"
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Popular Building Materials (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">
              Materials
            </h3>
            <ul className="space-y-2 text-xs">
              {materialsList.map((m, idx) => (
                <li key={idx}>
                  <Link
                    to={`/categories`}
                    className="text-slate-300 hover:text-white transition-colors block py-0.5"
                  >
                    {m.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 4: Grievance Officer & Contact (3 Cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">
              Grievance & Contact
            </h3>
            <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Grievance Officer:</span>
                <span className="font-bold text-white text-xs sm:text-sm">
                  {COMPANY_CONTACT.grievanceOfficer.name}
                </span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Direct Contact:</span>
                <a
                  href={`tel:${COMPANY_CONTACT.grievanceOfficer.contact}`}
                  className="font-bold text-amber-400 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <span>📞</span>
                  <span>+91 {COMPANY_CONTACT.grievanceOfficer.contact}</span>
                </a>
              </div>

              <div className="pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Support Email:</span>
                <a
                  href={`mailto:${COMPANY_CONTACT.email}`}
                  className="font-bold text-amber-400 hover:underline flex items-center gap-1 mt-0.5 truncate"
                >
                  <span>✉️</span>
                  <span>{COMPANY_CONTACT.email}</span>
                </a>
              </div>

              <div className="pt-1 border-t border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Corporate Address:</span>
                <p className="text-slate-300 text-[11px] leading-tight mt-0.5">
                  {COMPANY_CONTACT.address}, {COMPANY_CONTACT.city}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 🔒 Bottom Copyright & Legal Strip */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 text-center sm:text-left">
          <p>© {new Date().getFullYear()} BuildCity. All rights reserved. Governed by the applicable laws of India.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link to="/refund" className="hover:text-slate-300 transition-colors">
              Refunds
            </Link>
            <span>•</span>
            <Link to="/shipping" className="hover:text-slate-300 transition-colors">
              Shipping
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
