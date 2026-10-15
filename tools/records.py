"""Focused record retrieval/merge patch; no third-party dependencies."""
from pathlib import Path
import json,argparse
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('action',choices=['show','patch']);p.add_argument('type',choices=['room','object']);p.add_argument('id');p.add_argument('patch_file',nargs='?');args=p.parse_args()
path=ROOT/'src'/'project.json';data=json.loads(path.read_text(encoding='utf8'))
records=data['rooms' if args.type=='room' else 'objects'];record=next((x for x in records if x['id']==args.id),None)
if record is None:raise SystemExit('Unknown stable id: '+args.id)
def merge(old,patch):
    for key,value in patch.items():
        if key in ('id','room_id','code') and key in old and old[key]!=value:raise ValueError('Stable identity fields cannot be patched')
        if isinstance(value,dict) and isinstance(old.get(key),dict):merge(old[key],value)
        else:old[key]=value
if args.action=='patch':
    if not args.patch_file:raise SystemExit('patch requires a JSON patch file')
    patch=json.loads(Path(args.patch_file).read_text(encoding='utf8'))
    if not isinstance(patch,dict):raise SystemExit('patch must be a JSON object')
    merge(record,patch)
    if args.type=='object':
        for dim in record['dimensions'].values():
            if not isinstance(dim['cm'],(float,int)) or dim['cm']<=0:raise ValueError('Drawing size must be positive')
        for key in ['w','d','h']:
            value=record['actual'][key]
            if value is not None and (not isinstance(value,(float,int)) or value<=0):raise ValueError('Actual size must be null or positive')
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(record,ensure_ascii=False,indent=2))
