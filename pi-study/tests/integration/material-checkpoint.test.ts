import {it,expect} from 'vitest';
import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadCheckpoint,savePageCheckpoint} from '../../src/import/checkpoint.js';
it('page_checkpoint_resume_no_duplicates',async()=>{const p=join(await mkdtemp(join(tmpdir(),'pages-')),'check.json');const rec={page:1,status:'converted' as const,candidateIds:['p1-q1'],unrecognizedRegions:[],outputHash:'a'};await savePageCheckpoint(p,'hash',rec);await savePageCheckpoint(p,'hash',rec);expect((await loadCheckpoint(p,'hash')).records).toHaveLength(1);await expect(loadCheckpoint(p,'changed')).rejects.toThrow('changed_source_stops_resume');});
