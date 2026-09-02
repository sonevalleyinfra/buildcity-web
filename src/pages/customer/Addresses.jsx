import { useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import BottomNav from "../../components/BottomNav";
import { useAddresses } from "../../context/AddressContext";
import { useAuth } from "../../context/AuthContext";

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
  const { addresses, addAddress, updateAddress, removeAddress, setDefault, isSavingAddress } =
    useAddresses();
  const { user, updateProfile } = useAuth();

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
    setForm({ ...emptyForm, fullName: user?.name || "" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setForm({ ...addr, fullName: addr.fullName || user?.name || "" });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.line.trim() || !form.city.trim() || !form.pincode.trim()) return;

    setSubmitting(true);
    if (form.fullName && form.fullName.trim()) {
      maybeUpdateProfileName(form.fullName);
    }

    try {
      if (editingId) {
        await updateAddress(editingId, form);
        showStatus("✓ Address updated successfully!");
      } else {
        await addAddress(form);
        showStatus("✓ New address added successfully!");
      }
    } catch {}

    setSubmitting(false);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {statusMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3 rounded-xl shadow-2xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <span>✓</span>
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-navy-900">My Addresses</h1>
          {!showForm && (
            <button
              onClick={openAdd}
              className="text-sm font-semibold text-brand-500 hover:underline cursor-pointer"
            >
              + Add New
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border border-slate-200 p-4 mb-5 space-y-3"
          >
            <h3 className="text-sm font-bold text-navy-900">
              {editingId ? "Edit Address" : "Add New Address"}
            </h3>

            <div className="flex gap-2">
              {["Home", "Work", "Other"].map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setForm((f) => ({ ...f, label: l }))}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                    form.label === l
                      ? "bg-brand-500 text-white border-brand-500"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <input
              name="fullName"
              value={form.fullName || ""}
              onChange={handleChange}
              placeholder="Full Name (Receiver Name)"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500 font-semibold"
            />
            <input
              name="line"
              value={form.line}
              onChange={handleChange}
              placeholder="House no, street, landmark"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="City"
                className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
              />
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="State"
                className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
              />
            </div>
            <input
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              placeholder="Pincode"
              maxLength={6}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-brand-500"
            />

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                name="isDefault"
                checked={form.isDefault}
                onChange={handleChange}
                className="h-4 w-4 accent-[#1E5FD9]"
              />
              Set as default address
            </label>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || isSavingAddress}
                className="flex-1 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all duration-200 text-white text-sm font-bold rounded-xl py-2.5 shadow-xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting || isSavingAddress ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Saving Address...</span>
                  </>
                ) : editingId ? (
                  "✓ Save Changes"
                ) : (
                  "✓ Add Address"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl py-2.5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {uniqueAddresses.length === 0 && !showForm ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <span className="text-4xl mb-3 inline-block">📍</span>
            <h3 className="font-bold text-navy-900 mb-1">No addresses saved</h3>
            <p className="text-sm text-slate-500 mb-5">
              Delivery ke liye ek address add karo.
            </p>
            <button
              onClick={openAdd}
              className="bg-brand-500 text-white text-sm font-semibold rounded-xl px-6 py-2.5"
            >
              Add Address
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {uniqueAddresses.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200/60 px-2.5 py-0.5 rounded-md">
                      {a.label || "Home"}
                    </span>
                    {a.isDefault && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Default Address ✓
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="text-brand-600 font-bold hover:text-brand-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(a.id)}
                      className="text-rose-600 font-bold hover:text-rose-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-black text-navy-900 flex items-center gap-1.5">
                    <span>👤</span> {a.fullName || user?.name || "Customer"}
                  </p>
                  {(a.phone || user?.phone) && (
                    <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <span>📞</span> {a.phone || user?.phone}
                    </p>
                  )}
                  <p className="text-xs text-slate-700 font-semibold mt-1 flex items-start gap-1.5">
                    <span className="shrink-0">📍</span>
                    <span>{a.line || a.street}</span>
                  </p>
                  <p className="text-xs font-medium text-slate-500 pl-5">
                    {a.city}, {a.state || "Uttar Pradesh"} — <span className="font-bold text-navy-900">{a.pincode || "221001"}</span>
                  </p>
                </div>

                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={async () => {
                      await setDefault(a.id);
                      showStatus("✓ Set as default delivery address!");
                    }}
                    className="text-xs font-extrabold text-brand-600 hover:text-brand-700 active:scale-95 transition-all mt-3 inline-flex items-center gap-1 cursor-pointer"
                  >
                    ★ Set as default address
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