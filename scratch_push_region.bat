@echo off
git add src/context/CartContext.jsx src/pages/customer/Cart.jsx
git commit -m "feat: Add regional cart price recalculation option on region change"
git push origin main
echo Done pushing to GitHub!
