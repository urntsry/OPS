#!/bin/bash

# THERMOTECH-OPS Vercel 部署腳本

echo "=================================="
echo "THERMOTECH-OPS 部署到 Vercel"
echo "=================================="
echo ""

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在 thermotech-ops-app 目錄下執行此腳本"
    exit 1
fi

# 檢查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 安裝 Vercel CLI..."
    npm install -g vercel
fi

# 登入 Vercel
echo "🔐 登入 Vercel..."
vercel login

# 部署
echo "🚀 開始部署..."
vercel --prod

echo ""
echo "✅ 部署完成！"
echo "請在瀏覽器開啟 Vercel 提供的網址測試"

