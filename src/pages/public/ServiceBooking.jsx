import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useRegion } from "../../context/RegionContext";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar";
import MobileHeader from "../../components/ui/MobileHeader";
import { useAlert } from "../../context/AlertContext";
import { CheckIcon, FileTextIcon, HardHatIcon, PackageIcon, PinIcon, PlusIcon, ShieldCheckIcon, StoreIcon, HomeIcon, MapIcon } from "../../components/ui/Icons";
import Footer from "../../components/Footer";
import { constructionServices, getServiceById } from "../../data/servicesData";
import { renderServiceLogo } from "../../data/serviceIcons";

export default function ServiceBooking() {
  const [searchParams] = useSearchParams();
  const { region } = useRegion();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const serviceIdParam = searchParams.get("service") || "construction";
  const subParam = searchParams.get("sub") || "";
  const initialModeParam = searchParams.get("mode") === "without_material" ? "without_material" : "with_material";

  const [selectedServiceId, setSelectedServiceId] = useState(serviceIdParam);
  const [packageMode, setPackageMode] = useState(initialModeParam);

  const service = useMemo(() => getServiceById(selectedServiceId), [selectedServiceId]);

  // Form states
  const [propertyType, setPropertyType] = useState("house");
  const [areaSqFt, setAreaSqFt] = useState(service.defaultArea || 1000);
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [siteAddress, setSiteAddress] = useState(user?.address || "");
  const [sitePincode] = useState(region?.pincode || "");
  const [preferredDate, setPreferredDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [preferredTime, setPreferredTime] = useState("10:00 AM - 01:00 PM");
  const [specialNotes, setSpecialNotes] = useState("");
  const [selectedSubServices, setSelectedSubServices] = useState(() => {
    if (subParam && service.subServices?.includes(subParam)) {
      return [subParam];
    }
    return service.subServices || [];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Sync default area & sub-services when service changes
  useEffect(() => {
    if (service?.defaultArea) {
      setAreaSqFt(service.defaultArea);
    }
    if (service?.subServices?.length > 0) {
      if (subParam && service.subServices.includes(subParam)) {
        setSelectedSubServices([subParam]);
      } else {
        setSelectedSubServices(service.subServices);
      }
    }
  }, [selectedServiceId, service, subParam]);

  const toggleSubService = (sub) => {
    setSelectedSubServices((prev) =>
      prev.includes(sub)
        ? (prev.length > 1 ? prev.filter((s) => s !== sub) : prev)
        : [...prev, sub]
    );
  };

  // Pricing calculations
  const ratePerSqFt = packageMode === "with_material" ? service.withMaterialRate : service.withoutMaterialRate;
  const estimatedCost = useMemo(() => {
    const area = Number(areaSqFt) || 0;
    return Math.round(area * ratePerSqFt);
  }, [areaSqFt, ratePerSqFt]);

  const presetAreas = [500, 1000, 1500, 2000, 3000];

  const handleBookNow = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showAlert({ title: "Name required", message: "Please enter your full name.", type: "warning" });
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length !== 10) {
      showAlert({ title: "Check mobile number", message: "Please enter a valid 10-digit mobile number.", type: "warning" });
      return;
    }
    if (!siteAddress.trim()) {
      showAlert({ title: "Site address required", message: "Please enter the site address or a nearby landmark.", type: "warning" });
      return;
    }

    setIsSubmitting(true);

    const bookingId = "BC-SRV-" + Math.floor(100000 + Math.random() * 900000);
    const bookingRecord = {
      id: bookingId,
      serviceId: service.id,
      serviceName: service.name,
      packageMode: packageMode,
      packageTitle: packageMode === "with_material" ? service.withMaterialTitle : service.withoutMaterialTitle,
      areaSqFt: Number(areaSqFt),
      ratePerSqFt: ratePerSqFt,
      estimatedCost: estimatedCost,
      propertyType: propertyType,
      subServicesSelected: selectedSubServices,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      siteAddress: siteAddress.trim(),
      city: region?.name || "Varanasi",
      sitePincode: sitePincode,
      preferredDate: preferredDate,
      preferredTime: preferredTime,
      specialNotes: specialNotes.trim(),
      status: "CONFIRMED",
      paymentAmountDueNow: 0,
      createdAt: new Date().toISOString()
    };

    // Store in localStorage for persistence
    try {
      const existing = JSON.parse(localStorage.getItem("buildcity_service_bookings") || "[]");
      existing.unshift(bookingRecord);
      localStorage.setItem("buildcity_service_bookings", JSON.stringify(existing));
    } catch {
      // safe fallback
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setBookingSuccess(bookingRecord);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 600);
  };

  return (
    <div data-storefront className="min-h-screen bg-slate-50 flex flex-col selection:bg-brand-500 selection:text-white">
      <div className="hidden lg:block">
        <Navbar />
      </div>
      <MobileHeader title={`Book ${service.name.toLowerCase()}`} subtitle={region?.name} />

      <main className="bc-fade-in flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 lg:pb-10">
        <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-sm text-slate-500 mb-6">
          <Link to="/" className="hover:text-navy-950 transition-colors">Home</Link>
          <span className="text-slate-300">/</span>
          <span>Services</span>
          <span className="text-slate-300">/</span>
          <span className="text-navy-950">{service.name}</span>
        </nav>

        {bookingSuccess ? (
          /* Confirmation Success Screen */
          <div className="bc-pop-in max-w-2xl mx-auto bg-white rounded-2xl p-6 sm:p-10 ring-1 ring-slate-200/80 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckIcon className="h-6 w-6" strokeWidth={2.6} /></span>
            </div>

            <div>
              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-2">
                Booking confirmed
              </span>
              <h1 className="text-xl sm:text-2xl font-semibold text-navy-950 tracking-tight">
                Your site visit is scheduled
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Our certified site engineer will visit your location for technical measurement and final quotation.
              </p>
            </div>

            {/* Booking Details Card */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 text-left border border-slate-200/80 space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="font-bold text-slate-500">Booking Reference</span>
                <span className="font-mono font-semibold text-navy-950 text-sm sm:text-base">{bookingSuccess.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Service Selected</span>
                <span className="font-semibold text-navy-950 flex items-center gap-1.5">
                  {bookingSuccess.serviceName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Package Mode</span>
                <span className="font-semibold text-brand-600">
                  {bookingSuccess.packageMode === "with_material" ? "With material (turnkey)" : "Labour only"}
                </span>
              </div>
              {bookingSuccess.subServicesSelected?.length > 0 && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 font-medium shrink-0">Scope of Work</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                    {bookingSuccess.subServicesSelected.map((s, idx) => (
                      <span key={idx} className="bg-slate-200/80 text-navy-950 font-bold text-[11px] px-2 py-0.5 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Project Area</span>
                <span className="font-bold text-navy-950">{bookingSuccess.areaSqFt} sq.ft</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Estimated Project Budget</span>
                <span className="font-semibold text-navy-950 text-base">₹{bookingSuccess.estimatedCost.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Visit Date & Slot</span>
                <span className="font-bold text-navy-950">{bookingSuccess.preferredDate} ({bookingSuccess.preferredTime})</span>
              </div>
              <div className="flex justify-between items-start pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium shrink-0">Site Address</span>
                <span className="font-bold text-navy-950 text-right max-w-xs">{bookingSuccess.siteAddress}, {bookingSuccess.city}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-emerald-700 font-bold">Advance Payment Due</span>
                <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full text-xs">₹0 (Free Inspection)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95 text-center"
              >
                Back to Home
              </Link>
              <button
                type="button"
                onClick={() => setBookingSuccess(null)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm transition-all active:scale-95"
              >
                Book Another Service
              </button>
            </div>
          </div>
        ) : (
          /* Main Interactive Booking Form */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Column: Form Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* 1. Service Header & Mode Selector */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 ring-1 ring-slate-200/80 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs border border-slate-200/80 shrink-0"
                      style={{ backgroundColor: service.bg }}
                    >
                      {renderServiceLogo(service.id, "w-8 h-8") || service.icon}
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-semibold text-navy-950 tracking-tight leading-tight">
                        {service.name}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium">
                        {service.subtitle} • Available in {region?.name || "Varanasi"}
                      </p>
                    </div>
                  </div>

                  {/* Switch Service Dropdown */}
                  <div className="shrink-0">
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-950 bg-slate-50 hover:bg-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                    >
                      {constructionServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mode Selector (With Material vs Without Material) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-sm font-medium text-slate-700 block">
                    Choose Execution Package:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* With Material Card */}
                    <div
                      onClick={() => setPackageMode("with_material")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        packageMode === "with_material"
                          ? "border-brand-500 bg-orange-50/40 shadow-xs ring-1 ring-brand-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-navy-950 flex items-center gap-1.5">
                            <PackageIcon className="h-4 w-4 text-slate-500" /> With material
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              packageMode === "with_material"
                                ? "border-brand-600 bg-brand-600"
                                : "border-slate-300"
                            }`}
                          >
                            {packageMode === "with_material" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          All branded raw materials + expert contractor + full supervision.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-orange-200/40 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Rate</span>
                        <span className="text-xs font-semibold text-brand-600">
                          ₹{service.withMaterialRate} / {service.unit}
                        </span>
                      </div>
                    </div>

                    {/* Without Material Card */}
                    <div
                      onClick={() => setPackageMode("without_material")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        packageMode === "without_material"
                          ? "border-brand-500 bg-orange-50/40 shadow-xs ring-1 ring-brand-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-navy-950 flex items-center gap-1.5">
                            <HardHatIcon className="h-4 w-4 text-slate-500" /> Labour only
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              packageMode === "without_material"
                                ? "border-brand-600 bg-brand-600"
                                : "border-slate-300"
                            }`}
                          >
                            {packageMode === "without_material" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          You provide materials; we supply certified mistries & contractors on labour rate.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-orange-200/40 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Rate</span>
                        <span className="text-xs font-semibold text-navy-950">
                          ₹{service.withoutMaterialRate} / {service.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlights List for the selected mode */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
                  <span className="text-xs font-medium text-slate-500 block mb-2">
                    Package Highlights ({packageMode === "with_material" ? "Turnkey Material Included" : "Labour Only"}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(packageMode === "with_material" ? service.highlightsWith : service.highlightsWithout)?.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                        <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.4} />
                        <span className="leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Project Details Form */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 ring-1 ring-slate-200/80 space-y-5">
                <h2 className="text-base sm:text-lg font-semibold text-navy-950 tracking-tight flex items-center gap-2">
                  Project details
                </h2>

                {/* Sub-Services Required / Scope of Work (Step 1) */}
                {service.subServices && service.subServices.length > 0 && (
                  <div className="space-y-2.5 pb-2 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[11px] font-semibold">1</span>
                        <span>Choose Sub-Category / Work Type:</span>
                      </label>
                      <span className="text-[11px] font-bold text-brand-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        Tap to select / deselect
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {service.subServices.map((sub) => {
                        const isSelected = selectedSubServices.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleSubService(sub)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 active:scale-95 cursor-pointer ${
                              isSelected
                                ? "bg-navy-950 text-white border-navy-950 shadow-xs ring-2 ring-brand-500/50"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white"
                            }`}
                          >
                            <span className={isSelected ? "text-emerald-400 font-semibold text-sm" : "text-slate-400"}>
                              {isSelected ? <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.6} /> : <PlusIcon className="h-3.5 w-3.5" />}
                            </span>
                            <span>{sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Property Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 block">
                    Property Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: "house", label: "Independent House / Villa", icon: HomeIcon },
                      { id: "flat", label: "Apartment / Flat", icon: FileTextIcon },
                      { id: "commercial", label: "Shop / Office", icon: StoreIcon },
                      { id: "plot", label: "Plot / Raw Site", icon: MapIcon }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPropertyType(t.id)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 active:scale-95 ${
                          propertyType === t.id
                            ? "border-brand-500 bg-orange-50/50 text-navy-950 font-semibold shadow-2xs"
                            : "border-slate-200 hover:border-slate-300 text-slate-600 font-bold bg-white"
                        }`}
                      >
                        <t.icon className="h-5 w-5" />
                        <span className="text-[11px] leading-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Area Input (Sq. Ft.) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Approximate Area (in Sq. Ft.)
                    </label>
                    <span className="text-xs font-bold text-brand-600">
                      ₹{ratePerSqFt} / sq.ft rate
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={service.minArea || 100}
                      max={100000}
                      step={50}
                      value={areaSqFt}
                      onChange={(e) => setAreaSqFt(Math.max(1, Number(e.target.value)))}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-navy-950 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors"
                      placeholder="Enter sq.ft"
                    />
                    <span className="font-semibold text-slate-400 text-sm shrink-0">Sq. Ft.</span>
                  </div>

                  {/* Area Quick Chips */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs text-slate-500 mr-1">
                      Quick Pick:
                    </span>
                    {presetAreas.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAreaSqFt(preset)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          Number(areaSqFt) === preset
                            ? "bg-navy-950 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {preset.toLocaleString("en-IN")} sq.ft
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project Notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 block">
                    Special Requirements or Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="e.g. Ground floor + 1st floor construction, need boundary wall and septic tank estimation..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-navy-950 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* 3. Site & Contact Info */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 ring-1 ring-slate-200/80 space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-navy-950 tracking-tight flex items-center gap-2">
                  <PinIcon className="h-[18px] w-[18px] text-slate-500" /> Contact & site address
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 block">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-950 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 block">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit Mobile Number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-950 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 block">
                    Site Address / Plot Landmark *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Plot No 42, Near Shiv Mandir, Lanka, Varanasi"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-950 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 block">
                      Preferred Date of Inspection
                    </label>
                    <input
                      type="date"
                      value={preferredDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-950 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 block">
                      Time Slot
                    </label>
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-navy-950 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="10:00 AM - 01:00 PM">Morning (10:00 AM - 01:00 PM)</option>
                      <option value="02:00 PM - 05:00 PM">Afternoon (02:00 PM - 05:00 PM)</option>
                      <option value="05:00 PM - 08:00 PM">Evening (05:00 PM - 08:00 PM)</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Estimated Payment Summary & Book CTA (5 cols) */}
            <div className="lg:col-span-5 sticky top-24 space-y-4">
              
              <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-lg border border-slate-200/90 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-xs font-medium text-brand-700 block">
                    Transparent Price Estimate
                  </span>
                  <h3 className="text-lg font-semibold text-navy-950">
                    Payment & Budget Summary
                  </h3>
                </div>

                {/* Cost Calculation Rows */}
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Service</span>
                    <span className="font-bold text-navy-950">{service.name}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Mode</span>
                    <span className="font-bold text-navy-950">
                      {packageMode === "with_material" ? "With material" : "Labour only"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Rate</span>
                    <span className="font-bold text-navy-950">
                      ₹{ratePerSqFt} per {service.unit}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Calculated Area</span>
                    <span className="font-bold text-navy-950">
                      {Number(areaSqFt).toLocaleString("en-IN")} {service.unit}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex justify-between items-baseline">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block">Total Estimated Cost</span>
                      <span className="text-[11px] text-slate-400 font-medium">Subject to physical site survey</span>
                    </div>
                    <span className="text-2xl font-semibold text-navy-950 tracking-tight">
                      ₹{estimatedCost.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Payment Due Today */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-900 block">
                        Advance Due Today
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        Zero token fee • Free site visit
                      </span>
                    </div>
                    <span className="text-base font-semibold text-emerald-700">
                      ₹0
                    </span>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>100% Escrow & Milestone-Based Payment Protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardHatIcon className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Background-verified & skilled local professionals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Detailed technical BOQ & quotation after visit</span>
                  </div>
                </div>

                {/* Prominent Book Now Button */}
                <button
                  type="button"
                  onClick={handleBookNow}
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-2xl bg-[#0A192F] hover:bg-brand-600 text-white font-semibold text-sm tracking-wide shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Scheduling Visit...</span>
                  ) : (
                    <>
                      <span>Book Now (Free Site Visit)</span>
                      <span className="text-base">→</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center font-medium">
                  By clicking Book Now, you agree to BuildCity terms & verified pro site consultation.
                </p>
              </div>

            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
