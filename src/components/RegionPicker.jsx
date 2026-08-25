import { useState } from "react";
import { createPortal } from "react-dom";
import { useRegion } from "../context/RegionContext";

export default function RegionPicker({ trigger }) {
  const { region, setRegion, regions } = useRegion();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        {trigger ? trigger(region) : region.name}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200"
              onClick={() => setOpen(false)}
            />
            {/* Delivery selection modal */}
            <div className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[70vh] overflow-y-auto p-5 shadow-2xl border border-slate-100/80">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-navy-900 text-sm tracking-tight flex items-center gap-2">
                  <span>📍</span> Select Delivery Region
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-navy-900 text-xl leading-none transition-colors p-1"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2.5">
                {regions.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      setRegion(r.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left flex items-center justify-between rounded-xl border p-3.5 active:scale-[0.98] transition-all duration-200 cursor-pointer ${
                      region.id === r.id
                        ? "border-brand-500 bg-brand-50/70 shadow-xs ring-1 ring-brand-500/20"
                        : "border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-navy-900">
                        {r.name}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {r.state} {r.baseDeliveryCharge ? `• Delivery Fee: ₹${r.baseDeliveryCharge}` : ""}
                      </div>
                    </div>
                    {region.id === r.id && (
                      <span className="text-brand-600 text-xs font-extrabold bg-brand-100/80 px-2 py-0.5 rounded-full">✓ Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}