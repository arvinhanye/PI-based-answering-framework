import {it,expect,afterEach} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {setCapabilities,resetCapabilitiesCache,visibleWidth} from '@earendil-works/pi-tui';
import {createStudyRenderer} from '../../src/adapters/pi/renderer.js';
const isImageLine=(line:string)=>line.includes('\x1b_G') || line.includes('\x1b]1337;File=');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';
const clean:Array<()=>void>=[];afterEach(()=>{resetCapabilitiesCache();clean.splice(0).forEach(f=>f());});
function fixture(protocol:'kitty'|'iterm2'|null){
 setCapabilities({images:protocol,trueColor:true,hyperlinks:false});
 const dir=mkdtempSync(join(tmpdir(),'study-render-'));clean.push(()=>rmSync(dir,{recursive:true,force:true}));mkdirSync(join(dir,'assets'));writeFileSync(join(dir,'assets','q.png'),Buffer.from(png,'base64'));
 const asset={role:'question',mime:'image/png',path:'assets/q.png',sha256:'unused'};
 const message={content:'题干\n\nA. 选项\n\n📎 2 张题图，输入 图 打开\n⚠ 原题缺图，本题不计分',details:{images:[asset,asset]}};
 const render=createStudyRenderer(dir);return{dir,asset,message,render:(m=message,width=36)=>render(m as any,{expanded:false,outputPad:1},{fg:(_c:string,t:string)=>t} as any)!.render(width)};
}
it.each(['kitty','iterm2'] as const)('renders safe images after options, with numbered captions in %s',protocol=>{
 const f=fixture(protocol),lines=f.render(),text=lines.join('\n');
 expect(lines.filter(isImageLine)).toHaveLength(2);expect(text).toContain('图 1 / 2');expect(text).toContain('图 2 / 2');expect(text).not.toContain('📎');
 expect(lines.findIndex(isImageLine)).toBeGreaterThan(lines.findIndex(x=>x.includes('A. 选项')));
 expect(text.indexOf('原题缺图')).toBeGreaterThan(text.indexOf('图 2 / 2'));
 expect(lines.filter(l=>!isImageLine(l)).every(l=>visibleWidth(l)<=36)).toBe(true);
 expect(JSON.stringify(f.message)).not.toContain(png);
});
it('unsupported terminals keep a readable external-open fallback without image escape codes',()=>{
 const f=fixture(null),lines=f.render();expect(lines.some(isImageLine)).toBe(false);expect(lines.join('\n')).toContain('📎 2 张题图，输入 图 打开');
});
it('revalidates paths and fails closed for replaced symlinks or malformed details',()=>{
 const f=fixture('kitty');writeFileSync(join(f.dir,'private.png'),Buffer.from(png,'base64'));rmSync(join(f.dir,'assets','q.png'));symlinkSync(join(f.dir,'private.png'),join(f.dir,'assets','q.png'));
 const lines=f.render();expect(lines.some(isImageLine)).toBe(false);expect(lines.join('\n')).toContain('题图无法安全读取');
 expect(()=>f.render({...f.message,details:{images:[{path:'../../private.png'}]}} as any)).not.toThrow();
});
it('bad image bytes produce Chinese fallback rather than protocol garbage',()=>{
 const f=fixture('kitty');writeFileSync(join(f.dir,'assets','q.png'),'invalid image');const lines=f.render(f.message,80);expect(lines.some(isImageLine)).toBe(false);expect(lines.join('\n')).toContain('输入 图 打开');
});
