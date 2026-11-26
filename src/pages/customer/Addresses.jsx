import { useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import MobileHeader from "../../components/ui/MobileHeader";
import EmptyState from "../../components/ui/EmptyState";
import { useAlert } from "../../context/AlertContext";
import { CheckIcon, CloseIcon, EditIcon, MapIcon, PhoneIcon, PinIcon, PlusIcon, StarIcon, TrashIcon, UserIcon } from "../../components/ui/Icons";
import { useAddresses } from "../../context/AddressContext";
import { useAuth } from "../../context/AuthContext";
import { useRegion } from "../../context/RegionContext";

const emptyForm = {
  label: "Home",
  fullName: "",
  line: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

export default function Addresses() {
  const { showConfirm } = useAlert();
  const { addresses, addAddress, updateAddress, removeAddress, setDefault, isSavingAddress } =
    useAddresses();
  const { user, updateProfile } = useAuth();
  const { region } = useRegion();

  const uniqueAddresses = useMemo(() => {
    const map = new Map();
    (addresses || []).forEach((a) => {
      const cleanStreet = (a.street || a.line || "").toLowerCase().trim();
      const cleanCity = (a.city || "").toLowerCase().trim();
      const cleanPin = (a.pincode || "").trim();
      const key = `${cleanStreet}_${cleanCity}_${cleanPin}`;

      if (!map.has(key)) {
        map.set(key, a);
      } else if (a.isDefault) {
        map.set(key, a);
      }
    });

    const list = Array.from(map.values());
    let defaultAssigned = false;
    const sanitized = list.map((a) => {
      if (a.isDefault && !defaultAssigned) {
        defaultAssigned = true;
        return { ...a, isDefault: true };
      }
      return { ...a, isDefault: false };
    });

    if (!defaultAssigned && sanitized.length > 0) {
      sanitized[0].isDefault = true;
    }

    return sanitized.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }, [addresses]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 3500);
  };

  const maybeUpdateProfileName = (enteredName) => {
    if (!enteredName || typeof enteredName !== "string" || !updateProfile) return;
    const clean = enteredName.trim();
    if (clean.length < 2) return;

    const current = (user?.name || "").trim().toLowerCase();
    const isPlaceholder =
      !current ||
      current === "customer" ||
      current === "user" ||
      current === "verified customer" ||
      /^customer\s*\d*$/i.test(current) ||
      /^user\s*\d*$/i.test(current);

    if (isPlaceholder && clean.toLowerCase() !== current) {
      console.log("👤 Auto-updating customer profile name to:", clean);
      updateProfile({ name: clean }).catch(() => null);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const openAdd = () => {
    setForm({ ...emptyForm, fullName: user?.name || "", city: region?.name || "Varanasi" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setForm({
      ...addr,
      line: addr.line || addr.street || "",
      fullName: addr.fullName || user?.name || "",
      city: addr.city || region?.name || "Varanasi",
      isDefault: Boolean(addr.isDefault),
    });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resolvedCity = form.city || region?.name || "Varanasi";
    if (!form.line.trim() || !form.pincode.trim()) return;

    setSubmitting(true);
    if (form.fullName && form.fullName.trim()) {
      maybeUpdateProfileName(form.fullName);
    }

    const payload = { ...form, city: resolvedCity, regionId: region?.id };

    try {
      if (editingId) {
        await updateAddress(editingId, payload);
        showStatus("Address updated");
      } else {
        await addAddress(payload);
        showStatus("Address added");
      }
    } catch {}

    setSubmitting(false);
    setShowForm(false);
  };

  const confirmRemove = (a) =>
    showConfirm({
      title: "Delete this address?",
      message: `${a.line || a.street || "This address"}, ${a.city || ""} will be removed from your saved addresses.`,
      type: "warning",
      confirmText: "Delete",
      cancelText: "Keep",
      onConfirm: () => removeAddress(a.id),
    });

  return (
    <div data-storefront className="min-h-screen bg-surface pb-24 lg:pb-12">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader
        title="Saved addresses"
        fallback="/profile"
        actions={
          <button
            type="button"
            onClick={openAdd}
            aria-label="Add new address"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-navy-900 hover:bg-slate-100"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        }
      />

      <main className="bc-fade-in max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {statusMsg && (
          <div role="status" className="bc-rise-in mb-4 bg-emerald-50 ring-1 ring-inset ring-emerald-600/20 text-emerald-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <CheckIcon className="h-4 w-4 shrink-0" strokeWidth={2.4} />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="hidden lg:flex items-center justify-between mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-950">Saved addresses</h1>
          <button
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold bg-navy-950 hover:bg-navy-900 text-white px-4 rounded-xl transition-colors active:scale-[0.98] cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            Add address
          </button>
        </div>

        {/* Modal Dialog for Edit / Add Address */}
        {showForm && (
          <div className="bc-fade-in fixed inset-0 z-50 bg-slate-950/55 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowForm(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="address-form-title"
              onClick={(e) => e.stopPropagation()}
              className="bc-sheet-up bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 id="address-form-title" className="text-base font-semibold text-navy-950">
                  {editingId ? "Edit address" : "New delivery address"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  aria-label="Close"
                  className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 space-y-4 max-h-[78vh] overflow-y-auto">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1.5">Label</p>
                  <div className="flex gap-2">
                    {["Home", "Work", "Other"].map((l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => setForm((f) => ({ ...f, label: l }))}
                        aria-pressed={form.label === l}
                        className={`h-9 text-sm font-medium px-4 rounded-full transition-colors cursor-pointer ${
                          form.label === l
                            ? "bg-navy-950 text-white"
                            : "ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Receiver name</label>
                  <input
                    name="fullName"
                    value={form.fullName || ""}
                    onChange={handleChange}
                    placeholder="Full Name (e.g. Dhirendra Kumar)"
                    className="w-full h-11 text-sm border border-slate-200 rounded-xl px-3.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Site address</label>
                  <input
                    name="line"
                    value={form.line || ""}
                    onChange={handleChange}
                    placeholder="House / Plot no, street, landmark, area"
                    className="w-full h-11 text-sm border border-slate-200 rounded-xl px-3.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      District
                    </label>
                    <input
                      name="city"
                      readOnly
                      value={form.city || region?.name || "Varanasi"}
                      className="w-full h-11 text-sm border border-slate-200 bg-slate-50 text-slate-600 rounded-xl px-3.5 outline-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">State</label>
                    <input
                      name="state"
                      value={form.state || ""}
                      onChange={handleChange}
                      placeholder="State (e.g. Uttar Pradesh)"
                      className="w-full h-11 text-sm border border-slate-200 rounded-xl px-3.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Pincode</label>
                  <input
                    name="pincode"
                    value={form.pincode || ""}
                    onChange={handleChange}
                    placeholder="6-Digit Pincode (e.g. 221001)"
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full h-11 text-sm border border-slate-200 rounded-xl px-3.5 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 tabular-nums"
                  />
                </div>

                <div className="pt-2 pb-1">
                  <label className="flex items-center gap-2.5 text-sm text-navy-950 cursor-pointer select-none bg-slate-50 p-3 rounded-xl">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={Boolean(form.isDefault)}
                      onChange={handleChange}
                      className="h-4.5 w-4.5 accent-brand-600 rounded cursor-pointer"
                    />
                    <span>Use as my default address</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting || isSavingAddress}
                    className="flex-1 h-12 bg-navy-950 hover:bg-navy-900 active:scale-[0.98] transition-colors text-white text-sm font-semibold rounded-xl disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting || isSavingAddress ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : editingId ? (
                      "Save changes"
                    ) : (
                      "Save address"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 h-12 ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {uniqueAddresses.length === 0 && !showForm ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200/80">
            <EmptyState
              icon={MapIcon}
              title="No saved addresses"
              description="Add your site address once and pick it at checkout."
              actionLabel="Add address"
              onAction={openAdd}
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {uniqueAddresses.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {a.label || "Home"}
                    </span>
                    {a.isDefault && (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center -mr-2">
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      aria-label="Edit address"
                      className="h-9 px-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <EditIcon className="h-4 w-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmRemove(a)}
                      aria-label="Delete address"
                      className="h-9 px-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <TrashIcon className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-navy-950 flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-slate-400" /> {a.fullName || user?.name || "Customer"}
                  </p>
                  {(a.phone || user?.phone) && (
                    <p className="text-sm text-slate-600 flex items-center gap-2 tabular-nums">
                      <PhoneIcon className="h-4 w-4 text-slate-400" /> {a.phone || user?.phone}
                    </p>
                  )}
                  <p className="text-sm text-slate-700 flex items-start gap-2">
                    <PinIcon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-words min-w-0">{a.line || a.street}</span>
                  </p>
                  <p className="text-sm text-slate-500 pl-6">
                    {a.city}, {a.state || "Uttar Pradesh"} · <span className="tabular-nums">{a.pincode || "221001"}</span>
                  </p>
                </div>

                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={async () => {
                      await setDefault(a.id, a);
                      showStatus("Default address updated");
                    }}
                    className="h-9 -ml-2 px-2 rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors mt-2 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <StarIcon filled={false} className="h-4 w-4" /> Make default
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      
    </div>
  );
}