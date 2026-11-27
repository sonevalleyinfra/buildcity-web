import { useEffect, useRef, useState } from "react";
import { CloseIcon, HeadsetIcon, PhoneIcon, WhatsAppIcon } from "./ui/Icons";

const WHATSAPP_URL =
  "https://wa.me/919956886527?text=Hello%20BuildCity%20Team,%20I%20have%20an%20inquiry%20regarding%20construction%20materials";
const PHONE_URL = "tel:+919956886527";

// One "Help" button that opens WhatsApp / Call, instead of two permanent bubbles over the product grid.
// On phones it sits above the bottom tab bar.
export default function ContactFab() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const option =
    "flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm font-medium text-navy-950 shadow-lg ring-1 ring-slate-200 transition-colors hover:bg-slate-50";

  return (
    <div
      ref={rootRef}
      data-storefront
      className="fixed right-3 z-40 flex flex-col items-end gap-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:right-5 lg:bottom-6 lg:right-6"
    >
      {open && (
        <div className="bc-pop-in flex flex-col items-end gap-2" role="menu">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={option} role="menuitem" onClick={() => setOpen(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white">
              <WhatsAppIcon className="h-[18px] w-[18px]" />
            </span>
            Chat on WhatsApp
          </a>
          <a href={PHONE_URL} className={option} role="menuitem" onClick={() => setOpen(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white">
              <PhoneIcon className="h-4 w-4" />
            </span>
            Call support
          </a>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close help options" : "Help: WhatsApp or call"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-950 text-white shadow-[0_8px_24px_-6px_rgba(15,23,42,0.45)] ring-4 ring-white/70 transition-transform duration-200 hover:bg-navy-900 active:scale-95"
      >
        <span className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          {open ? <CloseIcon className="h-5 w-5" strokeWidth={2.2} /> : <HeadsetIcon className="h-[22px] w-[22px]" />}
        </span>
      </button>
    </div>
  );
}
