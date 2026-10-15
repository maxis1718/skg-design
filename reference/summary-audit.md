# Summary 第 4 頁獨立檢查

## 結論

- Summary p4 是原始銷售圖；`Floor plan scale.pdf` 是應採用的修改格局。不可把 Summary 房間內部淨尺寸直接搬到新圖。
- Summary p4 的平面圖是 **左右鏡像**，包括其 raster 文字（不是旋轉 180 度）。PDF 額外覆蓋的 `1,313 sqft`、`4B + Flexi` 正常。JPEG 原圖也把 `* Mirror Image` 等字水平反轉。對 JPEG 左右翻轉可讀文字，但會把 master 改到右邊；新圖的 master 在左、living 在右。因此幾何對照必須保留 Summary 現有方向。
- Summary 比例尺可讀 0、1、2、5 m；0 在右，5 m 在左。整段約 243 native pixels。使用整段 5 m 比只取 1 m 穩定。
- 新圖的 1900 mm 明示尺寸（PDF x = 425.64 至 479.52 pt，跨度 53.88 pt）對應 3.526355 cm/pt。與 Summary 長距離外牆交叉比較，差約 0.3% 至 0.8%，足以作比例級別的獨立驗證；不能用來宣稱現場精度。

## 檔案與座標系統

- Summary PDF 第 4 頁：1920 × 1080 PDF point；以下 page 座標均採左上原點、向右向下。
- 當頁唯一 JPEG：1136 × 901 native pixels，image bounding box page `(336.1855, -28.13708)` 至 `(1755.8195, 1097.82292)`；上方/下方略超出頁面。
- native image `(u,v)` 至 page：`x = 336.1855 + 1.2496778169 * u`，`y = -28.13708 + 1.2496781354 * v`。
- 本次渲染 216 dpi = 3 pixels / PDF pt，完整頁 5760 × 3240，渲染檔 `tmp/pdfs/summary4.png`。
- 原始 JPEG：`tmp/pdfs/summary4-embedded.png`；供讀字的左右翻轉頁：`tmp/pdfs/summary4-mirror.png`。翻轉頁不能直接用作新格局定位。

## 比例尺端點與誤差

比例尺黑條 native image row 804 至 814，採 y = 809 的通行水平基準。黑條 pixels 為 830..1072（含端點），故幾何邊界約 u = 830 至 1073；抗鋸齒/JPEG 及像素邊界判讀至少 ±0.5 pixel，保守整段長度 ±1 pixel。

| 刻度 | Native image (u,v) | Page (x,y) pt | 216 dpi full-page (x,y) px |
| --- | --- | --- | --- |
| 5 m | (830,809) | (1373.418,982.853) | (4120.254,2948.558) |
| 2 m | (975,809) | (1554.621,982.853) | (4663.864,2948.558) |
| 1 m | (1024,809) | (1615.856,982.853) | (4847.567,2948.558) |
| 0 m | (1073,809) | (1677.090,982.853) | (5031.269,2948.558) |

- 5 m span = 243 ±1 native px = 303.6717 ±1.2497 page pt。
- Summary calibration = 500 / 243 = **2.057613 cm/native px** = **1.646515 cm/page pt**。單是比例尺像素不確定度約 ±0.41%；測牆本身每端另約 ±1 native px（約 2 cm）。不包含原始銷售圖與現況差異。
- 0/1/2 ticks 的約 49 px increments，與 5 m / 243 px 一致；不要把左段 145 px 誤當全 5 m。

## 長距離固定外牆交叉比較

原始像素牆線依 JPEG 視讀，有約 ±1 至 2 px 判讀誤差。新圖均用 vector line 座標，校準用明示 190 cm / 53.88 pt。下表只驗證總體比例與外輪廓，不移植房間尺寸。尺寸為運算檢核，交付 UI 不應保留這些小數位。

| 固定構件對照 | Summary native px endpoints / span | New PDF pt endpoints / span | Summary scale cm | New marked-dimension scale cm | Difference |
| --- | --- | --- | --- | --- | --- |
| master 左側主體外牆至最右側外牆（水平） | x118→819 /701 | x179.16→590.04 /410.88 | 1442.39 | 1448.91 | +0.45% |
| 全棟最左 AC ledge 至最右外牆（水平） | x66→819 /753 | x149.40→590.04 /440.64 | 1549.38 | 1553.85 | +0.29% |
| 左側 AC ledge 高度 | y251→511 /260 | y203.08→355.96 /152.88 | 534.98 | 539.11 | +0.77% |
| 最右側外牆全高 | y93→625 /532 | y110.80→422.56 /311.76 | 1094.65 | 1099.38 | +0.43% |
| 上下臥室窗面所涵蓋高度 | y138→511 /373 | y137.68→355.96 /218.28 | 767.49 | 769.73 | +0.29% |

上述差異可由原始 image raster、drawing 縮放及端點選擇解釋，不能證明每一個內牆完全相同。新圖上標示的尺寸優先；新圖量測可用約 3.53 cm/pt，但應用其他明示標註再次擬合與校驗。

## 原始與修改格局差異（以新圖左 master、右 living 方向描述）

- 原始 upper middle-left 是 BEDROOM 2；新圖仍 BEDROOM 2，有明示 1200 × 600 mm 衣櫃。使用者要求改名 KID ROOM。
- 原始 upper middle-right 是 BEDROOM 3；新圖已改成 STUDY ROOM，設桌面/兩張椅子與下方櫃體。使用者指示把 **新圖的 STUDY** 改為 GUEST ROOM，並加與新圖 BEDROOM 2 相同的衣櫃。
- 原始 lower middle-left 是 BEDROOM 4；新圖標 BEDROOM 3。使用者指示把 **新圖的 BEDROOM 3** 改為 STUDY。
- 原始 STORЕ (FLEXI) 與 WC 位於 kitchen 靠 Bath 2 側，且廚房原有檯面配置與新圖不同；新圖改成 MAID'S ROOM，隔牆（洋紅斜線）與設備重新配置。必須依新圖重描，不能沿用原始 Store/WC。
- 新圖 kitchen 上側顯示 W/D、F、L 形操作檯，下側水槽/爐具與新隔牆；Summary 原始下方廚房一側有 F、sink、hob，入門側另有 WD。設備位置不同。
- 新圖增加 living 右邊 TV 櫃與 500 / 2400 mm 分段標示、piano、1900 mm 靠走道櫃。這些與 Summary 示意家具不同，應以新圖為準。
- balcony / A/C ledge / 主體外牆輪廓基本一致，提供可靠的對照 anchors；Summary 中的床、沙發、餐桌是示意物件，不能當產品尺寸來源。

## 交付建議

- 明示尺寸 = source-label；向量比例量測 = derived；使用者指定的新增櫃體 = proposed；未知產品高深/型號 = unknown。讓這些狀態在 UI 明確分開。
- Summary 僅當「原始格局 / 比例尺交叉檢查」來源；所有可點區域與房間維度從新圖取得。
- 房間 cm 尺寸屬圖面估測，取整 cm 或合理區間。家具若只有 footprint，尺寸只報平面寬深，不能推論高度、容量或型號。
