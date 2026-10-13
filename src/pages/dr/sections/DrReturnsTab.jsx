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

  const orderMaterialsSubtotal = Math.round(
    currentReturnItems.reduce((sum, it) => sum + it.orderedQty * it.unitPrice, 0)
  );

  const orderDeliveryFee = Math.round(Math.max(0, Number(selectedReturnOrder?.deliveryFee || 0)));
  const orderWalletDiscount = Math.round(Math.max(0, Number(selectedReturnOrder?.walletDiscount || 0)));
  const orderCouponDiscount = Math.round(Math.max(0, Number(selectedReturnOrder?.discountAmount || 0)));
  const totalCheckoutDeductions = Math.min(orderMaterialsSubtotal, orderWalletDiscount + orderCouponDiscount);
  const netMaterialsCashPaid = Math.max(0, orderMaterialsSubtotal - totalCheckoutDeductions);
  const orderTotalCashPaid = netMaterialsCashPaid + orderDeliveryFee;

  const totalReturnItemsVal = Math.round(
    currentReturnItems.reduce((sum, it) => sum + it.lineReturnVal, 0)
  );

  const returnRatio =
    orderMaterialsSubtotal > 0 ? Math.min(1, totalReturnItemsVal / orderMaterialsSubtotal) : 0;

  const checkoutDiscountOnReturn = Math.round(returnRatio * totalCheckoutDeductions);
  const walletUsedOnReturn = Math.round(returnRatio * orderWalletDiscount);

  const refundableMaterialCash = Math.max(0, Math.round(totalReturnItemsVal - checkoutDiscountOnReturn));

  const totalOrderCashback = Math.round(
    Number(selectedReturnOrder?.remainingCashbackToDeduct ?? selectedReturnOrder?.cashbackEarned ?? 0)
  );
  const proportionalCashback = Math.round(returnRatio * totalOrderCashback);

  const cashbackOnReturn =
    customCashbackDeduct !== ""
      ? Math.max(0, Math.round(Number(customCashbackDeduct || 0)))
      : proportionalCashback;

  // Wallet Settlement:
  // 1. Customer's used wallet amount (e.g. ₹24) is credited back to Customer's Wallet (+₹24).
  // 2. Cashback earned on order (e.g. ₹23) is already in Customer's Wallet (₹23).
  // 3. Total in Customer's Wallet = ₹23 (Already) + ₹24 (We Add Now) = ₹47.
  // 4. Cash Refund = Returned Material Value (₹488) - Wallet Added Back (₹24) - Cashback in Wallet (₹23) = ₹441.
  const walletToCredit = walletUsedOnReturn;
  const cashbackDeductFromCash = Math.min(refundableMaterialCash, cashbackOnReturn);
  const totalWalletSettled = cashbackDeductFromCash + walletToCredit;
  const netCashToRefund = Math.max(0, Math.round(refundableMaterialCash - cashbackDeductFromCash));

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
              Search by Customer Mobile Number (e.g. 7607650875) or Order ID (e.g. #ORD-*83F2) to view delivered orders, select returned items, and calculate the net cash refund.
            </p>
          </div>
        </div>

        {/* Search Bar (Phone Number or Order ID) */}
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
              placeholder="Enter Customer Mobile No. (e.g. 7607650875) or Order ID (#ORD-*83F2)"
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

        {/* Matching Delivered Orders List - Selectable Cards */}
        {returnSearchResults.length > 0 && (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  {returnSearchResults.length}
                </span>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Matching Delivered Order{returnSearchResults.length > 1 ? "s" : ""} ({returnSearchResults.length})
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                Click an order below to select & process return
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {returnSearchResults.map((ro) => {
                const isSel = selectedReturnOrder?.id === ro.id;
                const custName = ro.customer?.name || ro.address?.fullName || "Customer";
                const custPhone = ro.customer?.phone || ro.address?.phone || "";
                const itemsCount = Array.isArray(ro.items) ? ro.items.length : 0;
                const firstItemName = ro.items?.[0]?.productName || ro.items?.[0]?.title || "";
                const moreItemsCount = itemsCount > 1 ? itemsCount - 1 : 0;

                return (
                  <button
                    key={ro.id}
                    type="button"
                    onClick={() => selectOrderForReturn(ro)}
                    className={cx(
                      "group relative flex flex-col justify-between text-left rounded-xl border p-3.5 transition-all cursor-pointer active:scale-[0.99]",
                      isSel
                        ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                    )}
                  >
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={cx(
                            "font-mono text-xs font-bold",
                            isSel ? "text-emerald-700" : "text-slate-900"
                          )}
                        >
                          {formatShortId(ro.id || ro.orderNumber, "ORD")}
                        </span>
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            ro.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {ro.status === "COMPLETED" ? "Completed" : "Delivered"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700">
                        <p className="font-semibold text-slate-900 truncate">{custName}</p>
                        {custPhone && (
                          <p className="text-[11px] font-mono text-slate-500 tabular-nums">📞 {custPhone}</p>
                        )}
                      </div>

                      {firstItemName && (
                        <p className="text-[11px] text-slate-600 truncate bg-slate-100/70 rounded px-1.5 py-0.5">
                          📦 {firstItemName}{moreItemsCount > 0 ? ` +${moreItemsCount} more` : ""}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between w-full">
                      <div className="tabular-nums">
                        <span className="text-[10px] text-slate-400 block uppercase">Total Paid</span>
                        <span className="text-xs font-bold text-slate-900">{inr(ro.totalAmount || 0)}</span>
                      </div>
                      <span
                        className={cx(
                          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          isSel
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                        )}
                      >
                        {isSel ? "✓ Selected" : "Select Order →"}
                      </span>
                    </div>
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
                  <span>{inr(totalOrderCashback)}</span>
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
                    Cashback Earned on Order (INR) — Auto-detected:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={customCashbackDeduct}
                    onChange={(e) => setCustomCashbackDeduct(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold tabular-nums text-rose-700 outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Customer earned {inr(totalOrderCashback)} cashback on this order. It is automatically adjusted against the wallet used at checkout ({inr(walletUsedOnReturn)}).
                  </p>
                </div>
              </div>

              {/* Right: Final Cash & Wallet Settlement Summary */}
              <div className="flex flex-col justify-between rounded-xl border-2 border-emerald-500/40 bg-white p-4 space-y-3 tabular-nums">
                <div className="space-y-2.5">
                  <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">
                    Step 3: Final Cash & Wallet Settlement Summary
                  </h4>

                  {/* 1. Cash Hisaab: Total Order (with Delivery) (-) Delivery (-) Wallet Added (-) Cashback = Net Cash */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      1. Cash Refund Calculation
                    </p>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>Total Order Value (with Delivery):</span>
                      <span className="font-bold text-slate-900">
                        {inr(totalReturnItemsVal + orderDeliveryFee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-rose-600">
                      <span>(-) Delivery Charge Deducted:</span>
                      <span className="font-bold">- {inr(orderDeliveryFee)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 border-t border-dashed border-slate-200 pt-1">
                      <span>Returned Product Value (Materials):</span>
                      <span className="font-bold">{inr(totalReturnItemsVal)}</span>
                    </div>
                    {walletToCredit > 0 && (
                      <div className="flex items-center justify-between text-xs font-medium text-amber-800">
                        <span>(-) Wallet Used (Added Back to Wallet):</span>
                        <span className="font-bold">- {inr(walletToCredit)}</span>
                      </div>
                    )}
                    {checkoutDiscountOnReturn > walletToCredit && (
                      <div className="flex items-center justify-between text-xs font-medium text-purple-700">
                        <span>(-) Coupon Discount Deducted:</span>
                        <span className="font-bold">- {inr(checkoutDiscountOnReturn - walletToCredit)}</span>
                      </div>
                    )}
                    {cashbackDeductFromCash > 0 && (
                      <div className="flex items-center justify-between text-xs font-medium text-rose-600">
                        <span>(-) Cashback (Already in Customer Wallet):</span>
                        <span className="font-bold">- {inr(cashbackDeductFromCash)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span>(=) Net Cash to Give Customer:</span>
                      <span className="text-sm font-bold text-emerald-700">{inr(netCashToRefund)}</span>
                    </div>
                  </div>

                  {/* 2. Wallet Hisaab: Cashback Already in Wallet (23) + Wallet Used Added Now (24) = Total in Wallet (47) */}
                  {(walletToCredit > 0 || cashbackDeductFromCash > 0) && (
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                        2. Wallet Settlement Calculation
                      </p>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Cashback Already in Customer Wallet:</span>
                        <span className="font-bold text-slate-900">{inr(cashbackDeductFromCash)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
                        <span>(+) Wallet Used at Order (We Add Now):</span>
                        <span className="font-bold">+ {inr(walletToCredit)}</span>
                      </div>
                      <div className="border-t border-amber-200/80 pt-1.5 flex items-center justify-between text-xs font-bold text-amber-900">
                        <span>(=) Total in Customer Wallet:</span>
                        <span className="text-sm text-emerald-700">
                          {inr(totalWalletSettled)} ({inr(cashbackDeductFromCash)} Already + {inr(walletToCredit)} Added Now)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. Final Total Order Settled Proof (Cash + Wallet = Product Value) */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">Net Cash Refund (In Hand):</span>
                      <span className="text-lg font-bold text-emerald-700">{inr(netCashToRefund)}</span>
                    </div>
                    {totalWalletSettled > 0 && (
                      <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                        <span>+ Total in Wallet ({inr(cashbackDeductFromCash)} Cashback + {inr(walletToCredit)} Wallet):</span>
                        <span>{inr(totalWalletSettled)}</span>
                      </div>
                    )}
                    <div className="border-t border-emerald-200/80 pt-1.5 flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>Total Order Product Value Settled:</span>
                      <span>
                        {inr(netCashToRefund)} Cash + {inr(totalWalletSettled)} Wallet = {inr(netCashToRefund + totalWalletSettled)}
                      </span>
                    </div>
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
                      <span>Processing Return & Settling Wallet...</span>
                    </>
                  ) : (
                    <span>Confirm Return, Settle Wallet & Restore Vendor Stock</span>
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
