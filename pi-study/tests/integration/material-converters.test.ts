import {describe,it,expect} from 'vitest';
import {parseOptions,splitInlineAnswer} from '../../src/import/converters/text.js';
describe('material boundaries',()=>{
 it('preserves_wbr_wtab_option_boundaries',()=>expect(parseOptions('A. alpha\nB.\nbeta\tC. gamma')).toEqual([{id:'A',text:'alpha'},{id:'B',text:'beta'},{id:'C',text:'gamma'}]));
 it('merges_option_continuation_lines',()=>expect(parseOptions('A. command\n parameter\nB. next')[0]?.text).toBe('command\nparameter'));
 it('command_dots_do_not_split_options',()=>expect(parseOptions('A. X.25\nB. RSTP.MSTP\nC. NCE-FabriC.')).toHaveLength(3));
 it('inline_answer_not_presented',()=>expect(splitInlineAnswer('12. Why? (ABC)\nA. one').body).toBe('12. Why?\nA. one'));
 it('raw_answer_preserved',()=>expect(splitInlineAnswer('12. Why? (ABC)\nA. one').rawAnswer).toBe('ABC'));
});
