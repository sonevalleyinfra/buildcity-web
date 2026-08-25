@echo off
git add src/context/CartContext.jsx src/pages/customer/Cart.jsx src/pages/customer/Checkout.jsx
git commit -m "feat: Block order placement until region prices are updated from live DB & auto remove unavailable products"
git push origin main
echo Done pushing to GitHub!
