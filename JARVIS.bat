@echo off
rem J.A.R.V.I.S. - Windows uchun bir bosishda ishga tushirish.
rem Ikki marta bosing. Birinchi safar kerakli narsalarni o'zi o'rnatadi.
setlocal
cd /d "%~dp0"
title J.A.R.V.I.S.

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js topilmadi. Hozir yuklab olish sahifasi ochiladi.
  echo  O'rnatib bo'lgach, shu faylni qaytadan ishga tushiring.
  start "" https://nodejs.org
  pause
  exit /b 1
)

where claude >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Claude Code o'rnatilmoqda...
  call npm install -g @anthropic-ai/claude-code
  if errorlevel 1 (
    echo  Claude Code o'rnatilmadi. Yuqoridagi xatoni tekshiring.
    pause
    exit /b 1
  )
  echo.
  echo  Endi Claude hisobingizga kiring: ochilgan oynada login qiling,
  echo  so'ng /exit deb yozib chiqing.
  call claude
)

if not exist node_modules (
  echo.
  echo  Birinchi ishga tushirish: kutubxonalar o'rnatilmoqda ^(bir necha daqiqa^)...
  call npm install
  if errorlevel 1 (
    echo  O'rnatishda xato. Internetni tekshirib, qaytadan urinib ko'ring.
    pause
    exit /b 1
  )
)

echo.
echo  [1] Faqat shu noutbukda
echo  [2] Noutbuk + telefon ^(bitta Wi-Fi, QR kod^)
echo  [3] Noutbuk + telefon ^(internet orqali, istalgan tarmoqda^)
echo.
choice /c 123 /n /m "  Tanlang (1, 2 yoki 3): "
if errorlevel 3 goto publicmode
if errorlevel 2 goto phonemode
start "" http://localhost:5173
call npm start
goto done

:phonemode
call npm run phone
goto done

:publicmode
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Internet tunnel dasturi ^(cloudflared^) o'rnatilmoqda...
  winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
  echo.
  echo  O'rnatib bo'lindi. Oynani yopib, JARVIS.bat ni qaytadan ishga tushiring
  echo  va yana 3 ni tanlang.
  pause
  exit /b 0
)
call npm run public

:done
pause
