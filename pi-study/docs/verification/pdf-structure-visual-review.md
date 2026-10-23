# PDF 结构异常原页视觉复核

agent visual QA；不是用户人工验收。对最新81个未决候选中含 invalid_option_answer / single_answer_cardinality / missing_options 的候选去重，实际选出34个，全部检查本地原页PNG。只恢复源文，不凭网络知识推断答案。

结果：{'ocr_correction': 26, 'source_anomaly': 8}；未留未检查候选。source_anomaly 保留源标签/答案，不能为了消除校验告警伪造修正。

|候选|原页|分类|证据|
|---|---|---|---|
|p10-q50|10|ocr_correction|第10页49题明确有 A.建立 CAPWAP 隧道，题干答案（A），【单选题】。|
|p26-q109|26|source_anomaly|第26页105题原文明确（AC）【单选题】，类型和答案冲突；按源保存，不将其推测改为多选。|
|p27-q117|27|ocr_correction|第27页113题的【多选题】换行后紧接 A；答案ABCD。|
|p42-q171|42|ocr_correction|第42页167题A/B/C/D标签清楚，答案B。|
|p46-q194|46,47|ocr_correction|第46页189题题干答案C、单选；第46页A/B表及第47页C/D表逐项抄录；源表端口印为GEC/0/x，照录，不将G误作标签。|
|p52-q224|52|ocr_correction|第52页219题明确（BC）【多选题】；“如果单选选择C”是附注，不能覆盖多选题类型。|
|p62-q265|62|ocr_correction|第62页259题B单独一行，答案B，单选。|
|p64-q277|64|ocr_correction|第64页271题B单独一行；源题（BD）【多选题】。|
|p85-q362|85,86|ocr_correction|第85页355题（BCE）【多选题】；第86页A后同一行紧接B，须拆开。|
|p86-q365|86,87|ocr_correction|第86页358题答案D、单选；第87页顶部题图A/B/C/D可见，D绿色高亮。|
|p98-q422|98|ocr_correction|第98页413题主答案为（B）【单选题】；随后“如果是多选题选择（BC）”是有条件附注。应按明确主类型恢复B，保留附注于证据。|
|p107-q459|107|ocr_correction|第107页450题A单独一行，答案ABCD，多选。|
|p110-q471|110|ocr_correction|第110页462题明确（AB）【多选题】；“如果是单选选A”为条件附注，不改变主类型。|
|p120-q514|120|source_anomaly|第120页505题原文明确（CD）【单选题】，类型与答案冲突。源异常，不凭知识删答案或改类型。|
|p122-q522|122|ocr_correction|第122页513题A单独一行，主答案A、单选。|
|p125-q539|125|ocr_correction|第125页532题A/B分行，主答案ABCD，多选。|
|p127-q551|127|source_anomaly|第127页543题括号为空，红字“应该是错题，a，b，g，ac 应该都是标准。”，确无答案。|
|p127-q552|127|ocr_correction|第127页544题A/B分行，源ABCD、多选。|
|p134-q585|134|ocr_correction|第134页577题A单独一行，主答案A、单选。|
|p135-q591|135,136|source_anomaly|第135页583题主答案B、单选；第136页选项源文确印为A.SWB / C.SWA / C.SWC / D.SWD，重复C且无B，属于原文标签异常。保留实际标签，不能臆改第二项为B。|
|p137-q604|137,138|ocr_correction|第137页596题A.WAP / B.VAP；第138页续C.VAC / D.VT，主答案B、单选。|
|p141-q619|141|source_anomaly|第141页611题确印（AD）【单选题】，主类型和答案冲突；C清晰为广播。|
|p143-q629|143|source_anomaly|第143页621题A粘在题干后须拆开；原文（A B）【单选题】是源类型/答案冲突。|
|p144-q633|144|source_anomaly|第144页625题有A.Telnetlib 可以实现这个功能；原文（B D）【单选题】为源类型/答案冲突。|
|p146-q648|146|ocr_correction|第146页640题【多选题】后紧接A；源ABCD，不按知识改动原文。|
|p146-q649|146|ocr_correction|第146页641题B单独一行，源B、单选。|
|p159-q702|159|ocr_correction|第159页694题A标签独占一行，下一行为完整A选项；主答案A、单选。|
|p166-q734|166|ocr_correction|第166页723题清晰A对/B错，参考答案A。|
|p175-q763|175|ocr_correction|第175页752题A单独选项，源多选ABC。|
|p175-q765|175|ocr_correction|第175页754题源A0/B1/C2/D3，答案A。|
|p182-q783|182|ocr_correction|第182页771题A–D四条命令选项清晰；参考答案AD。|
|p211-q884|211,212|ocr_correction|第211页869题开始，第212页图后清晰A对/B错、参考答案B。|
|p232-q943|232|ocr_correction|第232页926题每个A/B/C/D标签独占一行，命令中的BPDU被误识别为选项标签；原答案AB。|
|p235-q960|235|source_anomaly|第235页943题A–D后页终，无答案标记；源文件最后一页，无后续页可补。|

纠正JSON包含原stem前40字及SHA-256，便于新增无题号分割后定位。answer为原标签字符串；可选字段仅是必要纠正，其余字段应保留。未修改主转换流水线或pdf.json。
