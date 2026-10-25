# Focused record index

Source: `src/project.json`. Retrieve a single record with `python tools/records.py show room study` or `python tools/records.py show object fridge`. Edit sources; rebuild `dist/index.html` with `python tools/build.py`.

## Rooms

| ID | 名稱 | 主要區尺寸 cm |
| --- | --- | --- |
| `living` | 客餐廳 | ≈ 560 × 325 |
| `kitchen` | 廚房 | ≈ 320.5 × 240 |
| `helper` | 女傭房 | ≈ 107 × 205 |
| `master` | 主臥 | ≈ 290 × 275 |
| `kid` | 小孩房 | ≈ 250 × 290 |
| `study` | 書房 | ≈ 250 × 300 |
| `guest` | 客房 | ≈ 247 × 300 |

## Objects

| Code | Stable ID | 名稱 | 圖面 W × D cm |
| --- | --- | --- | --- |
| LIV-01 | `living-cabinet` | 客餐廳櫃體（用途待定） | 190 × 60 |
| LIV-02 | `piano` | 鋼琴 | 130 × 61 |
| LIV-03 | `tv-console` | 電視櫃 | 210 × 45 |
| LIV-04 | `sofa` | 沙發 | 210 × 95 |
| LIV-05 | `dining-table` | 餐桌 | 150 × 90 |
| LIV-06 | `drying-rack` | 曬衣架 | 113 × 40 |
| LIV-07 | `living-tv` | 電視 · Samsung The Frame 75" | 168.5 × 2.7 |
| KIT-01 | `washer-dryer` | 洗烘衣機 W/D | 60 × 65 |
| KIT-02 | `fridge` | 冰箱 F | 80 × 70 |
| KIT-03 | `kitchen-upper-worktop` | Dry kitchen | 167.5 × 65 |
| KIT-21 | `coffee-machine` | 咖啡機（示意） | 8.4 × 33 |
| KIT-22 | `water-purifier` | 淨水器 Wells The One | 8.8 × 8.8 |
| KIT-04 | `kitchen-lower-worktop` | Wet kitchen | 320.5 × 65 |
| HLP-01 | `helper-bed` | 女傭房床 | 107 × 200 |
| MST-01 | `master-wardrobe-left` | 主臥左側衣櫃 | 90 × 60 |
| MST-02 | `master-wardrobe-right` | 主臥右側衣櫃 | 90 × 60 |
| MST-03 | `master-unlabelled-cross-cabinet` | 未標示用途櫃形符號 | 173 × 33 |
| MST-04 | `master-bed` | 主臥床 | 185 × 200 |
| BTH-01 | `bath1-mirror-cabinet` | 主浴洗手台＋鏡櫃 | 197.7 × 50 |
| BTH-02 | `bath2-mirror-cabinet` | 衛浴 2 洗手台＋整面鏡櫃 | 169.8 × 57.2 |
| STD-04 | `study-wardrobe` | 書房衣櫃 | 120 × 60 |
| STD-03 | `massage-chair` | 按摩椅 OSIM uLove 3 | 76 × 127 |
| GST-01 | `guest-wardrobe` | 客房衣櫃 | 120 × 60 |
| GST-03 | `guest-bed-a` | 客房床（A · MALM 收納床 Queen） | 166 × 209 |
| GST-04 | `guest-desk-a` | 客房書桌（A · MICKE 73 × 50） | 73 × 50 |
| GST-05 | `guest-wardrobe-a` | 客房窄衣櫃（A · 69） | 69 × 60 |
| GST-06 | `guest-bed-b` | 客房床（B · Super single） | 115 × 200 |
| GST-07 | `guest-desk-b` | 客房書桌（B · MICKE 73 × 50） | 73 × 50 |
| GST-02 | `guest-bed` | 客房床 | 152 × 191 |
| KIT-05 | `kitchen-sink` | 水槽 | 61 × 50 |
| KIT-10 | `kitchen-oven` | 嵌入式烤箱（爐下） | 80 × 60 |
| KIT-06 | `kitchen-hob` | 瓦斯爐 | 75 × 42 |
| KIT-07 | `appliance-tower` | 電器櫃 | 60 × 65 |
| KIT-08 | `dishwasher` | 洗碗機 | 60 × 60 |
| KIT-09 | `spice-pullout` | 窄拉籃（三層 · 左） | 20 × 60 |
| KIT-11 | `spice-pullout-r` | 窄拉籃（三層 · 右） | 20 × 60 |
| KID-01 | `kid-loft-bed-a` | 言言半高床（A） | 163 × 207 |
| KID-02 | `kid-slide-a` | 言言高滑梯（A） | 227 × 47.5 |
| KID-03 | `kid-stool-a` | 言言爬梯凳（A） | 39 × 45 |
| KID-04 | `kid-loft-bed-b` | 言言半高床（B） | 163 × 207 |
| KID-05 | `kid-slide-b` | 言言高滑梯（B） | 227 × 47.5 |
| KID-06 | `kid-stool-b` | 言言爬梯凳（B） | 39 × 45 |

All actual W/D/H/brand/model fields are initially null. Keep source geometry and semantic dimension values synchronized. Full measurement provenance is under `reference/`.

Geometry edits:
- Guest mirroring: `tools/build.py`, `data-layout="guest-mirrored"`, matrix(-1,0,0,1,693.36,0).
- Rooms (R22): study and kid room swapped — `study` is now the north room (former BEDROOM 2, keeps the 120×60 wardrobe as `study-wardrobe`, massage chair in `src/furniture-kid-study.svg`); `kid` is the south room (former study), empty. The old rotated study group is no longer drawn.
- Guest (R23): mirrored kid bed (666–688) and wardrobe (429–437) dropped from the guest copy; Queen 150×200 + desk niche 70 + wardrobe 50 drawn in `src/furniture-guest-plan.svg` (scheme A); scheme B (wardrobe removed) in `src/furniture-guest-plan-b.svg`. Toggle: roomVersions.guest, objects carry onlyGuest, URL ?guest=a|b.
- Kid (R26): 言言 loft bed schemes in `src/furniture-kid-plan-a.svg` (slide against the window) and `-b.svg` (stool against the corridor wall). Toggle: roomVersions.kid, objects carry onlyKid, URL ?kid=a|b.
- Doors (R21): study (440/441) and bath-2 (510/511) swing doors replaced by corridor-side sliding doors in `src/furniture-doors.svg`.
- Fixed physical geometry: `src/plan-paths.svg`; native PDFs are not required for ordinary note/actual-size edits.
