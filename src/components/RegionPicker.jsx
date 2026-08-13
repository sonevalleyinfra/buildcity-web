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
         
          <div className="fixed inset-0 z-[999]">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
             {/*Yaha Pe delivery slection ka code hai */}
            <div className="absolute bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[70vh] overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-navy-900">Select Delivery Region</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-400 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                {regions.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      setRegion(r.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left flex items-center justify-between rounded-xl border px-4 py-3 ${
                      region.id === r.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-navy-900">
                        {r.name}
                      </div>
                      <div className="text-xs text-slate-500">{r.state}</div>
                    </div>
                    {region.id === r.id && (
                      <span className="text-brand-500 text-sm font-bold">✓</span>
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