@echo off
git add server/src/index.js server/prisma/schema.prisma src/context/AdminContext.jsx src/pages/admin/AdminDashboard.jsx src/pages/customer/Cart.jsx
git commit -m "feat: Add persistent Coupons model and API endpoints in Express backend"
git push origin main
echo Done pushing to GitHub!
