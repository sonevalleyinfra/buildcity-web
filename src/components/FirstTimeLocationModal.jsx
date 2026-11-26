import React, { useState, useEffect, useMemo } from "react";
import { useRegion } from "../context/RegionContext";
import { useCart } from "../context/CartContext";
import { ArrowRightIcon, CheckIcon, CloseIcon, PinIcon, SearchIcon } from "./ui/Icons";
import { useAlert } from "../context/AlertContext";

export default function FirstTimeLocationModal() {
  const { region, setRegion, regions, hasExplicitlySelectedLocation, isLocationModalOpen, setIsLocationModalOpen } = useRegion();
  const { items, updateCartToCurrentRegion } = useCart();
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
            title: "Some items were removed",
            message: `The following product(s) are not supplied in ${target.name} and have been removed from your cart:\n\n• ${removedItems.join("\n• ")}`,
            type: "warning",
            buttonText: "Understood",
          });
        } else if (updatedCount > 0) {
          showAlert({
            title: "District updated",
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

  const closeModal = () => {
    setIsOpen(false);
    if (setIsLocationModalOpen) setIsLocationModalOpen(false);
  };

  return (
    <div data-storefront className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="bc-fade-in absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        onClick={() => {
          // If user already has a location, allow closing on backdrop click
          if (hasExplicitlySelectedLocation) closeModal();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        className="bc-sheet-up relative z-10 bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[88vh] sm:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="px-5 pt-4 pb-3 sm:pt-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="location-modal-title" className="text-lg font-semibold tracking-tight text-navy-950">
                Choose delivery location
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">Prices, stock and delivery fees depend on your district.</p>
            </div>
            {hasExplicitlySelectedLocation && (
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <label className="mt-4 flex h-11 items-center gap-2.5 rounded-xl border border-transparent bg-slate-100 px-3.5 transition-[border-color,background-color,box-shadow] focus-within:border-brand-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(234,88,12,0.10)]">
            <SearchIcon className="h-[18px] w-[18px] shrink-0 text-slate-500" />
            <span className="sr-only">Search districts</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city, district, or pin..."
              className="h-full w-full min-w-0 bg-transparent text-sm text-navy-950 outline-none placeholder:text-slate-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-600"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </label>

          {filteredRegions.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="mr-0.5 shrink-0 text-xs text-slate-500">Popular</span>
              {filteredRegions.slice(0, 4).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleConfirm(r)}
                  className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors active:scale-[0.97] cursor-pointer ${
                    region?.id === r.id || selectedRegionId === r.id
                      ? "bg-navy-950 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain border-t border-slate-100 px-3 py-2 sm:px-4 max-h-[46vh] sm:max-h-[40vh]">
          {filteredRegions.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-slate-500">No districts match “{search}”.</p>
          ) : (
            <ul className="space-y-0.5">
              {filteredRegions.map((r) => {
                const isSelected = selectedRegionId === r.id || region?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => handleConfirm(r)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors cursor-pointer ${
                        isSelected ? "bg-brand-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isSelected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <PinIcon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy-950">{r.name}</span>
                        <span className="block text-xs text-slate-500">
                          {r.state || "Uttar Pradesh"}
                          {r.baseDeliveryCharge ? ` · Delivery from ₹${r.baseDeliveryCharge}` : " · Free delivery"}
                        </span>
                      </span>
                      {isSelected && <CheckIcon className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={2.2} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => handleConfirm()}
            className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-navy-950 text-sm font-semibold text-white transition-colors hover:bg-navy-900 active:scale-[0.99] cursor-pointer"
          >
            Confirm & explore
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
