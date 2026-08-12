import Logo from "../components/Logo";

const features = [
  { title: "Top Quality Products", sub: "Cement, Steel, Paints & more" },
  { title: "Best Prices", sub: "Competitive prices, great value" },
  { title: "Fast Delivery", sub: "Quick delivery across your city" },
  { title: "Trusted Service", sub: "24/7 customer support" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left brand panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-[44%] relative bg-navy-900 overflow-hidden flex-col justify-between p-12">
        {/* background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-brand-400/10 blur-3xl" />

        <div className="relative z-10">
          <Logo variant="light" size="lg" />
        </div>

        <div className="relative z-10">
          <h1 className="text-white text-4xl font-extrabold leading-tight mb-3">
            Build Better,
            <br />
            With Build City
          </h1>
          <p className="text-white/60 text-base mb-10 max-w-sm">
            Quality products. Best prices. Reliable service. Everything for
            your next project, in one place.
          </p>

          <div className="grid grid-cols-2 gap-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-brand-400 shrink-0" />
                <div>
                  <div className="text-white text-sm font-semibold">
                    {f.title}
                  </div>
                  <div className="text-white/50 text-xs mt-0.5">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/40 text-xs">
          © {new Date().getFullYear()} Build City. All rights reserved.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="md" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
