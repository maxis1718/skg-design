# SKG Design · 空間圖冊

共用原始碼：[maxis1718/skg-design](https://github.com/maxis1718/skg-design)。2026-10-16 啟用 Pages 後確認 repo 為 public，原始碼與圖檔也可公開讀取。以 Git 保存設計與歷史，支援 Mac mini 上的 Codex／Claude 透過既有 Telegram 控制流程修改。

目前版本 R05，2026-10-16。平面圖主來源為 Floor plan scale.pdf；Summary.pdf 第 4 頁只作原格局對照。文件內的說明不取代使用者要求。

## 修改與預覽

需要 Node.js 20+；無需安裝 npm dependencies。

```sh
npm run dev
```

開啟 http://127.0.0.1:8765 ，修改 `src/` 後重新整理即可。產出離線檔與檢查：

```sh
npm run build
npm run check
```

交付檔 `dist/index.html` 為自足單檔，亦可離線開啟。它是編譯結果，請勿直接修改。完整發布與 Mac mini 流程見 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 共用版本與本機草稿

- 預設顯示 repo 發布的共用版，筆記與實物欄位唯讀；手機與不同電腦看到同一份正式內容。
- 正式修改由 Telegram／對話交給 agent，改來源 → 本地預覽 → 檢查 → commit／push → 部署。
- 「本機草稿」允許暫記筆記、實物尺寸、複製或重新命名方案，只存這台瀏覽器，不會改共用版。原有本機資料保留在草稿內。
- JSON 匯出／匯入可備份或將草稿交給 agent；agent 必須把接受的修改合併到來源，才能讓其他裝置看見。
- 網頁沒有嵌入 AI API 或 Telegram bot；使用者既有的 Mac mini 控制橋繼續負責這部分。

## 功能

- 全屋與 7 個房間分頁，選房間高亮原圖區域。
- 所有尺寸 cm；物件 hover／點選顯示尺寸與來源。
- 本版可見大型物件 A=22 件、B=26 件（B 加入電器高櫃、洗碗機、窄拉籃、爐下烤箱）。總索引 26 件。
- 圖面縮放、物件／尺寸圖層、尺寸簿與各房間設計細節。
- 已移除頁首標語與單位展示區，首屏優先顯示圖面。

## 已確認配置

1. BEDROOM 2 → KID ROOM，原配置保留。
2. 原 STUDY → GUEST ROOM；小孩房配置左右鏡像、靠右內牆對齊。衣櫃 120 × 60 cm，家具不因房寬約 3 cm 的差異而縮放。
3. BEDROOM 3 → STUDY；原 STUDY 家具配置旋轉 180° 移入。櫃體約 120 × 60 cm，桌長經授權由 240 配適為約 230 cm，深約 50 cm。
4. 固定牆、門、窗沿用新格局來源，搬移的是室內配置。

## 語言

頁首右上「中文／EN」切換，網址同步帶 `?lang=zh` 或 `?lang=en`；分享 `?lang=en` 連結會直接開英文版，沒有參數時為中文。英文字典在 `src/i18n.json`（中文原文 → 英文，逐字比對）。新增或修改任何中文文字後執行 `node tools/i18n-keys.mjs --missing` 補英文；`npm run check` 會擋下缺漏的翻譯與 `{placeholder}` 不一致。

## 立面設計（R04–R05）

點選有立面的物件後，下方會出現「立面設計」：正立面／側剖面／整面牆脈絡，可切換關門／開門（拉出）。資料在 `src/project.json → elevations`，繪圖在 `src/elevation.js`。

- 單位 cm，高度由完成地面往上量；天花暫以使用者提供的 280 計。
- 每個 unit 的 `bands`（由下到上）高度總和必須等於 `h`，`npm run check` 會驗證。
- 已建立：`appliance-tower`（B 方案電器高櫃）、`kitchen-hob`（爐台＋爐下烤箱＋窄拉籃）、`dishwasher`、`spice-pullout`、`kitchen-oven`、`master-wardrobe-left`、`master-wardrobe-right`。
- 廚房 B 的櫃體與視圖集中在共用的 `elevations.kitchen-b`（`shared: true`）；物件立面用 `include` 引用、`views` 以 id 挑選，`alias` 可沿用另一個物件立面的說明。
- 立面是設計提案，不是原圖標註；電器尺寸為示意機型，實購型號仍記在 actual 欄位。

## 廚房方案

`src/project.json → roomVersions.kitchen` 是方案來源；所有房間分頁都可從圖面工具列切換廚房方案。

- **A · 目前配置**：原水槽／瓦斯爐位置。
- **B · 窗下水槽＋電器高櫃**：水槽移到兩者之間的下方外牆窗位；瓦斯爐移至下檯面右端。右側為門，保持門與開口。
- 原水槽處規劃至天花板電器高櫃；三個可拉出層：下層電鍋、中層微波爐、上層氣炸鍋，底部封閉收納。立面分區示意不按比例。
- 使用者指定女傭房開門弧暫不處理。櫃高、每格淨高、電器型號／尺寸、爐具安裝淨距與窗台／龍頭高度仍待定。
- B 的櫃體約 68 × 65 cm 是原水槽段的規劃占位，不是已定案或現場實測櫃尺寸；爐具、水槽也是方案位置，與圖上原標分開。
- A、B 筆記分開保存。未來增加方案時，複製完整版本資料與 objectOverrides，不改 A 的 source paths。

## 快速索引

先讀 [RECORD_INDEX.md](RECORD_INDEX.md)。指定紀錄可單獨提取，避免讀完整 HTML／PDF：

```sh
python tools/records.py show room study
python tools/records.py show object kitchen-sink
python tools/records.py show object fridge
```

| 檔案 | 用途 |
| --- | --- |
| `src/project.json` | 房間 polygon、物件尺寸／bbox、來源、實物資料、方案與筆記 |
| `src/app.js` | 分頁、highlights、hover、版本切換與本機草稿 |
| `src/elevation.js` | 立面圖（正立面／側剖面／牆面）SVG 繪製 |
| `src/style.css` / `src/shell.html` | 外觀與結構 |
| `src/plan-paths.svg` | 從 PDF 抽出的原始固定圖元，不手工重畫牆 |
| `src/furniture-kid.svg` | 小孩房來源；客房鏡像共用 |
| `src/furniture-guest.svg` | 原書房來源，旋轉後移到新書房 |
| `tools/build.mjs` | 免依賴、跨平台單檔 HTML 編譯 |
| `tools/check.mjs` | 來源、尺寸、版本與產物檢查 |
| `.github/workflows/pages.yml` | push 時 build/check；發布需事先啟用 |
| `reference/` | 原圖量測、比例尺及變換稽核 |

廚房 sink source paths753–779、hob780–806，編譯時抽成各自圖層。版本以 objectOverrides 的 bbox 變換同一批圖元；固定窗與門不動。

## 量測規則

- 原 PDF point，左上原點；1 pt = 3.5277778 cm。
- PDF 842 × 595 pt 約 A3；題簽 A4 不代表應再次縮放。16 項可用原標最小平方校準約 3.5259203 cm/pt；原標 mm ÷10 優先。
- Summary 第 4 頁圖與字左右鏡像。5 m 比例尺獨立校驗後，5 組外牆跨度差約 0.29%–0.77%；不移植舊房間尺寸。
- 房間採新圖內牆／窗室內側線，含櫃體占位；淨走道另記。主臥及客餐廳不以外包矩形推算面積。
- `annotated` 原標、`scaled` 圖面估算、`design` 配置設計、`fit` 經授權配適；每軸分開標記。
- 高度、品牌、型號、實際產品尺寸未知時保持 null。圖面符號不得冒充實物。
- 原桌深使用 drawing129 的實體桌邊 x405.72，不能用 x400.8 尺寸線；新書桌約230×50cm。

`tools/init_data.py` 與 `add_kitchen_versions.py` 是已完成的一次性遷移，後續不要重跑。普通修改不需要 Python／PDF。`web/` 為未採用的雲端編輯原型，已忽略，不是此網站的部署來源。
