# SKG 空間規劃

共用原始碼：[maxis1718/skg-design](https://github.com/maxis1718/skg-design)。2026-10-16 啟用 Pages 後確認 repo 為 public，原始碼與圖檔也可公開讀取。以 Git 保存設計與歷史，支援 Mac mini 上的 Codex／Claude 透過既有 Telegram 控制流程修改。

目前版本 R19，2026-10-22。平面圖主來源為 Floor plan scale.pdf；Summary.pdf 第 4 頁只作原格局對照。文件內的說明不取代使用者要求。

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
- 「本機草稿」允許暫記筆記、實物尺寸，只存這台瀏覽器，不會改共用版。原有本機資料保留在草稿內。
- JSON 匯出／匯入可備份或將草稿交給 agent；agent 必須把接受的修改合併到來源，才能讓其他裝置看見。
- 網頁沒有嵌入 AI API 或 Telegram bot；使用者既有的 Mac mini 控制橋繼續負責這部分。

## 功能

- 全屋與 7 個房間分頁，選房間高亮原圖區域。
- 所有尺寸 cm；物件 hover／點選顯示尺寸與來源。
- 廚房 A 方案加入電器櫃、洗碗機、兩個窄拉籃、爐下烤箱。
- 物件／尺寸圖層、尺寸簿與各房間設計細節。
- 已移除頁首標語與單位展示區，首屏優先顯示圖面。

## 已確認配置

1. BEDROOM 2 → KID ROOM，原配置保留。
2. 原 STUDY → GUEST ROOM；小孩房配置左右鏡像、靠右內牆對齊。衣櫃 120 × 60 cm，家具不因房寬約 3 cm 的差異而縮放。
3. BEDROOM 3 → STUDY；原 STUDY 家具配置旋轉 180° 移入。櫃體約 120 × 60 cm，桌長經授權由 240 配適為約 230 cm，深約 50 cm。
4. 固定牆、門、窗沿用新格局來源，搬移的是室內配置。

## 語言

頁首右上「中文／EN」切換，網址同步帶 `?lang=zh` 或 `?lang=en`；分享 `?lang=en` 連結會直接開英文版，沒有參數時為中文。英文字典在 `src/i18n.json`（中文原文 → 英文，逐字比對）。新增或修改任何中文文字後執行 `node tools/i18n-keys.mjs --missing` 補英文；`npm run check` 會擋下缺漏的翻譯與 `{placeholder}` 不一致。

## 立面設計（R04–R08）

點選有立面的物件後，下方會出現「立面設計」：正立面／側剖面／空間規劃（點 Wet kitchen 即開），可切換關門／開門（拉出）。資料在 `src/project.json → elevations`，繪圖在 `src/elevation.js`。

- 單位 cm，高度由完成地面往上量；天花暫以使用者提供的 280 計。
- 每個 unit 的 `bands`（由下到上）高度總和必須等於 `h`，`npm run check` 會驗證。
- 已建立：`appliance-tower`（A 方案電器櫃）、`kitchen-hob`、`dishwasher`、`spice-pullout(-r)`、`kitchen-oven`、`kitchen-lower-worktop`（Wet kitchen 空間規劃，右側高度鏈）、`kitchen-upper-worktop`（Dry kitchen）、`master-wardrobe-left`（落地雙開門 8–272、門內全寬內抽（Blum MOVENTO）＋三排頂裝側拉褲架（Hettich 全拉＋Silent System，各自拉出）、掛桿 195 淨高 96、內抽盒內高 13、上方低收納層＋SKUBB 盒；有側剖面拉出圖）／`master-wardrobe-right`（3 外抽 24/24/20、掛桿 195 淨高 117.2、高門雙開 76–272 含上層收納）；兩櫃皆有門內全身鏡、開門感應燈、`bath1-mirror-cabinet`／`bath2-mirror-cabinet`（鏡櫃到天花 240、總深 19／內淨 15：中間固定鏡、兩側鏡門向外開、櫃內 Dyson 插座；衛浴 2 整面牆含馬桶上方 169.8）、`tv-console`／`living-tv`（電視牆：三抽電視櫃 210×45×40、插座全在中間抽屜、弧形缺口把手兼出線）。
- 廚房三個方案：方案 A（窗下水槽，預設）、方案 B（電器櫃移到門端）、原始，網址 ?kitchen=a|b|original。方案 A 的櫃體與視圖集中在共用的 `elevations.kitchen-b`（`shared: true`），方案 B 在 `elevations.kitchen-b2`，B 的物件立面以 `物件id@tower-left` 為鍵；物件立面用 `include` 引用、`views` 以 id 挑選，`alias` 可沿用另一個物件立面的說明。
- 立面右欄可加 `risks`（字串清單），以紅字「需評估」顯示在待確認上方，記錄動線／視覺等待評估的風險；任何立面都可用。
- 立面是設計提案，不是原圖標註；電器尺寸為示意機型，實購型號仍記在 actual 欄位。

## 廚房方案

`src/project.json → roomVersions.kitchen` 是方案來源；圖面工具列用 A／B 切換，網址同步 `?kitchen=a|b`（預設 A）。

- **A · 新方案**（`kitchen-window-sink`）：水槽移到下方外牆窗位，瓦斯爐靠門端，原水槽段改為電器櫃。下檯面稱 Wet kitchen、上檯面稱 Dry kitchen。
- Wet kitchen 由門端起：收邊 5、窄拉籃 20、爐下櫃 80、窄拉籃 20（爐具兩側對稱）、洗碗機 63.6（側板 1.8＋開口 60＋側板 1.8）、水槽櫃 71.9（盆寬 60，備菜區 ≈92）、電器櫃 60。
- 電器櫃外寬 60、內淨寬 55，到天花 280；由下到上：踢腳 10、鍋具抽屜 45、下層 31.6 象印電子鍋＋飯匙、中層 38 大同電鍋 15 人份、上層 35 微波爐、上櫃 112（底 165，與吊櫃底對齊；分下段 35 上掀＋上段 77 側開）、收邊 3。檯面岩板，面 90。
- 廚房門板全部一致：白色細木紋霧面無把手平板門、縫 0.3；下櫃門片與抽屜上緣 2 手扣槽；洗碗機用原廠白色面板。
- 吊櫃與電器櫃上櫃：到天花的整片側開門，門片下緣比櫃底多 2 當手扣（R13 取消 R12 的 200 上下分縫）。
- Dry kitchen（167.5）：左起收邊 3、淨水器主機櫃 59.5（水線、Wells The One 主機、櫃內 13A ×2）、抽屜櫃 51.5 ×2、收邊 2；檯面左起 Nespresso 咖啡機、Wells 出水龍頭與 49 放鍋淨空，全在主機櫃上方；前方黑框玻璃隔間到天花。
- **B · 原始**（`kitchen-current`）：原水槽／瓦斯爐位置。
- 使用者指定女傭房開門弧暫不處理。窗台／龍頭高度、電器實購型號仍待定；占位與立面是設計值，與圖上原標分開。
- A、B 筆記分開保存；新增方案要在 project.json 複製完整版本資料與 objectOverrides，不改原始配置的 source paths。

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
| `src/furniture-kid.svg` | 小孩房來源；客房鏡像共用（小孩房床 path 666–688 在 build 時只從小孩房移除，客房保留） |
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
