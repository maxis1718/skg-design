# Focused record index

Source: `src/project.json`. Retrieve a single record with `python tools/records.py show room study` or `python tools/records.py show object fridge`. Edit sources; rebuild `dist/index.html` with `python tools/build.py`.

## Rooms

| ID | 名稱 | 主要區尺寸 cm |
| --- | --- | --- |
| `living` | 客餐廳 | ≈ 560 × 325 |
| `kitchen` | 廚房 | ≈ 320.5 × 240 |
| `master` | 主臥 | ≈ 290 × 275 |
| `kid` | 小孩房 | ≈ 250 × 300 |
| `study` | 書房 | ≈ 247 × 300 |
| `guest` | 客房 | ≈ 250 × 290 |
| `helper` | 女傭房 | ≈ 107 × 205 |
| `bath1` | 衛浴 1 | ≈ 242.6 × 197.7 |
| `bath2` | 衛浴 2 | ≈ 247.2 × 197.3 |
| `living-balcony` | 客廳陽台 | ≈ 550.3 × 165.1 |
| `master-balcony` | 主臥陽台 | ≈ 269.7 × 157.9 |

## Objects

| Code | Stable ID | 名稱 | 圖面 W × D cm |
| --- | --- | --- | --- |
| LIV-01 | `living-cabinet` | 客餐廳櫃體 | 190 × 60 |
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
| HLP-01 | `helper-bed` | 女傭房收納床台 | 107 × 205 |
| HLP-02 | `helper-fan` | 女傭房壁扇 | 40 × 25 |
| HLP-03 | `helper-wall-cabinet` | 女傭房床尾吊櫃 | 70 × 30 |
| HLP-04 | `helper-mirror` | 女傭房鏡子 | 3 × 30 |
| HLP-05 | `helper-hooks` | 女傭房掛鉤 ×3 | 5 × 32 |
| HLP-06 | `helper-reading-lamp` | 女傭房閱讀壁燈 | 18 × 16 |
| MST-01 | `master-wardrobe-left` | 主臥左側衣櫃 | 90 × 60 |
| MST-02 | `master-wardrobe-right` | 主臥右側衣櫃 | 90 × 60 |
| MST-03 | `master-unlabelled-cross-cabinet` | 未標示櫃體 | 173 × 33 |
| MST-04 | `master-bed` | 主臥床 | 185 × 200 |
| BTH-01 | `bath1-mirror-cabinet` | 主浴洗手台＋鏡櫃 | 197.7 × 50 |
| BTH-02 | `bath2-mirror-cabinet` | 衛浴 2 洗手台＋整面鏡櫃 | 169.8 × 57.2 |
| KIT-05 | `kitchen-sink` | 水槽 | 61 × 50 |
| KIT-10 | `kitchen-oven` | 爐下烤箱 | 80 × 60 |
| KIT-06 | `kitchen-hob` | 瓦斯爐 | 75 × 42 |
| KIT-07 | `appliance-tower` | 電器櫃 | 60 × 65 |
| KIT-08 | `dishwasher` | 洗碗機 | 60 × 60 |
| KIT-09 | `spice-pullout` | 窄拉籃 · 左 | 20 × 60 |
| KIT-11 | `spice-pullout-r` | 窄拉籃 · 右 | 20 × 60 |
| KID-01 | `kid-wardrobe` | 小孩房衣櫃 | 120 × 60 |
| STD-04 | `study-wardrobe` | 書房衣櫃 | 120 × 60 |
| STD-05 | `study-desk` | 書房電腦桌 | 100 × 50 |
| STD-03 | `massage-chair` | 按摩椅 OSIM uLove 3 | 76 × 127 |
| GST-01 | `guest-bed-c` | 客房床 C · MALM Queen | 166 × 209 |
| GST-02 | `guest-desk-c` | 客房書桌 C | 60 × 45 |
| GST-03 | `guest-wardrobe-c` | 客房衣櫃 C | 49 × 60 |
| GST-04 | `guest-bed-a` | 客房床 A · MALM Queen | 166 × 209 |
| GST-05 | `guest-desk-a` | 客房書桌 A | 70 × 40 |
| GST-06 | `guest-wardrobe-a` | 客房衣櫃 A | 70 × 60 |
| GST-07 | `guest-bed-lb` | 客房床（MALM Queen） | 166 × 209 |
| STD-06 | `massage-chair-lb` | 按摩椅 OSIM uLove 3 | 76 × 127 |
| STD-07 | `study-desk-lb` | 書房電腦桌 | 100 × 50 |
| GST-08 | `guest-desk-lb-c` | 客房書桌（C） | 60 × 45 |
| GST-09 | `guest-wardrobe-lb-c` | 客房訂製衣櫃（C） | 59 × 60 |
| GST-10 | `guest-desk-lb-a` | 客房書桌（A） | 70 × 40 |
| GST-11 | `guest-wardrobe-lb-a` | 客房訂製衣櫃（A） | 70 × 60 |
| GST-12 | `guest-chair-a` | 客房書椅（A） | 45 × 45 |
| GST-13 | `guest-chair-lb-a` | 客房書椅（A） | 45 × 45 |
| GST-14 | `guest-wardrobe-b` | 客房訂製衣櫃（B） | 80 × 60 |
| GST-15 | `guest-desk-b` | 客房木作書桌（B） | 60 × 40 |
| GST-16 | `guest-chair-b` | 客房書椅（B） | 45 × 45 |
| GST-17 | `guest-wardrobe-lb-b` | 客房訂製衣櫃（B） | 80 × 60 |
| GST-18 | `guest-desk-lb-b` | 客房木作書桌（B） | 60 × 40 |
| GST-19 | `guest-chair-lb-b` | 客房書椅（B） | 45 × 45 |
| GST-20 | `guest-bed-b` | 客房床 B · MALM Queen | 166 × 209 |
| LBL-03 | `balcony-cabinet` | 陽台收納櫃 | 105 × 65 |
| LBL-01 | `swing-hooks` | 鞦韆 · 天花吊點 ×2 | 50 × 40 |
| LIV-08 | `air-purifier` | 空氣清淨機 Electrolux Pure A9 | 37 × 37 |
| LBL-02 | `robot-vacuum` | 掃拖機器人 Dreame H14 Ultra（含底座） | 35 × 35 |
| KID-02 | `kid-fan` | 風扇清淨機 Dyson TP09 | 22 × 22 |
| GST-21 | `guest-purifier` | 清淨機 Electrolux UltimateHome 300 | 23.4 × 23.4 |

All actual W/D/H/brand/model fields are initially null. Keep source geometry and semantic dimension values synchronized. Full measurement provenance is under `reference/`.

Geometry edits:
- Guest mirroring: `tools/build.py`, `data-layout="guest-mirrored"`, matrix(-1,0,0,1,693.36,0).
- Rooms (R27): NW room = `kid` (bed removed, keeps the original 120×60 wardrobe `kid-wardrobe`); NE room = `study` (mirrored original wardrobe `study-wardrobe`, massage chair (backrest east, reclines west) + 100 desk + 27" monitor in `src/furniture-kid-study.svg`); south room = `guest`.
- Guest (R27): schemes A/B in `src/furniture-guest-plan-a.svg` / `-b.svg` (MALM Queen 15 off the window for the curtain; A = wardrobe 49 + desk on the west wall, B = wardrobe 90 + desk on the north wall). Toggle: roomVersions.guest, objects carry onlyGuest, URL ?guest=a|b.
- Doors (R21): NE/NW rooms keep swing doors; south room and bath-2 use corridor-side sliding doors in `src/furniture-doors.svg`.
- Fixed physical geometry: `src/plan-paths.svg`; native PDFs are not required for ordinary note/actual-size edits.
