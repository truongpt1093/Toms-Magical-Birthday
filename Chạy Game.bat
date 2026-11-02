@echo off
chcp 65001 >nul
echo ===================================================
echo   🎂 TOM'S MAGICAL BIRTHDAY - SINH NHẬT CỦA TÔM 🧸
echo ===================================================
echo Đang khởi chạy web server local và mở game trên trình duyệt...
start "" "http://localhost:8080/index.html"
python -m http.server 8080
pause
