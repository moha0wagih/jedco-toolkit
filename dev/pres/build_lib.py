import json,base64,os,sys
src='/home/claude/photos'; out=sys.argv[1]
os.makedirs(out,exist_ok=True)
meta=json.load(open(src+'/meta.json')); tags=json.load(open(src+'/tags.json'))
lib={}
for pid in sorted(meta):
    t=tags.get(pid,{})
    if t.get('skip'): continue
    m=meta[pid]
    th=base64.b64encode(open(f'{src}/thumb/{pid}.jpg','rb').read()).decode()
    lib[pid]={'w':m['w'],'h':m['h'],'kw':t.get('kw',[]),'subj':t.get('subj',''),'light':t.get('light',''),'space':t.get('space','none'),'people':t.get('people',False),'hero':t.get('hero',1),'note':t.get('note',''),'folder':m.get('folder',''),'th':th}
    b=base64.b64encode(open(f'{src}/full/{pid}.jpg','rb').read()).decode()
    open(f'{out}/{pid}.js','w').write(f"PM.__ph('{pid}','{b}');\n")
open(f'{out}/lib.js','w').write('window.PM=window.PM||{};PM.PHOTOLIB='+json.dumps(lib,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(lib), round(os.path.getsize(out+'/lib.js')/1e6,2),'MB index')
