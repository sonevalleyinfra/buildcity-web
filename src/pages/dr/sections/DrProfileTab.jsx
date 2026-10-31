import {
  BadgeCheckIcon,
  LogOutIcon,
  StoreIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  PlusIcon,
  PackageIcon,
} from "../../vendor/ui/icons";
import { PageHeader, Card } from "../../vendor/ui/primitives";

function DetailRow({ icon: IconCmp, label, value, tone = "bg-slate-100 text-slate-500" }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <IconCmp className="h-[18px] w-[18px]" />
      </span>
      <span className="w-32 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-slate-900 sm:text-left">
        {value}
      </span>
    </div>
  );
}

export default function DrProfileTab({
  drName,
  drPhone,
  drEmail,
  districtName,
  stats = {},
  onAddVendor,
  onAddProduct,
  onLogout,
}) {
  const {
    totalVendorsCount = 0,
    approvedVendorsCount = 0,
    totalProductsCount = 0,
    pendingApprovalsCount = 0,
  } = stats;

  return (
    <div className="space-y-4 md:max-w-2xl">
      <PageHeader
        title="DR Account"
        subtitle={`District Representative profile & controls for ${districtName}`}
      />

      {/* Profile Hero Card */}
      <div className="vd-hero relative flex items-center gap-4 overflow-hidden rounded-2xl p-4 text-white sm:p-5">
        <span className="vd-blueprint absolute inset-0" aria-hidden="true" />
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-amber-500 text-lg font-semibold text-white shadow-[0_8px_20px_-8px_rgba(234,88,12,0.7)] ring-4 ring-white/10">
          {(drName || "D").trim().charAt(0).toUpperCase()}
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{drName}</p>
          <p className="truncate text-sm text-slate-300">{districtName} District Representative</p>
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
            <BadgeCheckIcon className="h-3.5 w-3.5" />
            Verified DR Partner
          </p>
        </div>
        <span className="vd-hairline absolute inset-x-0 bottom-0 h-[3px]" aria-hidden="true" />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Quick onboarding actions
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onAddVendor}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-3 text-xs sm:text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(194,65,12,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={2.25} />
            Add Vendor
          </button>
          <button
            type="button"
            onClick={onAddProduct}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
          >
            <PlusIcon className="h-4 w-4 text-slate-600" strokeWidth={2.25} />
            Add Listing
          </button>
        </div>
      </section>

      {/* Representative Details */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Representative details
        </h2>
        <Card className="divide-y divide-slate-100">
          <DetailRow
            icon={UserIcon}
            tone="bg-indigo-50 text-indigo-600"
            label="Representative"
            value={drName}
          />
          <DetailRow
            icon={MapPinIcon}
            tone="bg-amber-50 text-amber-600"
            label="District"
            value={`${districtName}, UP`}
          />
          <DetailRow
            icon={PhoneIcon}
            tone="bg-emerald-50 text-emerald-600"
            label="Mobile"
            value={drPhone || "Not added"}
          />
          <DetailRow
            icon={MailIcon}
            tone="bg-sky-50 text-sky-600"
            label="Email"
            value={drEmail || "Not added"}
          />
          <DetailRow
            icon={StoreIcon}
            tone="bg-brand-50 text-brand-600"
            label="District vendors"
            value={`${totalVendorsCount} (${approvedVendorsCount} approved)`}
          />
          <DetailRow
            icon={PackageIcon}
            tone="bg-purple-50 text-purple-600"
            label="Product listings"
            value={`${totalProductsCount} (${pendingApprovalsCount} pending)`}
          />
        </Card>
      </section>

      {/* Logout Button */}
      <button
        type="button"
        onClick={onLogout}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-100 cursor-pointer"
      >
        <LogOutIcon className="h-[18px] w-[18px]" />
        Log out
      </button>
    </div>
  );
}
