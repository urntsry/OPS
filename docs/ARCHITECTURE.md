# THERMOTECH-OPS 系統架構指南

## 1. 技術棧 (The Tech Stack)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email/Password + Magic Link)
- **Styling**: Tailwind CSS (Custom Win95 Config)
- **State Management**: Zustand (Window Manager & Task State)
- **Icons**: Lucide React (Pixelated Style)

## 2. 目錄結構 (Directory Structure)
```
/src
  /app                 # Next.js App Router
    /(auth)            # 登入/註冊頁面 (Route Group)
    /(desktop)         # 桌面模式路由 (Manager View)
    /(mobile)          # PDA模式路由 (Worker View)
    /api               # Cron Jobs & Backend Logic
  /components
    /win95             # 核心 UI 元件 (Button, Window, Taskbar)
    /features          # 業務功能元件 (TaskGrid, ScoreBoard)
    /shared            # 共用元件
  /lib
    /supabase          # Database Clients (Client/Server/Admin)
    /stores            # Zustand Stores
    /utils             # Helper Functions
    /hooks             # Custom React Hooks
  /types               # TypeScript Interfaces (Database Generated)
```

## 3. 雙軌設計哲學 (The Dual-Reality UX)
系統根據裝置寬度自動切換兩種模式：

### A. PDA Mode (Mobile < 768px)
- **目標用戶**: 現場作業員 (Aunties/Uncles)
- **設計原則**: 
  - "Big Buttons" (大按鈕)
  - "No Dragging" (無拖曳)
  - "Linear Flow" (線性流程)
- **核心功能**: 每日任務列表、拍照回報、異常通報

### B. Desktop Mode (Desktop >= 768px)
- **目標用戶**: 管理者 (Managers/Admins)
- **設計原則**: 
  - "Win95 Experience" (多視窗、拖曳)
  - "Data Density" (高密度資訊)
  - "Dashboard" (全域監控)
- **核心功能**: 任務總覽、人員管理、報表分析

## 4. 資料庫策略 (Database Strategy)
- **Single Source of Truth**: 所有任務定義來自 `task_definitions`。
- **Daily Generation**: 透過 Cron Job 每日凌晨從 `task_definitions` 生成 `daily_assignments`。
- **Optimistic UI**: 前端操作 (如打勾) 立即反映，背景非同步更新資料庫。

## 5. 命名規範 (Naming Conventions)
- **Component**: `PascalCase` (e.g., `Win95Button.tsx`)
- **File/Folder**: `kebab-case` (e.g., `task-list/`)
- **Database**: `snake_case` (e.g., `task_definitions`)
- **Zustand Store**: `useStoreName` (e.g., `useWindowManager`)


