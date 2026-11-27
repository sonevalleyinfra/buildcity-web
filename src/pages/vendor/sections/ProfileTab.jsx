import { BadgeCheckIcon, PhoneIcon, ChatIcon, ChevronRightIcon, LogOutIcon, StoreIcon, UserIcon, MailIcon, MapPinIcon } from "../ui/icons";
import { PageHeader, Card } from "../ui/primitives";
import { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP } from "../support";

function DetailRow({ icon: IconCmp, label, value, tone = "bg-slate-100 text-slate-500" }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <IconCmp className="h-[18px] w-[18px]" />
      </span>
      <span className="w-28 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-slate-900 sm:text-left">{value}</span>
    </div>
  );
}

function ActionRow({ icon: IconCmp, label, detail, ...linkProps }) {
  return (
    <a {...linkProps} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-emerald-50/60 active:bg-emerald-50 sm:px-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <IconCmp className="h-[18px] w-[18px]" />
      </span>
      <span className="flex-1 text-sm font-medium text-slate-900">{label}</span>
      {detail && <span className="text-sm text-slate-500">{detail}</span>}
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-600" />
    </a>
  );
}

export default function ProfileTab({ ownerName, shopName, vendorPhone, email, districtName, onLogout }) {
  return (
    <div className="space-y-4 md:max-w-2xl">
      <PageHeader title="Account" />

      <div className="vd-hero relative flex items-center gap-4 overflow-hidden rounded-2xl p-4 text-white sm:p-5">
        <span className="vd-blueprint absolute inset-0" aria-hidden="true" />
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-amber-500 text-lg font-semibold text-white shadow-[0_8px_20px_-8px_rgba(234,88,12,0.7)] ring-4 ring-white/10">
          {(ownerName || "V").trim().charAt(0).toUpperCase()}
        </div>
        <div className="relative min-w-0">
          <p className="truncate text-base font-semibold text-white">{ownerName}</p>
          <p className="truncate text-sm text-slate-300">{shopName}</p>
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
            <BadgeCheckIcon className="h-3.5 w-3.5" />
            Verified partner
          </p>
        </div>
        <span className="vd-hairline absolute inset-x-0 bottom-0 h-[3px]" aria-hidden="true" />
      </div>

      <section>
        <h2 className="mb-2 px-1 text-sm font-medium text-slate-500">Business details</h2>
        <Card className="divide-y divide-slate-100">
          <DetailRow icon={StoreIcon} tone="bg-brand-50 text-brand-600" label="Shop" value={shopName} />
          <DetailRow icon={UserIcon} tone="bg-indigo-50 text-indigo-600" label="Owner" value={ownerName} />
          <DetailRow icon={PhoneIcon} tone="bg-emerald-50 text-emerald-600" label="Mobile" value={vendorPhone} />
          <DetailRow icon={MailIcon} tone="bg-sky-50 text-sky-600" label="Email" value={email || "Not added"} />
          <DetailRow icon={MapPinIcon} tone="bg-amber-50 text-amber-600" label="Region" value={`${districtName}, UP`} />
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-medium text-slate-500">Support</h2>
        <Card className="divide-y divide-slate-100 overflow-hidden">
          <ActionRow icon={PhoneIcon} label="Call district team" detail={<span className="hidden sm:inline">{SUPPORT_PHONE_DISPLAY}</span>} href={`tel:${SUPPORT_PHONE}`} />
          <ActionRow icon={ChatIcon} label="Chat on WhatsApp" href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" />
        </Card>
      </section>

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
