# Focused record index

Source: `src/project.json`. Retrieve a single record with `python tools/records.py show room study` or `python tools/records.py show object fridge`. Edit sources; rebuild `dist/index.html` with `python tools/build.py`.

## Rooms

| ID | 名稱 | 主要區尺寸 cm |
| --- | --- | --- |
| `living` | 客餐廳 | ≈ 560 × 325 |
| `kitchen` | 廚房 | ≈ 320.5 × 240 |
| `helper` | 女傭房 | ≈ 107 × 205 |
| `master` | 主臥 | ≈ 290 × 275 |
| `kid` | 小孩房 | ≈ 250 × 300 |
| `study` | 書房 | ≈ 250 × 290 |
| `guest` | 客房 | ≈ 247 × 300 |

## Objects

| Code | Stable ID | 名稱 | 圖面 W × D cm |
| --- | --- | --- | --- |
| LIV-01 | `living-cabinet` | 客餐廳櫃體（用途待定） | 190 × 60 |
| LIV-02 | `piano` | 鋼琴 | 130 × 61 |
| LIV-03 | `tv-console` | 電視櫃（三抽） | 210 × 45 |
| LIV-04 | `sofa` | 沙發 | 210 × 95 |
| LIV-05 | `dining-table` | 餐桌 | 90 × 150 |
| LIV-06 | `drying-rack` | 曬衣架（天花吊掛） | 40 × 113 |
| LIV-07 | `living-tv` | Samsung The Frame 75" | 168.5 × 2.7 |
| KIT-01 | `washer-dryer` | 洗烘衣機 W/D | 60 × 65 |
| KIT-02 | `fridge` | 冰箱 F | 80 × 70 |
| KIT-03 | `kitchen-upper-worktop` | Dry kitchen | 167.5 × 65 |
| KIT-04 | `kitchen-lower-worktop` | Wet kitchen | 320.5 × 65 |
| HLP-01 | `helper-bed` | 女傭房床 | 107 × 200 |
| MST-01 | `master-wardrobe-left` | 主臥左側衣櫃 | 90 × 60 |
| MST-02 | `master-wardrobe-right` | 主臥右側衣櫃 | 90 × 60 |
| MST-03 | `master-unlabelled-cross-cabinet` | 未標示用途櫃形符號 | 173 × 33 |
| MST-04 | `master-bed` | 主臥床 | 185 × 200 |
| KID-01 | `kid-wardrobe` | 小孩房衣櫃 | 120 × 60 |
| STD-01 | `study-cabinet` | 書房收納櫃（用途待定） | 120 × 60 |
| STD-02 | `study-desk` | 書房書桌 | 230 × 50 |
| GST-01 | `guest-wardrobe` | 客房衣櫃 | 120 × 60 |
| GST-02 | `guest-bed` | 客房床 | 152 × 191 |
| KIT-05 | `kitchen-sink` | 水槽 | 61 × 50 |
| KIT-06 | `kitchen-hob` | 瓦斯爐 | 75 × 42 |
| KIT-07 | `appliance-tower` | 電器櫃 | 60 × 65 |
| KIT-10 | `kitchen-oven` | 嵌入式烤箱（爐下） | 80 × 60 |
| KIT-08 | `dishwasher` | 洗碗機 | 60 × 60 |
| KIT-09 | `spice-pullout` | 窄拉籃（三層 · 左） | 20 × 60 |
| KIT-11 | `spice-pullout-r` | 窄拉籃（三層 · 右） | 20 × 60 |
| KIT-21 | `coffee-machine` | 咖啡機（示意） | 8.4 × 33 |
| KIT-22 | `water-purifier` | 淨水器 Wells The One | 8.8 × 8.8 |
| BTH-01 | `bath1-mirror-cabinet` | 主浴洗手台＋鏡櫃 | ≈ 197.7 × 50 |
| BTH-02 | `bath2-mirror-cabinet` | 衛浴 2 洗手台＋整面鏡櫃 | ≈ 169.8 × 57.2 |

All actual W/D/H/brand/model fields are initially null. Keep source geometry and semantic dimension values synchronized. Full measurement provenance is under `reference/`.

Geometry edits:
- Guest mirroring: `tools/build.py`, `data-layout="guest-mirrored"`, matrix(-1,0,0,1,693.36,0).
- Study rigid move: `tools/build.py`, `data-layout="study-rotated"`, matrix(-1,0,0,-1,693.36,496.52).
- Study fitted desk face: `tools/build.py`, `data-layout="study-desk-fit"`, x287.64 / y283.72 to348.88. Original path129 omitted.
- Fixed physical geometry: `src/plan-paths.svg`; native PDFs are not required for ordinary note/actual-size edits.

## Elevations

| Object | Views | Notes |
| --- | --- | --- |
| `appliance-tower` | 正立面 · 側剖面拉出 · 整面牆 | B 方案限定；上櫃＋三層 Blum 全拉＋兩淺抽 |
| `kitchen-hob` / `kitchen-oven` / `spice-pullout` | 爐台區 · 窄拉籃側剖面 · 整面牆 | 共用 `kitchen-b`；後兩者為 alias |
| `dishwasher` / `kitchen-sink` | 水槽區 · 整面牆 | Samsung DW60CB750FAPSP，檯面底 87；水槽櫃前半深層板 |
| `master-wardrobe-left` | 正立面 · 側剖面拉出 · 兩櫃對照 | 落地雙開門；三排頂裝側拉褲架（Hettich）＋掛衣（淨高 100）＋上櫃收納盒 |
| `master-wardrobe-right` | 正立面 · 兩櫃對照 | 3 外抽＋掛衣（淨高 110.2）＋上櫃收納盒 |
