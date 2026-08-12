import DashboardShell from "../../components/DashboardShell";

const stats = [
  { title: "Today's Sales", value: "₹12,450", trend: "+15%", isUp: true, icon: <RupeeIcon />, color: "bg-green-100 text-green-700" },
  { title: "Active Orders", value: "14", trend: "3 New", isUp: true, icon: <BoxIcon />, color: "bg-blue-100 text-blue-700" },
  { title: "Out of Stock", value: "3", trend: "Needs restock", isUp: false, icon: <AlertIcon />, color: "bg-red-100 text-red-700" },
  { title: "Total Products", value: "128", trend: "+2 this week", isUp: true, icon: <GridIcon />, color: "bg-purple-100 text-purple-700" },
];

const recentOrders = [
  { id: "#ORD-9081", customer: "Rahul Kumar", items: "UltraTech Cement x5", total: "₹1,950", status: "Pending", statusColor: "bg-amber-100 text-amber-700" },
  { id: "#ORD-9080", customer: "Amit Singh", items: "Asian Paints 20L x1", total: "₹2,250", status: "Ready", statusColor: "bg-blue-100 text-blue-700" },
  { id: "#ORD-9079", customer: "Neha Sharma", items: "TMT Steel Bar x10", total: "₹6,500", status: "Delivered", statusColor: "bg-green-100 text-green-700" },
  { id: "#ORD-9078", customer: "Vikas Patel", items: "Drill Machine x1", total: "₹1,200", status: "Delivered", statusColor: "bg-green-100 text-green-700" },
];

export default function VendorDashboard() {
  return (
    <DashboardShell badge="Vendor Panel" badgeColor="#F59E0B" title="Overview">
      
      {/* Quick Stats Grid  Hai ye */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stat.isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stat.trend}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-navy-900 mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-slate-500">{stat.title}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-bold text-navy-900">Recent Orders</h3>
            <button className="text-sm font-semibold text-brand-500 hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-navy-900">{order.id}</td>
                    <td className="px-6 py-4">{order.customer}</td>
                    <td className="px-6 py-4">{order.items}</td>
                    <td className="px-6 py-4 font-semibold text-navy-900">{order.total}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${order.statusColor}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-brand-500 font-medium hover:underline">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Alerts */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-navy-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full border border-slate-200 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-50 transition text-sm font-medium text-slate-700 cursor-pointer">
                <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 flex items-center justify-center">➕</div>
                Add New Product
              </button>
              <button className="w-full border border-slate-200 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-50 transition text-sm font-medium text-slate-700 cursor-pointer">
                <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 flex items-center justify-center">🏷️</div>
                Create Discount Code
              </button>
              <button className="w-full border border-slate-200 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-50 transition text-sm font-medium text-slate-700 cursor-pointer">
                <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 flex items-center justify-center">📈</div>
                View Sales Report
              </button>
            </div>
          </div>

          {/* Ads dekha sakte hai */}
          <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-xl p-6 text-white relative overflow-hidden shadow-sm">
            <div className="relative z-10">
              <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded text-white mb-2 inline-block">PRO TIP</span>
              <h4 className="text-sm font-bold mb-1">Boost your sales!</h4>
              <p className="text-xs text-white/70 mb-4 leading-relaxed">
                Products with high-quality images get 40% more orders. Update your catalog today.
              </p>
              <button className="bg-white text-navy-900 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                Update Catalog
              </button>
            </div>
            <div className="absolute -bottom-6 -right-6 text-6xl opacity-10">📸</div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// Minimal Icons
function RupeeIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3c3.31 0 6-2.69 6-6s-2.69-6-6-6"/></svg>; }
function BoxIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function AlertIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function GridIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>; }