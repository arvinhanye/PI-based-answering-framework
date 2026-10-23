"""Real Pi PTY text checks. Does NOT certify Warp rendering or physical keyboard input."""
import os, pty, fcntl, termios, struct, select, time, json, re, sys, signal
root=sys.argv[1]
samples=json.load(open(root+'/samples.json'))
pid,fd=pty.fork()
if pid==0:
    os.chdir(root)
    os.environ.update(TERM='xterm-256color',TERM_PROGRAM='Apple_Terminal',PI_OFFLINE='1',PI_TELEMETRY='0')
    os.environ.pop('WARP_SESSION_ID',None)
    os.execvp('pi',['pi','--offline','--no-extensions','--no-skills','--no-prompt-templates','--no-context-files','--no-session','--provider','deepseek','--model','deepseek-flash','-e',root+'/extension.mjs'])
fcntl.ioctl(fd,termios.TIOCSWINSZ,struct.pack('HHHH',45,150,0,0))
raw=b''
def pump(seconds=.3):
    global raw
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        if select.select([fd],[],[],.1)[0]:
            try: chunk=os.read(fd,65536)
            except OSError:return
            raw+=chunk
            if b'\x1b[6n' in chunk:os.write(fd,b'\x1b[1;1R')
def events():
    try:return [json.loads(line) for line in open(root+'/events.jsonl')]
    except FileNotFoundError:return []
def command(text):
    before=len(events());os.write(fd,(text+'\r').encode());end=time.monotonic()+10
    while time.monotonic()<end:
        pump(.2)
        if len(events())>before:
            pump(.4);return events()[before:]
    raise RuntimeError('No extension output for '+text)
def card(rows):return [e['content'] for e in rows if e['type']=='card']
def answer(sample):
    return ''.join({'true':'对','false':'错'}.get(value,value) for value in sample['answer'])
results={}
try:
    pump(4)
    rows=command('/study 1500');q=card(rows)[0]
    assert '第 3 题' in q and '⚠' not in q and '考点】' not in q
    rows=command('B');r=card(rows)[0]
    assert '✓ 正确' in r and r.index('这段解析可能有误')>r.index('解析：')
    assert any('本轮 对 1 · 错 0' in str(e) for e in rows)
    results['1']={'passed':True,'question':q,'result':r}
    q=card(command('n'))[0];assert '原题缺图，本题不计分' in q and q.count('⚠')==1
    r=card(command(samples[1]['answer'][0]))[0];assert '— 不计分（原题缺图）' in r
    results['4']={'passed':True,'question':q,'result':r}
    command('/study 省赛');r=card(command(answer(samples[2])))[0];assert r.count('题库未提供解析')==1 and '⚠' not in r
    results['3']={'passed':True,'result':r}
    command('/study pdf');r=card(command(answer(samples[3])))[0];assert '✓ 正确' in r and 'ocr_text_unverified' not in r
    results['2']={'passed':True,'result':r}
    command('n');rows=command('n');assert '第 p1-q3 题' in card(rows)[0] and any(e.get('images',0)>0 for e in rows)
    results['8_fallback']={'passed':True,'question':card(rows)[0],'note':'PTY text fallback only; no Warp pixels or Preview window checked'}
    all_events=events();widgets=[e['args'] for e in all_events if e['type']=='widget' and e['args'][1]]
    assert all(len(a[1])==1 and a[2]['placement']=='belowEditor' for a in widgets)
    assert all(e['args'][1] is None for e in all_events if e['type']=='status')
    assert '本月 0.04 / 10.00 元' in widgets[-1][1][0]
    results['5']={'passed':True,'lastWidget':widgets[-1],'note':'Pi PTY + widget API placement; not Warp visual acceptance'}
    results['6']={'passed':True,'source':'1500 / 3'}
    command('/study exit')
    plain=re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]','',raw.decode('utf8','replace'))
    assert all(t in plain for t in ['第 3 题','✓ 正确','这段解析可能有误','本轮 对 1','题库未提供解析','— 不计分','第 p1-q3 题'])
    results['terminalTextObserved']=True
    results['physicalWarpKeyboard']='NOT_TESTED'
    results['warpInlineAndPreview']='NOT_TESTED'
    results['terminalAppPreview']='NOT_TESTED'
    print(json.dumps({'passed':True,'cases':list(results)},ensure_ascii=False))
finally:
    open(root+'/terminal.ansi','wb').write(raw)
    open(root+'/results.json','w').write(json.dumps(results,ensure_ascii=False,indent=2))
    try:os.kill(pid,signal.SIGTERM)
    except ProcessLookupError:pass
    os.close(fd)
