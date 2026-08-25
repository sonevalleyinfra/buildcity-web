@echo off
git add src/context/AdminContext.jsx src/pages/customer/Cart.jsx
git commit -m "feat: Realtime live polling and event-driven coupon sync on Cart page"
git push origin main
echo Done pushing to GitHub!
