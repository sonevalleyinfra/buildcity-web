import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Logo from "../../components/Logo";
import { ChevronLeftIcon, MailIcon, PhoneIcon, WhatsAppIcon } from "../../components/ui/Icons";
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
    { key: "terms", label: "Terms & Conditions", path: "/terms" },
    { key: "privacy", label: "Privacy Policy", path: "/privacy" },
    { key: "refund", label: "Return & Refund", path: "/refund" },
    { key: "shipping", label: "Shipping Policy", path: "/shipping" },
  ];

  return (
    <div data-storefront className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="active:scale-95 transition-transform flex items-center">
              <Logo size="sm" />
            </Link>
            <span className="hidden sm:inline-block h-5 w-px bg-slate-200" aria-hidden="true" />
            <span className="hidden sm:inline-block text-sm text-slate-500">
              Policies
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="h-10 px-3 rounded-xl text-navy-950 hover:bg-slate-100 font-medium text-sm transition-colors flex items-center gap-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Back to store</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full grow">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex text-sm text-slate-500 mb-4 items-center gap-1.5">
          <Link to="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span>Policies</span>
          <span>/</span>
          <span className="text-navy-950">{currentPolicy.title}</span>
        </nav>

        {/* Policy Tab Switcher */}
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-6 overflow-x-auto flex gap-2 no-scrollbar" role="tablist" aria-label="Policies">
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
                role="tab"
                aria-selected={isActive}
                className={`h-9 px-3.5 rounded-full font-medium text-sm whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  isActive ? "bg-navy-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Policy Body Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Full Policy Content */}
          <article className="bc-fade-in lg:col-span-8 bg-white rounded-2xl p-5 sm:p-10 ring-1 ring-slate-200/80 space-y-6">
            {/* Header */}
            <div className="border-b border-slate-100 pb-5">
              <p className="text-xs text-slate-500 mb-2">
                Last updated {currentPolicy.lastUpdated}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-navy-950 tracking-tight leading-snug">
                {currentPolicy.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {currentPolicy.subtitle}
              </p>
            </div>

            {/* Structured Sections */}
            <div className="space-y-6">
              {currentPolicy.sections.map((sec, idx) => (
                <section key={idx} className="space-y-2">
                  <h2 className="text-base sm:text-lg font-semibold text-navy-950">
                    {sec.heading}
                  </h2>
                  <div className="selectable-text text-slate-600 text-sm sm:text-[15px] leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </div>
                </section>
              ))}
            </div>

            {/* Document Signature Footnote */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
              <div>
                <p className="font-medium text-navy-950">BuildCity</p>
                <p>Governed in accordance with the Laws of India.</p>
              </div>
              <a
                href={COMPANY_CONTACT.website}
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 hover:text-brand-600 font-medium"
              >
                {COMPANY_CONTACT.website}
              </a>
            </div>
          </article>

          {/* Right Column: Grievance Officer & Quick Support Cards */}
          <aside className="lg:col-span-4 space-y-5">
            {/* Grievance officer */}
            <div className="bg-navy-950 text-white rounded-2xl p-5 sm:p-6">
              <h3 className="text-base font-semibold tracking-tight text-white mb-1">
                Grievance Officer
              </h3>
              <p className="text-sm text-slate-300 mb-4">
                As per the Information Technology Act & Consumer Protection (E-Commerce) Rules:
              </p>

              <div className="space-y-3 bg-white/5 rounded-xl p-4 ring-1 ring-white/10 text-sm">
                <div>
                  <span className="text-slate-400 text-xs block">Officer Name</span>
                  <span className="font-medium text-white">
                    {COMPANY_CONTACT.grievanceOfficer.name}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">Direct Contact</span>
                  <a
                    href={`tel:${COMPANY_CONTACT.grievanceOfficer.contact}`}
                    className="font-medium text-sky-300 hover:text-sky-200 flex items-center gap-1.5 tabular-nums"
                  >
                    <PhoneIcon className="h-3.5 w-3.5" />
                    <span>+91 {COMPANY_CONTACT.grievanceOfficer.contact}</span>
                  </a>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">Official Email</span>
                  <a
                    href={`mailto:${COMPANY_CONTACT.grievanceOfficer.email}`}
                    className="font-medium text-sky-300 hover:text-sky-200 flex items-center gap-1.5 break-all"
                  >
                    <MailIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{COMPANY_CONTACT.grievanceOfficer.email}</span>
                  </a>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-sm text-slate-300">
                <span className="text-xs text-slate-400 block mb-0.5">Registered address</span>
                <p className="leading-tight text-slate-300">
                  {COMPANY_CONTACT.address}, {COMPANY_CONTACT.city}, {COMPANY_CONTACT.state}
                </p>
              </div>
            </div>

            {/* Quick help */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 ring-1 ring-slate-200/80 space-y-3">
              <h4 className="text-[15px] font-semibold text-navy-950">
                Need help with an order?
              </h4>
              <p className="text-sm text-slate-500">
                Have questions regarding building material orders, wholesale supply, or dispatch?
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={`https://wa.me/${COMPANY_CONTACT.supportWhatsApp}?text=Hello%20BuildCity%20Compliance%20Support`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-11 px-4 rounded-xl bg-[#128C7E] hover:bg-[#075E54] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  <span>Chat on WhatsApp</span>
                </a>
                <a
                  href={`tel:${COMPANY_CONTACT.supportPhone}`}
                  className="w-full h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                >
                  <PhoneIcon className="h-4 w-4" />
                  <span>Call support</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
