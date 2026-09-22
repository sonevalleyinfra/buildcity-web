import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Logo from "../../components/Logo";
import { POLICIES, COMPANY_CONTACT } from "../../data/legalPolicies";

export default function LegalPolicyPage({ defaultPolicyId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Determine active policy key from path or params
  const resolvePolicyKey = () => {
    if (defaultPolicyId && POLICIES[defaultPolicyId]) return defaultPolicyId;

    const path = location.pathname.toLowerCase();
    if (path.includes("privacy")) return "privacy";
    if (path.includes("refund") || path.includes("return")) return "refund";
    if (path.includes("shipping") || path.includes("delivery")) return "shipping";
    if (path.includes("terms")) return "terms";

    const paramKey = (params.policy || "").toLowerCase();
    if (POLICIES[paramKey]) return paramKey;

    return "privacy"; // fallback
  };

  const [activeKey, setActiveKey] = useState(resolvePolicyKey);

  useEffect(() => {
    setActiveKey(resolvePolicyKey());
  }, [location.pathname, params.policy, defaultPolicyId]);

  const currentPolicy = POLICIES[activeKey] || POLICIES.privacy;

  const policyTabs = [
    { key: "terms", label: "Terms & Conditions", icon: "📜", path: "/terms" },
    { key: "privacy", label: "Privacy Policy", icon: "🔒", path: "/privacy" },
    { key: "refund", label: "Return & Refund", icon: "🔄", path: "/refund" },
    { key: "shipping", label: "Shipping Policy", icon: "🚚", path: "/shipping" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      {/* 🧭 Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#07132B] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="active:scale-95 transition-transform flex items-center">
              <Logo variant="light" size="sm" />
            </Link>
            <span className="hidden sm:inline-block text-slate-500 font-light">|</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Legal & Compliance Center
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print Policy"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Print</span>
            </button>
            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1"
            >
              <span>← Back to Store</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 📜 Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full grow">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-500 mb-4 flex items-center gap-2">
          <Link to="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Compliance & Policies</span>
          <span>/</span>
          <span className="text-navy-950 font-bold">{currentPolicy.title}</span>
        </nav>

        {/* Policy Tab Switcher */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs mb-6 overflow-x-auto flex gap-1 scrollbar-none">
          {policyTabs.map((tab) => {
            const isActive = activeKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveKey(tab.key);
                  navigate(tab.path);
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-[#07132B] text-white shadow-md shadow-slate-900/20 scale-[1.01]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Policy Body Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Full Policy Content */}
          <article className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-6">
            {/* Header */}
            <div className="border-b border-slate-100 pb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
                <span>Official Documentation</span>
                <span>•</span>
                <span>Updated: {currentPolicy.lastUpdated}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-navy-950 tracking-tight leading-snug">
                {currentPolicy.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {currentPolicy.subtitle}
              </p>
            </div>

            {/* Structured Sections */}
            <div className="space-y-6">
              {currentPolicy.sections.map((sec, idx) => (
                <section key={idx} className="space-y-2">
                  <h2 className="text-base sm:text-lg font-bold text-navy-900 flex items-center gap-2">
                    <span className="w-1.5 h-4.5 bg-brand-500 rounded-full shrink-0" />
                    <span>{sec.heading}</span>
                  </h2>
                  <div className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line pl-3.5 border-l-2 border-slate-100 font-normal">
                    {sec.content}
                  </div>
                </section>
              ))}
            </div>

            {/* Document Signature Footnote */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
              <div>
                <p className="font-bold text-navy-900">BuildCity Compliance Division</p>
                <p>Governed in accordance with the Laws of India.</p>
              </div>
              <a
                href={COMPANY_CONTACT.website}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:text-brand-700 font-bold hover:underline"
              >
                {COMPANY_CONTACT.website}
              </a>
            </div>
          </article>

          {/* Right Column: Grievance Officer & Quick Support Cards */}
          <aside className="lg:col-span-4 space-y-5">
            {/* 👮 Grievance Officer Card */}
            <div className="bg-gradient-to-br from-[#07132B] via-[#0B1E40] to-[#07132B] text-white rounded-3xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚖️</span>
                <span className="text-xs font-black uppercase tracking-wider text-sky-400">
                  Statutory Redressal
                </span>
              </div>

              <h3 className="text-base font-black tracking-tight text-white mb-1">
                Grievance Officer
              </h3>
              <p className="text-[11px] text-slate-300 font-medium mb-4">
                As per the Information Technology Act & Consumer Protection (E-Commerce) Rules:
              </p>

              <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Officer Name</span>
                  <span className="font-bold text-white text-sm">
                    {COMPANY_CONTACT.grievanceOfficer.name}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Direct Contact</span>
                  <a
                    href={`tel:${COMPANY_CONTACT.grievanceOfficer.contact}`}
                    className="font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>📞</span>
                    <span>+91 {COMPANY_CONTACT.grievanceOfficer.contact}</span>
                  </a>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Official Email</span>
                  <a
                    href={`mailto:${COMPANY_CONTACT.grievanceOfficer.email}`}
                    className="font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>✉️</span>
                    <span>{COMPANY_CONTACT.grievanceOfficer.email}</span>
                  </a>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-300">
                <span className="font-bold text-white block mb-0.5">Corporate Address:</span>
                <p className="leading-tight text-slate-300">
                  {COMPANY_CONTACT.address}, {COMPANY_CONTACT.city}, {COMPANY_CONTACT.state}
                </p>
              </div>
            </div>

            {/* 💬 Quick Help & Inquiries */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-sm font-black text-navy-900 flex items-center gap-1.5">
                <span>💬</span>
                <span>Need Site Assistance?</span>
              </h4>
              <p className="text-xs text-slate-500">
                Have questions regarding building material orders, wholesale supply, or dispatch?
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={`https://wa.me/${COMPANY_CONTACT.supportWhatsApp}?text=Hello%20BuildCity%20Compliance%20Support`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-95"
                >
                  <span>🟢 Chat on WhatsApp</span>
                </a>
                <a
                  href={`tel:${COMPANY_CONTACT.supportPhone}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <span>📞 Call Support</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
