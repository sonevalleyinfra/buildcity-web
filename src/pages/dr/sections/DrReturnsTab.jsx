import { formatShortId, formatDateTimeIST } from "../../../utils/formatId";
import { SearchIcon } from "../../vendor/ui/icons";
import { RotateCcwIcon } from "../DrShell";
import { Card, StatusBadge, EmptyState, Spinner } from "../../vendor/ui/primitives";
import { inr, cx } from "../../vendor/ui/format";

export default function DrReturnsTab({
  districtName,
  returnSearchQuery,
  setReturnSearchQuery,
  returnSearchMessage,
  setReturnSearchMessage,
  returnSearchResults,
  selectedReturnOrder,
  selectOrderForReturn,
  isSearchingReturnOrder,
  handleSearchReturnOrder,
  returnQuantities,
  handleReturnQtyChange,
  returnReason,
  setReturnReason,
  customCashbackDeduct,
  setCustomCashbackDeduct,
  isSubmittingReturn,
  handleProcessReturn,
  processedReturns,
  loadingReturnsHistory,
  fetchProcessedReturns,
}) {
  const currentReturnItems = (selectedReturnOrder?.items || []).map((it) => {
    const key = it.id || it.vendorProductId || it.productName;
    const orderedQty = Number(it.quantity || 1);
    const alreadyRetQty = Number(selectedReturnOrder?.returnedQtyMap?.[key] || 0);
    const maxReturnable = Math.max(0, orderedQty - alreadyRetQty);
    const selectedQty = Math.min(maxReturnable, Math.max(0, Number(returnQuantities[key] || 0)));
    const unitPrice = Number(it.priceAtPurchase || it.price || 0);
    const lineReturnVal = Math.round(selectedQty * unitPrice * 100) / 100;
    return {
      ...it,
      key,
      orderedQty,
      alreadyRetQty,
      maxReturnable,
      selectedQty,
      unitPrice,
      lineReturnVal,
    };
  });

  const orderMaterialsSubtotal =
    Math.round(currentReturnItems.reduce((sum, it) => sum + it.orderedQty * it.unitPrice, 0) * 100) / 100;

  const orderDeliveryFee = Math.max(0, Number(selectedReturnOrder?.deliveryFee || 0));
  const orderWalletDiscount = Math.max(0, Number(selectedReturnOrder?.walletDiscount || 0));
  const orderCouponDiscount = Math.max(0, Number(selectedReturnOrder?.discountAmount || 0));
  const orderTotalCashPaid = Math.max(0, Number(selectedReturnOrder?.totalAmount || 0));

  // Delivery fee is strictly non-refundable; actual cash paid for materials is (totalAmount - deliveryFee)
  const netMaterialsCashPaid = Math.max(0, Math.round((orderTotalCashPaid - orderDeliveryFee) * 100) / 100);
  const totalCheckoutDeductions = Math.max(
    0,
    Math.round((orderMaterialsSubtotal - netMaterialsCashPaid) * 100) / 100
  );

  const totalReturnItemsVal =
    Math.round(currentReturnItems.reduce((sum, it) => sum + it.lineReturnVal, 0) * 100) / 100;

  const checkoutDiscountOnReturn =
    orderMaterialsSubtotal > 0
      ? Math.round((totalReturnItemsVal / orderMaterialsSubtotal) * totalCheckoutDeductions * 100) / 100
      : 0;

  const refundableMaterialCash = Math.max(
    0,
    Math.round((totalReturnItemsVal - checkoutDiscountOnReturn) * 100) / 100
  );

  const rawCbDeduct =
    customCashbackDeduct !== ""
      ? Number(customCashbackDeduct || 0)
      : Number(selectedReturnOrder?.remainingCashbackToDeduct ?? selectedReturnOrder?.cashbackEarned ?? 0);

  const effectiveCashbackDeduct =
    refundableMaterialCash > 0 ? Math.min(refundableMaterialCash, Math.max(0, rawCbDeduct)) : 0;

  const netCashToRefund = Math.max(
    0,
    Math.round((refundableMaterialCash - effectiveCashbackDeduct) * 100) / 100
  );

  return (
    <div className="space-y-5">
      {/* Search & Process Return Card */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-slate-900">
                DR Return & Refund Desk ({districtName})
              </h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Delivered Orders Only
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Search an order by its Order ID or last 4 characters to select returned items, deduct wallet cashback, and calculate the net cash refund.
            </p>
          </div>
        </div>

        {/* Search Bar (Order ID or Last 4 Characters Only) */}
        <form onSubmit={handleSearchReturnOrder} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={returnSearchQuery}
              onChange={(e) => {
                setReturnSearchQuery(e.target.value);
                if (returnSearchMessage) setReturnSearchMessage("");
              }}
              placeholder="Enter Order ID or last 4 characters (e.g. #ORD-*83F2 or 83F2)"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-[border-color,background-color,box-shadow] focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingReturnOrder}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-navy-950 px-6 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#0d224d] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isSearchingReturnOrder ? (
              <>
                <Spinner className="h-3.5 w-3.5" />
                <span>Searching...</span>
              </>
            ) : (
              <span>Search Order</span>
            )}
          </button>
        </form>

        {/* Status / Error Message (e.g. "Order not delivered" or "Order not found.") */}
        {returnSearchMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-700">
            {returnSearchMessage}
          </div>
        )}

        {/* If multiple delivered orders match last 4 characters, allow selecting */}
        {returnSearchResults.length > 1 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Matching Delivered Orders ({returnSearchResults.length}) — Select an order:
            </p>
            <div className="flex flex-wrap gap-2">
              {returnSearchResults.map((ro) => {
                const isSel = selectedReturnOrder?.id === ro.id;
                return (
                  <button
                    key={ro.id}
                    type="button"
                    onClick={() => selectOrderForReturn(ro)}
                    className={cx(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                      isSel
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-900 hover:border-emerald-300"
                    )}
                  >
                    <span>{formatShortId(ro.id || ro.orderNumber, "ORD")}</span>
                    <span className="opacity-80">· {inr(ro.totalAmount || 0)}</span>
                    <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px]">
                      {ro.status === "COMPLETED" ? "Completed" : "Delivered"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Order Return Card */}
        {selectedReturnOrder && (
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/10 p-4 sm:p-5 space-y-4">
            {/* Order Header Info & Bill Breakdown */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    Order ID:{" "}
                    <span className="font-mono text-brand-700">
                      {formatShortId(selectedReturnOrder.id || selectedReturnOrder.orderNumber, "ORD")}
                    </span>
                  </span>
                  <StatusBadge status={(selectedReturnOrder.status || "DELIVERED").toUpperCase()} />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Customer:{" "}
                  <span className="text-slate-900">
                    {selectedReturnOrder.customer?.name || selectedReturnOrder.address?.fullName || "Customer"}
                  </span>
                  {"  "}·{"  "}
                  Phone:{" "}
                  <span className="font-bold text-brand-700 tabular-nums">
                    {selectedReturnOrder.customer?.phone || selectedReturnOrder.address?.phone || "N/A"}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  Address: {selectedReturnOrder.address?.street || "Site Delivery"},{" "}
                  {selectedReturnOrder.address?.city || districtName}
                </p>
              </div>

              {/* Order Bill Breakdown */}
              <div className="min-w-[260px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1 tabular-nums">
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Materials Subtotal:</span>
                  <span className="font-semibold text-slate-900">{inr(orderMaterialsSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Delivery Charge (Non-Refundable):</span>
                  <span className="font-semibold text-slate-700">{inr(orderDeliveryFee)}</span>
                </div>
                {orderWalletDiscount > 0 && (
                  <div className="flex items-center justify-between text-amber-700 font-medium">
                    <span>Wallet Paid at Checkout:</span>
                    <span className="font-semibold">- {inr(orderWalletDiscount)}</span>
                  </div>
                )}
                {orderCouponDiscount > 0 && (
                  <div className="flex items-center justify-between text-purple-700 font-medium">
                    <span>Coupon Discount:</span>
                    <span className="font-semibold">- {inr(orderCouponDiscount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1 flex items-center justify-between font-bold text-slate-900">
                  <span>Total Cash Paid on Delivery:</span>
                  <span className="text-sm">{inr(orderTotalCashPaid)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700">
                  <span>Cashback Earned on Order:</span>
                  <span>{inr(selectedReturnOrder.cashbackEarned || 0)}</span>
                </div>
              </div>
            </div>

            {/* Items List with [-] Qty [+] Counter */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Step 1: Select Return Quantity (Ordered Items Auto-Loaded)
                </h3>
                <span className="text-[11px] font-medium text-slate-500">
                  Use [ - ] [ + ] or type quantity directly
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {currentReturnItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.productName || item.name}</p>
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 font-medium">
                        <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-semibold text-sky-800">
                          Delivered: {item.orderedQty} Units
                        </span>
                        <span>
                          Rate: <strong className="text-slate-900">{inr(item.unitPrice)}</strong> / unit
                        </span>
                        {item.vendorName && <span className="text-brand-700">Vendor: {item.vendorName}</span>}
                        {item.alreadyRetQty > 0 && (
                          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Already Returned: {item.alreadyRetQty}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Counter Controls */}
                    <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
                        <button
                          type="button"
                          disabled={item.selectedQty <= 0}
                          onClick={() => handleReturnQtyChange(item.key, item.selectedQty - 1, item.maxReturnable)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base font-bold text-slate-900 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 cursor-pointer disabled:opacity-40"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={item.maxReturnable}
                          value={item.selectedQty}
                          onChange={(e) => handleReturnQtyChange(item.key, e.target.value, item.maxReturnable)}
                          className="w-14 rounded-lg border border-slate-200 bg-white py-1.5 text-center text-xs font-bold tabular-nums text-slate-900 outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          disabled={item.selectedQty >= item.maxReturnable}
                          onClick={() => handleReturnQtyChange(item.key, item.selectedQty + 1, item.maxReturnable)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base font-bold text-slate-900 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 cursor-pointer disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={item.maxReturnable <= 0}
                        onClick={() => handleReturnQtyChange(item.key, item.maxReturnable, item.maxReturnable)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 cursor-pointer disabled:opacity-40"
                      >
                        All ({item.maxReturnable})
                      </button>

                      {item.selectedQty > 0 && (
                        <button
                          type="button"
                          onClick={() => handleReturnQtyChange(item.key, 0, item.maxReturnable)}
                          className="px-1.5 py-1 text-xs font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}

                      <div className="min-w-[110px] text-right tabular-nums">
                        <span className="block text-[10px] font-semibold uppercase text-slate-400">
                          Item Return Value
                        </span>
                        <span
                          className={cx(
                            "text-sm font-bold",
                            item.lineReturnVal > 0 ? "text-emerald-700" : "text-slate-400"
                          )}
                        >
                          {inr(item.lineReturnVal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2 & Step 3: Reason & Final Cash Refund Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Return Reason */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                  Step 2: Return Reason / Notes
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500"
                >
                  <option value="Excess unused material leftover">Excess unused material leftover</option>
                  <option value="Damaged / Defective material">Damaged / Defective material</option>
                  <option value="Wrong grade or brand delivered">Wrong grade or brand delivered</option>
                  <option value="Customer cancelled partial items on site">
                    Customer cancelled partial items on site
                  </option>
                </select>

                <div className="pt-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Wallet Cashback Deduction (INR) — Auto-detected from Order:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customCashbackDeduct}
                    onChange={(e) => setCustomCashbackDeduct(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold tabular-nums text-rose-700 outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Customer earned {inr(selectedReturnOrder.cashbackEarned || 0)} cashback on this order. This amount will be deducted from the return refund.
                  </p>
                </div>
              </div>

              {/* Right: Final Cash Refund Summary */}
              <div className="flex flex-col justify-between rounded-xl border-2 border-emerald-500/40 bg-white p-4 space-y-3 tabular-nums">
                <div className="space-y-2">
                  <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">
                    Step 3: Final Cash Refund Summary
                  </h4>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Returned Items Gross Value:</span>
                    <span className="font-bold text-slate-900">{inr(totalReturnItemsVal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Delivery Charge (Non-Refundable):</span>
                    <span>{inr(orderDeliveryFee)} (Not Refunded)</span>
                  </div>
                  {checkoutDiscountOnReturn > 0 && (
                    <>
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
                        <span>(-) Wallet / Coupon Used at Checkout:</span>
                        <span className="font-bold">- {inr(checkoutDiscountOnReturn)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-1.5 text-xs font-bold text-slate-900">
                        <span>(=) Cash Paid for Returned Items:</span>
                        <span>{inr(refundableMaterialCash)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-xs font-semibold text-rose-600">
                    <span>(-) Wallet Cashback Deducted:</span>
                    <span className="font-bold">- {inr(effectiveCashbackDeduct)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-800">Net Cash to Refund Customer:</span>
                    <span className="text-xl font-bold text-emerald-700">{inr(netCashToRefund)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmittingReturn || totalReturnItemsVal <= 0}
                  onClick={handleProcessReturn}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.99] cursor-pointer disabled:opacity-40"
                >
                  {isSubmittingReturn ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      <span>Processing Return & Updating Stock...</span>
                    </>
                  ) : (
                    <span>Confirm Return, Deduct Cashback & Restore Vendor Stock</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Saved Return Records History */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Saved Return Records in {districtName}
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
                {processedReturns.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Complete log of all returns filed by DR, stock restored, and net cash refunded.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchProcessedReturns}
            className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
          >
            Refresh List
          </button>
        </div>

        {loadingReturnsHistory ? (
          <div className="py-8 text-center text-xs font-medium text-slate-400">
            Loading return records...
          </div>
        ) : processedReturns.length === 0 ? (
          <EmptyState
            icon={RotateCcwIcon}
            title="No return records found yet"
            description="Completed returns and cash refund logs will appear here."
          />
        ) : (
          <>
            {/* Mobile Return Cards */}
            <div className="space-y-3 md:hidden">
              {processedReturns.map((ret) => {
                const rItems = Array.isArray(ret.returnItems) ? ret.returnItems : [];
                return (
                  <div
                    key={ret.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-brand-700">
                          {formatShortId(ret.orderId || ret.order?.orderNumber, "ORD")}
                        </span>
                        <p className="text-[11px] text-slate-400">{formatDateTimeIST(ret.createdAt)}</p>
                      </div>
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold tabular-nums text-emerald-800">
                        Refund: {inr(ret.netRefundCash || 0)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800">
                      {ret.customerName || "Customer"}{" "}
                      {ret.customerPhone && (
                        <span className="font-normal text-slate-500">· {ret.customerPhone}</span>
                      )}
                    </p>

                    <div className="space-y-1 rounded-lg bg-white p-2.5 border border-slate-200/80 text-xs">
                      {rItems.map((ri, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800 truncate">{ri.productName}</span>
                          <span className="shrink-0 font-semibold text-emerald-700 tabular-nums">
                            Qty: {ri.quantity} @ {inr(ri.price)}
                          </span>
                        </div>
                      ))}
                      {ret.returnReason && (
                        <p className="pt-1 text-[11px] text-slate-400">Reason: {ret.returnReason}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                      <span>Return Value: {inr(ret.returnAmount || 0)}</span>
                      <span className="text-rose-600 font-semibold">
                        Cashback Cut: - {inr(ret.cashbackDeducted || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Return Records Table */}
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Return Date & Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Returned Items</th>
                    <th className="py-3 px-4">Return Value</th>
                    <th className="py-3 px-4">Cashback Cut</th>
                    <th className="py-3 px-4">Net Cash Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedReturns.map((ret) => {
                    const rItems = Array.isArray(ret.returnItems) ? ret.returnItems : [];
                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <span className="block font-mono font-bold text-brand-700">
                            {formatShortId(ret.orderId || ret.order?.orderNumber, "ORD")}
                          </span>
                          <span className="text-[11px] text-slate-400">{formatDateTimeIST(ret.createdAt)}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="block font-semibold text-slate-900">
                            {ret.customerName || "Customer"}
                          </span>
                          <span className="text-[11px] text-slate-500 tabular-nums">{ret.customerPhone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {rItems.map((ri, i) => (
                              <div key={i} className="text-[11px]">
                                <span className="font-semibold text-slate-900">· {ri.productName}</span>
                                <span className="ml-1.5 font-bold text-emerald-700">
                                  Returned: {ri.quantity} {ri.orderedQuantity ? `(of ${ri.orderedQuantity})` : ""}
                                </span>
                                <span className="ml-1 text-slate-400">@ {inr(ri.price)}</span>
                              </div>
                            ))}
                            <span className="block text-[10px] text-slate-400">
                              Reason: {ret.returnReason}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold tabular-nums text-slate-700">
                          {inr(ret.returnAmount || 0)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold tabular-nums text-rose-600">
                          - {inr(ret.cashbackDeducted || 0)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold tabular-nums text-emerald-800">
                            {inr(ret.netRefundCash || 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
