@echo off
git add .
git commit -m "refactor: Completely remove all GST terms, fields, and database columns across entire application"
git push origin main
echo Done pushing to GitHub!
