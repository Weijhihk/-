<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Studio React App

這是一個基於 Vite + React + TypeScript 開發的應用程式，整合了 Google Gemini AI 能力。

## 🚀 快速開始

### 前置作業
- 安裝 [Node.js](https://nodejs.org/) (建議 v20 以上)

### 本地開發步驟
1. **安裝套件**
   ```bash
   npm install
   ```
2. **設定環境變數**
   請複製 `.env.example` 並重新命名為 `.env.local`，然後填入您的 API Key：
   ```text
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
   啟動後可在瀏覽器開啟 `http://localhost:3000` 進行預覽。

## 🛠️ 專案架構與指令

- `npm run dev`: 啟動開發環境。
- `npm run build`: 進行專案打包編譯。
- `npm run lint`: 執行 TypeScript 類型檢查。
- `npm run clean`: 清除編譯後的 `dist` 資料夾。

## 🚢 自動化部屬 (GitHub Actions)

本專案已設定 GitHub Actions。當您將程式碼推送到 `main` 或 `master` 分支時，系統會自動編譯並部屬至 **GitHub Pages**。

### 設定步驟
1. 前往 GitHub 儲存庫的 **Settings > Secrets and variables > Actions**。
2. 新增一個 Repository secret，名稱為 `GEMINI_API_KEY`，內容為您的 Gemini API Key。
3. 前往 **Settings > Pages**，將 Build and deployment 的 Source 設定為 `GitHub Actions`。

## 📝 備註
- 已設定 `.gitignore` 以避免機密文件（如 `.env`）與大型資料夾（如 `node_modules`）被上傳至 GitHub。
- 使用 `better-sqlite3` 處理本地資料儲存邏輯。
