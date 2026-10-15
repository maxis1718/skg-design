from pathlib import Path
import json, shutil
ROOT=Path(__file__).resolve().parents[1]
AUDIT=ROOT.parent/'tmp/pdfs/measurement-audit.json'
a=json.loads(AUDIT.read_text(encoding='utf8'))
(ROOT/'reference').mkdir(exist_ok=True)
for name in ['measurement-audit.json','summary-audit.md','furniture-transform-audit.json']:
    shutil.copyfile(ROOT.parent/'tmp/pdfs'/name,ROOT/'reference'/name)
names={'living':('客餐廳','Living & dining','01'),'kitchen':('廚房','Kitchen','02'),'helper':('女傭房',"Helper’s room",'03'),'master':('主臥','Master bedroom','04'),'kid':('小孩房','Kid room','05'),'study':('書房','Study','06'),'guest':('客房','Guest room','07')}
part_names={
'main rectangular living-dining zone':'客餐廳主要矩形區','right wall referenced span':'右側牆面標註跨度','bedroom circulation strip':'臥室走道','entry throat':'玄關通道','lower entry hall':'下方玄關區',
'interior envelope including counters/appliances':'廚房功能範圍（含檯面家電）','central clear aisle at main worktop section':'主檯面段中間淨走道','main internal rectangle':'房間主要內部區','top wider strip':'床頭較寬區',
'main sleeping rectangle':'睡眠主要矩形區','east door recess':'東側入口凹位','south dressing band including wardrobes':'更衣區（含兩側衣櫃）','dressing clear aisle between wardrobes':'兩櫃間淨走道','interior including wardrobe footprint':'內牆範圍（含櫃體占位）','interior including original desk and cabinet footprints':'內牆範圍（含家具占位）'}
room_notes={
'living':{'focus':'電視櫃、兩端留白與餐桌配置','fields':{'電視櫃設計':'圖面長 240 cm；深約 40 cm。款式、實際高度待定。','電視櫃兩端留白':'上端原標 50 cm；下端縱向餘量 97.5 cm（387.5 − 240 − 50）。斜向 111.9 cm 為另一條量測線。','餐桌尺寸與款式':'圖面約 200 × 80 cm，不含餐椅；實物尺寸、材質、款式待提供。','沙發與動線':'圖面沙發約 195 × 80 cm；實物尺寸待提供。','材質與色彩':None}},
'kitchen':{'focus':'檯面代碼、laminate 與家電尺寸','fields':{'檯面品牌／代碼':None,'檯面顏色':None,'Laminate 品牌／代碼':None,'Laminate 顏色':None,'冰箱型號與實際尺寸':None,'洗烘衣機型號與實際尺寸':None,'設計備註':'上檯面長 167.5 cm；下檯面跨度 320.5 cm。中間淨走道約 110 cm。'}},
'helper':{'focus':'床、收納與使用淨空','fields':{'床型與實際尺寸':None,'收納設計':None,'設計備註':'主要內寬約 107 cm，床頭局部約 112 cm。圖面床含床頭板約 107 × 200 cm，幾乎滿寬。'}},
'master':{'focus':'衣櫃設計與臥室配置','fields':{'衣櫃 layout':'圖面為兩側各 90 × 60 cm 衣櫃；中間淨寬約 130 cm。','衣櫃內部分區':None,'衣櫃門片／Laminate':None,'床與床頭設計':None,'設計備註':'房間為不規則輪廓。睡眠區、入口與更衣區分段量測。'}},
'kid':{'focus':'床位、衣櫃與成長需求','fields':{'床型與實際尺寸':None,'衣櫃設計':'保留原 BEDROOM 2 的 120 × 60 cm 衣櫃占位。','設計備註':'原 BEDROOM 2 改名 KID ROOM。'}},
'study':{'focus':'翻轉後的書桌與櫃體配置','fields':{'書桌設計':'原 STUDY 配置旋轉 180° 搬入。依內深約 290 cm 配適，桌長由 240 cm 改為約 230 cm；深約 50 cm。','收納櫃':'原 STUDY 下方櫃體旋轉後移到書房左上，保留 120 × 60 cm 圖面尺寸。用途與內部分區待定。','桌面材質／代碼':None,'電源與照明':None,'設計備註':'移除原 BEDROOM 3 床與衣櫃配置；家具按新書房牆線定位。書桌臨窗位置與開窗方式待現場核對。'}},
'guest':{'focus':'鏡像床位與同款衣櫃','fields':{'床位 layout':'原 BEDROOM 2 配置左右鏡像，靠客房右內牆對齊。','衣櫃設計':'與小孩房相同的 120 × 60 cm 衣櫃，位於右下。','設計備註':'原 STUDY 的桌與櫃已移到書房；家具本身不因房寬差約 3 cm 而縮放。','床型與實際尺寸':None}}
}
rooms=[]
for rid in names:
    r=next(r for r in a['rooms'] if r['id']==rid)
    r['name'],r['english'],r['number']=names[rid]
    for p in r['parts']:
        p['label']=part_names[p['label']]
        p['horizontal_cm']=round(p['horizontal_cm']);p['vertical_cm']=round(p['vertical_cm'])
    if rid=='kitchen':r['parts'][0]['horizontal_cm']=320.5
    if rid=='living':r['parts'][1]['vertical_cm']=387.5
    r['focus']=room_notes[rid]['focus'];r['notes']=room_notes[rid]['fields'];r['uncertainty_cm']=None
    rooms.append(r)
labels={'kid-wardrobe':'小孩房衣櫃','master-wardrobe-left':'主臥左側衣櫃','master-wardrobe-right':'主臥右側衣櫃','master-unlabelled-cross-cabinet':'未標示用途櫃形符號','living-cabinet':'客餐廳櫃體（用途待定）','piano':'鋼琴','tv-console':'電視櫃','sofa':'沙發','dining-table':'餐桌','kid-bed':'小孩房床','master-bed':'主臥床','helper-bed':'女傭房床','washer-dryer':'洗烘衣機 W/D','fridge':'冰箱 F','kitchen-upper-worktop':'上方檯面','kitchen-lower-worktop':'下方檯面'}
source_notes={
'master-unlabelled-cross-cabinet':'圖面 X 符號未標示用途；僅記錄平面外框，不能確定是衣櫃或管道。',
'living-cabinet':'原圖長 190 cm；深約 60 cm 為等比讀值。用途待確認。',
'piano':'原圖寬 130 cm；深約 61 cm 為等比讀值。',
'tv-console':'原圖長 240 cm；深約 40 cm 為等比讀值。',
'sofa':'由家具符號外框量測，長約 195 cm、深約 80 cm。',
'dining-table':'由桌面外框量測，長約 200 cm、寬約 80 cm；不含餐椅。',
'kid-bed':'圖面床框約 191 × 152 cm，不代表已購床墊尺寸。',
'master-bed':'原圖註記 KING SIZE；床框約 200 × 185 cm，不代表已購床墊尺寸。',
'helper-bed':'圖面床含床頭板完整外框約 107 × 200 cm；床身本身長約 190 cm。',
'washer-dryer':'圖面符號約 60 × 65 cm，包含前緣；W/D 未能確認是洗烘合一或疊放。',
'fridge':'圖面完整符號約 80 × 70 cm，含下緣底座；機身本體深約 59 cm。',
'kitchen-upper-worktop':'原圖長 167.5 cm；深約 65 cm 為等比讀值。',
'kitchen-lower-worktop':'原圖廚房橫向跨度 320.5 cm；檯面使用同一端點。深約 65 cm。'}
objects=[]
for o in a['objects']:
    if o['id'] not in labels:continue
    o['name']=labels[o['id']];o['source_note']=source_notes.get(o['id'],'原圖明示衣櫃正面寬與深，已由 mm 換算為 cm。')
    if o['id']=='tv-console':o['source_note']+=' 後側線至原牆約 10 cm；至原牆總突出約 50 cm，背板用途待確認。'
    xy=(o['plan_horizontal_cm'],o['plan_vertical_cm'])
    if o['id'] in ['master-bed','kid-bed']:w,d=xy[1],xy[0]
    elif o['id'] in ['sofa','dining-table']:w,d=xy[1],xy[0]
    elif o['id']=='master-unlabelled-cross-cabinet':w,d=xy[1],xy[0]
    elif o['nominal_width_cm'] is not None:w=o['nominal_width_cm'];d=o['nominal_depth_cm'] or min(xy)
    else:w,d=xy
    annotated_w=o['nominal_width_cm'] is not None
    annotated_d=o['nominal_depth_cm'] is not None
    o['dimensions']={'w':{'cm':w if annotated_w else round(w),'status':'annotated' if annotated_w else 'scaled'},'d':{'cm':d if annotated_d else round(d),'status':'annotated' if annotated_d else 'scaled'}}
    o['actual']={'w':None,'d':None,'h':None,'brand':None,'model':None};o['uncertainty_cm']=None
    objects.append(o)
def new(id,room,name,bounds,w,d,note,status_w='design',status_d='design'):
    return {'id':id,'room_id':room,'name':name,'bounds_pt':bounds,'dimensions':{'w':{'cm':w,'status':status_w},'d':{'cm':d,'status':status_d}},'actual':{'w':None,'d':None,'h':None,'brand':None,'model':None},'source_note':note,'status':'user-design'}
objects.extend([
new('guest-wardrobe','guest','客房衣櫃',[385.92,212.8,420,229.84],120,60,'依使用者要求，複製小孩房衣櫃並左右鏡像，尺寸同為 120 × 60 cm。'),
new('guest-bed','guest','客房床',[363,153.28,417.12,196.36],152,191,'小孩房床符號左右鏡像複製。圖面占位約 152 × 191 cm，實物尺寸待提供。','scaled','scaled'),
new('study-cabinet','study','書房收納櫃（用途待定）',[273.36,266.68,307.44,283.72],120,60,'原 STUDY 右下櫃旋轉 180° 移入，寬 120 cm 原有標註，深約 60 cm。用途與內部分區待定。','design','scaled'),
new('study-desk','study','書房書桌',[273.36,283.72,287.64,348.88],230,50,'使用者授權依新書房內界配適：原長 240 cm 改為約 230 cm（內深約 290 − 櫃深約 60）；桌邊採原圖 x405.72（非 x400.8 尺寸輔助線），桌深約 50 cm。實際製作需複尺。','fit','scaled')])
prefix={'living':'LIV','kitchen':'KIT','helper':'HLP','master':'MST','kid':'KID','study':'STD','guest':'GST'}
for room in names:
    for i,o in enumerate([o for o in objects if o['room_id']==room],1):o['code']=f'{prefix[room]}-{i:02}'
objects.sort(key=lambda o:(list(names).index(o['room_id']),o['code']))
aux=json.loads((ROOT.parent/'tmp/pdfs/auxiliary-audit.json').read_text(encoding='utf8'))
shutil.copyfile(ROOT.parent/'tmp/pdfs/auxiliary-audit.json',ROOT/'reference'/'auxiliary-audit.json')
data={'schema_version':1,'project':{'name':'SKG · 空間圖冊','revision':'R02','unit':'cm','date':'2026-10-15'},'scale':a['scale'],'auxiliary':aux,
'sources':[{'file':'Floor plan scale.pdf','page':1,'role':'新格局與量測主來源'},{'file':'Summary.pdf','page':4,'role':'原始格局與 5 m 比例尺交叉核對'}],
'rooms':rooms,'objects':objects,'source_dimensions':a['dimensions'],
'changes':[{'id':'C01','text':'BEDROOM 2 → KID ROOM；保留原配置。'},{'id':'C02','text':'原 STUDY → GUEST ROOM；配置改用小孩房左右鏡像，增加同尺寸衣櫃。'},{'id':'C03','text':'BEDROOM 3 → STUDY；原 STUDY 室內配置旋轉 180° 搬入，書桌依新房深由 240 cm 調為約 230 cm。'}],
'measurement_policy':{'unit':'cm','basis':'所有房間以新格局內牆面／窗室內側線為基準；尺寸包含櫃體占位，非全部可用淨空。','scaled':'≈ 為 PDF 等比讀值，取整 cm；無現場誤差保證。','annotated':'原標：圖上明示的 mm 已除以 10 換算 cm；同一物件其他軸仍可能是估算。','fit':'配適：依使用者授權的新配置設計值，非實物量測。','actual':'品牌、型號、寬、深、高皆待使用者提供；不得以圖面符號冒充實物尺寸。','calibration':'按 1:100 對應 3.52778 cm/pt；16 項可用標註最小平方結果 3.52592 cm/pt。Summary 5 m 比例尺獨立校準，5 條外牆跨度差 0.29%–0.77%。','scope':'主臥與客餐廳為不規則區域，按分區尺寸記錄。未以外包矩形推算面積。'}}
(ROOT/'src'/'project.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
print('Initialized',len(rooms),'rooms and',len(objects),'objects.')
