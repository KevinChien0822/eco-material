# 宸廷綠色工程 環保材料網站（eco-material）

宸廷綠色工程有限公司官方網站：代理茂茂峰林國際 100% 生物可分解植物纖維複合材料。

- 線上網址：https://eco-material.chanting-green.com
- 部署平台：Vercel（靜態站 + Serverless 聯絡表單）
- 語系：繁體中文（根目錄）、English（`/en/`）、Deutsch（`/de/`）、Français（`/fr/`）

## 專案結構

```
├── index.html            # 繁中首頁（build 產出）
├── en/ de/ fr/           # 其他語系（build 產出）
├── site-src/
│   ├── template.html     # 網站模板（唯一版面來源）
│   ├── locales/          # 四語系文案 JSON
│   └── build_site.py     # 建置腳本：模板 + 語系 → 各語系 HTML
├── api/contact.js        # 聯絡表單寄信 Serverless Function
├── package.json          # API 相依套件（nodemailer）
└── vercel.json
```

## 修改網站內容（標準流程）

1. 編輯 `site-src/template.html`（版面）或 `site-src/locales/*.json`（文案）
2. 重新建置：

   ```bash
   python site-src/build_site.py
   ```

3. 確認根目錄 `index.html`、`en/`、`de/`、`fr/` 已更新
4. commit 並 push 到 GitHub（若 Vercel 已串接 Git，會自動部署）

> 不要在 `en/ de/ fr/ index.html` 直接改內容 —— 下次 build 會被覆蓋。

## 聯絡表單（api/contact.js）

前端表單送出後 `fetch` 到 `/api/contact`，由 Vercel Serverless Function 以 SMTP 寄信到公司信箱。

### 需要設定的環境變數（Vercel → 專案 → Settings → Environment Variables）

| 變數 | 說明 | 範例 |
|---|---|---|
| `SMTP_HOST` | 郵件伺服器主機（必填） | `smtp.example.com` |
| `SMTP_PORT` | 埠號 | `465`（SSL）或 `587`（STARTTLS） |
| `SMTP_SECURE` | SSL 與否 | `true`（465）／`false`（587） |
| `SMTP_USER` | 寄件帳號 | `service@chanting-green.com` |
| `SMTP_PASS` | 密碼（建議用應用程式密碼） | — |
| `MAIL_TO` | 收件信箱（預設同 SMTP_USER） | `service@chanting-green.com` |
| `MAIL_FROM` | 寄件人顯示（預設同 SMTP_USER） | — |

### 本專案使用的設定（Lark / 飛書國際版郵箱）

本公司信箱托管於 Lark Mail（MX = larksuite.com），推薦設定：

| 變數 | 值 |
|---|---|
| `SMTP_HOST` | `smtp.larksuite.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false`（587 使用 STARTTLS） |
| `SMTP_USER` | `service@chanting-green.com` |
| `SMTP_PASS` | Lark「應用專用密碼」（Lark 網頁版 → 設定 → 帳號與安全 → 應用專用密碼），**勿用一般登入密碼** |

> 注意：`MAIL_FROM` 請保持與 `SMTP_USER` 相同（Lark 會拒絕與認證帳號不一致的寄件人），只改顯示名稱沒關係。

### 本機測試

```bash
npm install
vercel dev          # 起本地伺服器，http://localhost:3000 可直接測試表單
```

本機測試時可用 `.env.local` 放 SMTP 設定（已加入 .gitignore，不會上傳）。

## 安全防護（已內建）

- Honeypot 隱藏欄位擋機器人
- 輸入長度 / 信箱格式驗證（前後端都有）
- 同一信箱 60 秒限流
- SMTP 帳密只存在 Vercel 環境變數，不會進 Git

## 其他

- GA4：`G-7RE3C1L4EJ`
- 品牌圖：`宸廷Logo-去背 1140222R01-01.png`、`log0_no_background.png`（根目錄）
