@echo off
chcp 65001 >nul 2>&1
color 0B
title THERMOTECH-OPS 開發伺服器

echo.
echo ╔════════════════════════════════════════════════════════════════════════════╗
echo ║                         THERMOTECH-OPS 啟動中...                          ║
echo ╚════════════════════════════════════════════════════════════════════════════╝
echo.

cd thermotech-ops-app

echo [步驟 1/2] 檢查環境設定檔...
if not exist .env.local (
    echo.
    echo ⚠️  警告：找不到 .env.local 檔案
    echo.
    echo 請依照以下步驟建立：
    echo 1. 在 thermotech-ops-app 資料夾中建立 .env.local 檔案
    echo 2. 參考 SETUP_ENV.md 的內容
    echo.
    pause
    exit /b 1
)

echo [步驟 2/2] 啟動開發伺服器...
echo.
echo ════════════════════════════════════════════════════════════════════════════
echo 開發伺服器即將在 http://localhost:3000 啟動
echo 按 Ctrl+C 可停止伺服器
echo ════════════════════════════════════════════════════════════════════════════
echo.

npm run dev


