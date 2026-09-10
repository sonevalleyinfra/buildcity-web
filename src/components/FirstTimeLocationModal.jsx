import React, { useState, useEffect, useMemo } from "react";
import { useRegion } from "../context/RegionContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";

export default function FirstTimeLocationModal() {
  const { region, setRegion, regions, hasExplicitlySelectedLocation, isLocationModalOpen, setIsLocationModalOpen } = useRegion();
  const { items, updateCartToCurrentRegion } = useCart();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState(region?.id || "");

  // Auto open on first visit if user hasn't selected location yet
  useEffect(() => {
    if (!hasExplicitlySelectedLocation && !isLocationModalOpen) {
      setIsOpen(true);
    }
  }, [hasExplicitlySelectedLocation, isLocationModalOpen]);

  // Sync external open trigger (e.g. from RegionPicker or RegionContext)
  useEffect(() => {
    if (isLocationModalOpen) {
      setIsOpen(true);
    }
  }, [isLocationModalOpen]);

  useEffect(() => {
    if (region?.id) {
      setSelectedRegionId(region.id);
    }
  }, [region]);

  const filteredRegions = useMemo(() => {
    const list = [...(regions || [])];
    // Stable sort: Varanasi always stays on top as premier hub, then other cities alphabetically
    list.sort((a, b) => {
      if ((a.name || "").toLowerCase() === "varanasi") return -1;
      if ((b.name || "").toLowerCase() === "varanasi") return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    if (!search || !search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.state || "").toLowerCase().includes(q)
    );
  }, [regions, search]);

  const handleConfirm = async (rToSelect) => {
    const target = rToSelect || regions.find((r) => r.id === selectedRegionId) || regions[0];
    if (!target) return;

    const isDifferentRegion = region && target && (
      (target.id && region.id && target.id.toLowerCase() !== region.id.toLowerCase()) ||
      (target.name && region.name && target.name.toLowerCase().trim() !== region.name.toLowerCase().trim())
    );

    setRegion(target);
    setIsOpen(false);
    if (setIsLocationModalOpen) setIsLocationModalOpen(false);

    // Sync cart items if changing region with active items
    if (items && items.length > 0 && isDifferentRegion) {
      try {
        const { updatedCount, removedItems } = await updateCartToCurrentRegion([], target);
        if (removedItems && removedItems.length > 0) {
          showAlert({
            title: "📍 Region Availability Notice",
            message: `The following product(s) are not supplied in ${target.name} and have been removed from your cart:\n\n• ${removedItems.join("\n• ")}`,
            type: "warning",
            buttonText: "Understood",
          });
        } else if (updatedCount > 0) {
          showAlert({
            title: "✅ Region Changed",
            message: `Your cart items and rates have been updated for ${target.name}.`,
            type: "success",
            buttonText: "Great",
          });
        }
      } catch (err) {
        console.warn("Cart region update warning:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-200"
        onClick={() => {
          // If user already has a location, allow closing on backdrop click
          if (hasExplicitlySelectedLocation) {
            setIsOpen(false);
            if (setIsLocationModalOpen) setIsLocationModalOpen(false);
          }
        }}
      />

      {/* Modal Container - Centered on Mobile & Desktop */}
      <div className="relative z-10 bg-white rounded-3xl w-full max-w-sm sm:max-w-md max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-[#07132B] via-[#0A1A3A] to-[#0D224D] text-white p-4 sm:p-5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-lg sm:text-xl shadow-xs shrink-0">
                📍
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-white tracking-tight leading-tight">
                  Choose Delivery Location
                </h3>
                <p className="text-[10.5px] sm:text-xs text-slate-300 font-medium mt-0.5">
                  Live local pricing & fast delivery
                </p>
              </div>
            </div>

            {hasExplicitlySelectedLocation && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (setIsLocationModalOpen) setIsLocationModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-base transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Box inside header */}
          <div className="mt-4 relative">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-slate-300">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city, district, or pin..."
                className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 outline-none font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Popular Cities Chips */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Popular:
          </span>
          {filteredRegions.slice(0, 4).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleConfirm(r)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all shrink-0 active:scale-95 cursor-pointer ${
                (region?.id === r.id || selectedRegionId === r.id)
                  ? "bg-[#0A192F] text-white border-[#0A192F]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* Region List Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2 max-h-[42vh] sm:max-h-[38vh]">
          {filteredRegions.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400">
              No regions found matching "{search}".
            </div>
          ) : (
            filteredRegions.map((r) => {
              const isSelected = selectedRegionId === r.id || region?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleConfirm(r)}
                  className={`w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.99] group ${
                    isSelected
                      ? "bg-blue-50/80 border-[#0284C7] ring-1 ring-[#0284C7]/30 shadow-xs"
                      : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-colors ${
                        isSelected
                          ? "bg-[#0284C7] text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      📍
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-navy-950 flex items-center gap-1.5">
                        {r.name}
                        {isSelected && (
                          <span className="text-[9px] font-black bg-blue-100 text-[#0284C7] px-1.5 py-0.2 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                        {r.state || "Uttar Pradesh"} {r.baseDeliveryCharge ? `• Delivery from ₹${r.baseDeliveryCharge}` : "• Free Delivery"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-[#0284C7] bg-[#0284C7] text-white text-xs font-bold"
                        : "border-slate-300 group-hover:border-slate-400"
                    }`}
                  >
                    {isSelected && "✓"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & CTA */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-[10px] text-slate-400 font-medium leading-tight">
            🔒 Location preferences are saved to your account.
          </div>
          <button
            type="button"
            onClick={() => handleConfirm()}
            className="bg-[#0A192F] hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            Confirm & Explore →
          </button>
        </div>
      </div>
    </div>
  );
}
