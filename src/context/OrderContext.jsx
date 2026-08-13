import { createContext, useContext, useEffect, useState } from "react";

const OrderContext = createContext(null);
const STORAGE_KEY = "buildcity_orders";

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOrders(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  // TEMPORARY MOCK - replace with POST /api/v1/orders jab backend ban jaye ga tab  connect with real database 
  const placeOrder = ({ items, address, total }) => {
    const order = {
      id: "BC" + Math.floor(10000 + Math.random() * 89999),
      date: new Date().toISOString(),
      status: "Pending",
      items,
      address,
      total,
    };
    setOrders((prev) => [order, ...prev]);
    return order;
  };

  const getOrder = (id) => orders.find((o) => o.id === id);

  return (
    <OrderContext.Provider value={{ orders, placeOrder, getOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used inside OrderProvider");
  return ctx;
}