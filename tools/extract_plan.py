"""Extract source paths without redrawing geometry. PDF points, top-left origin."""
from pathlib import Path
import pymupdf as fitz
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'Floor plan scale.pdf'
def n(v): return f'{v:.4f}'.rstrip('0').rstrip('.')
def point(p): return f'{n(p.x)} {n(p.y)}'
def path_data(items):
    result=[]; last=None
    for it in items:
        op=it[0]
        if op in ('l','c'):
            if last != it[1]: result.append('M'+point(it[1]))
            if op=='l': result.append('L'+point(it[2])); last=it[2]
            else: result.append('C'+' '.join(point(p) for p in it[2:])); last=it[4]
        elif op=='re':
            r=it[1]; result.append(f'M{n(r.x0)} {n(r.y0)}H{n(r.x1)}V{n(r.y1)}H{n(r.x0)}Z'); last=None
        elif op=='qu':
            q=it[1]; result.append('M'+point(q.ul)+'L'+point(q.ur)+'L'+point(q.lr)+'L'+point(q.ll)+'Z'); last=None
        else: raise ValueError(op)
    return ' '.join(result)

doc=fitz.open(SOURCE); page=doc[0]; drawings=page.get_drawings()
assert len(drawings)==1043, 'Source changed: review drawing cutoff before rebuilding'
assert tuple(round(x,2) for x in drawings[830]['rect'])==(564.24,253.96,571.08,253.96)
parts=[]; room_parts={'kid':[], 'guest':[], 'study':[]}; path_records=[]
room_bounds={'kid':fitz.Rect(273.3,144.7,344.4,229.9), 'guest':fitz.Rect(349.8,144.7,420.1,229.9),'study':fitz.Rect(273.3,266.6,344.4,348.95)}
for i,d in enumerate(drawings[:830]):
    layer=d.get('layer','')
    klass='wall' if layer=='QY Wall' else 'window' if layer=='QY Window' else 'new-wall' if layer=='REVCLOUD' else 'furnishing'
    attrs=f'data-source-path="{i}" class="{klass}" d="{path_data(d["items"])}"'
    attrs+=' fill="currentColor"' if d.get('fill') else ' fill="none"'
    if d.get('color') is not None:
        attrs+=f' stroke="currentColor" stroke-width="{n(d["width"])}" stroke-linecap="round" stroke-linejoin="round"'
    if d.get('closePath'):
        attrs=attrs.replace('d="'+path_data(d['items'])+'"','d="'+path_data(d['items'])+' Z"')
    fragment='<path '+attrs+'/>'
    room=None
    if klass=='furnishing':
        for key,rect in room_bounds.items():
            if rect.contains(d['rect']): room=key; break
    if room: room_parts[room].append(fragment)
    else: parts.append(fragment)
    path_records.append({'index':i,'class':klass,'room':room,'rect':list(d['rect'])})
(ROOT/'src'/'plan-paths.svg').write_text('\n'.join(parts),encoding='utf8')
# Physical TV lower return is interleaved with dimensions; preserve this reviewed exception.
d=drawings[952]
assert tuple(round(x,2) for x in d['rect'])==(573.0,253.96,581.52,253.96)
with (ROOT/'src'/'plan-paths.svg').open('a',encoding='utf8') as f:
    f.write(f'\n<path class="furnishing" data-source-path="952" d="{path_data(d["items"])}" fill="none" stroke="currentColor" stroke-width="{n(d["width"])}"/>')
for room,paths in room_parts.items(): (ROOT/'src'/f'furniture-{room}.svg').write_text('\n'.join(paths),encoding='utf8')
(ROOT/'src'/'path-index.json').write_text(json.dumps(path_records),encoding='utf8')
# A direct source SVG is available for comparison, with its original millimetre annotations.
original=page.get_svg_image(text_as_path=True)
(ROOT/'src'/'source-original.svg').write_text(original,encoding='utf8')
doc2=fitz.open(ROOT.parent/'Summary.pdf')
doc2[3].get_pixmap(matrix=fitz.Matrix(1,1)).save(ROOT/'assets'/'summary-original.png')
page.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(ROOT/'assets'/'layout-source.png')
print(f'Extracted {len(parts)} fixed paths; furniture '+str({r:len(p) for r,p in room_parts.items()}))
