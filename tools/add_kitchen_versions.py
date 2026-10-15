"""One-time R03 source migration. Do not rerun on edited source data."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];p=ROOT/'src'/'project.json';data=json.loads(p.read_text(encoding='utf8'))
assert 'roomVersions' not in data,'Already migrated'
data['project'].update(revision='R03',date='2026-10-16')
def obj(id,code,name,bounds,w,d,note):return {'id':id,'code':code,'room_id':'kitchen','name':name,'bounds_pt':bounds,'dimensions':{'w':{'cm':w,'status':'scaled'},'d':{'cm':d,'status':'scaled'}},'actual':{'w':None,'d':None,'h':None,'brand':None,'model':None},'source_note':note,'status':'scaled-symbol'}
data['objects'].extend([
obj('kitchen-sink','KIT-05','水槽',[462.36,336.28,479.52,350.56],61,50,'原圖水槽完整符號外框約 61 × 50 cm。實際盆體與開孔尺寸待選型。'),
obj('kitchen-hob','KIT-06','瓦斯爐',[497.64,337.24,518.88,349.12],75,42,'原圖瓦斯爐完整符號外框約 75 × 42 cm；不是已購爐具尺寸。'),
obj('appliance-tower','KIT-07','電器高櫃',[460.2,333.28,479.52,351.76],68,65,'B 方案原水槽段的暫定占位約 68 × 65 cm，非定案櫃寬深。到天花板的高度待量；三層可拉出：下層電鍋、中層微波爐、上層氣炸鍋，底部封閉收納。')])
tower=next(o for o in data['objects'] if o['id']=='appliance-tower');tower['dimensions']['w']['status']='design';tower['dimensions']['d']['status']='design';tower['status']='user-design';tower['onlyLayouts']=['window-sink']
fields=next(r for r in data['rooms'] if r['id']=='kitchen')['notes']
notesA={k:v or '' for k,v in fields.items()};notesA.update({'方案配置':'保留原圖：左側水槽、右側瓦斯爐，中間為對外窗。右側為廚房門。','水槽與瓦斯爐':'目前配置的圖面占位，實物型號與開孔尺寸待提供。'})
notesB={k:v or '' for k,v in fields.items()};notesB.update({'方案配置':'水槽移到下方中間外窗位；瓦斯爐移到下檯面右端，靠右側門邊。右側門與原固定開口保留。','電器高櫃':'原水槽位置做至天花板電器櫃；三個可拉出層：下層電鍋、中層微波爐、上層氣炸鍋；底部封閉收納。','櫃高／每層淨高':'待現場量測與電器型號。','女傭房動線':'本版將水槽操作區移離女傭房門口；依使用者指示，開門弧暫不納入檢查。','設計備註':'位置為方案示意；櫃寬深、爐具定位、窗台／龍頭高度與電器使用淨空仍待定。'})
data['roomVersions']={'kitchen':[
{'id':'kitchen-current','name':'A · 目前配置','baseId':'kitchen-current','layout':'original','createdAt':'2026-10-16T00:00:00+08:00','notes':notesA,'objectOverrides':{}},
{'id':'kitchen-window-sink','name':'B · 窗下水槽＋電器高櫃','baseId':'kitchen-window-sink','layout':'window-sink','createdAt':'2026-10-16T00:00:00+08:00','notes':notesB,'objectOverrides':{
'kitchen-sink':{'bounds_pt':[479.4,336.28,496.56,350.56]},
'kitchen-hob':{'bounds_pt':[527.52,337.24,548.76,349.12]},
'appliance-tower':{'bounds_pt':[460.2,333.28,479.52,351.76]}}}]}
data['changes'].extend([{'id':'C04','text':'刪除頁首標語與單位展示區，首屏優先顯示平面圖。'},{'id':'C05','text':'廚房加入 A 原配置與 B 窗下水槽／右端瓦斯爐／電器高櫃方案，版本各自保存筆記。'},{'id':'C06','text':'私人網站加入登入與雲端同步；各欄位採版本檢查，避免跨裝置覆寫。'}])
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
print('R03 migrated: 2 kitchen variants; 23 registered objects, tower only shown in B.')
