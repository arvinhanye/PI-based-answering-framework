import type {QuestionKind} from '../../contracts.js';
export interface VerifiedCorrection {candidateId:string;sourcePages:number[];classification:string;evidence:string;answer?:string;rawAnswer?:string;kind?:QuestionKind;stem?:string;options?:Array<{id:string;text:string}>;originalStemPrefix?:string;originalStemSha256?:string;crop?:{page:number;bbox:[number,number,number,number]};}
export const verifiedSourceHash="361f96a5c8d7fdc5dbe87cb0a59c3e094eb443c8df9a92a50d705ada807e0740";
export const verifiedCorrections:VerifiedCorrection[]=[
  {
    "candidateId": "p3-q11",
    "sourcePages": [
      3
    ],
    "classification": "ocr_correction",
    "evidence": "第3页上方嵌入题图以绿色圆形及文字高亮 D；A/B/C 灰色，未另见文字答案行。按原图的标记记录 D。",
    "answer": "D",
    "rawAnswer": "绿色高亮选项 D",
    "stem": "如下图所示的网络，在路由器输入下列哪些命令可以使主机 A 能够 Ping 通主机 B？",
    "options": [
      {
        "id": "A",
        "text": "Router A: ip route-static 10.0.12.1 255.255.255.252 11.0.12.1\nRouter B: ip route-static 10.0.12.5 255.255.255.252 11.0.12.2"
      },
      {
        "id": "B",
        "text": "Router A: ip route-static 0.0.0.0 0.0.0.0 11.0.12.1\nRouter B: ip route-static 0.0.0.0 0.0.0.0 11.0.12.2"
      },
      {
        "id": "C",
        "text": "Router A: ip route-static 10.0.12.1 255.255.255.252 11.0.12.2\nRouter B: ip route-static 10.0.12.5 255.255.255.252 11.0.12.1"
      },
      {
        "id": "D",
        "text": "Router A: ip route-static 0.0.0.0 0.0.0.0 11.0.12.2\nRouter B: ip route-static 0.0.0.0 0.0.0.0 11.0.12.1"
      }
    ],
    "crop": {
      "page": 3,
      "bbox": [
        0.164,
        0.112,
        0.56,
        0.218
      ]
    }
  },
  {
    "candidateId": "p18-q82",
    "sourcePages": [
      18
    ],
    "classification": "ocr_correction",
    "evidence": "第18页上方嵌入题图中 B、D 选项方框及文字为绿色，A、C 灰色；题图题型为多选题。按源图记录 BD。",
    "answer": "BD",
    "rawAnswer": "绿色高亮选项 B、D",
    "kind": "multiple",
    "stem": "某台路由器路由表输出信息如下，下列说法正确的有？",
    "options": [
      {
        "id": "A",
        "text": "本路由器到达10.0.0.1的 NextHop 为10.0.21.2"
      },
      {
        "id": "B",
        "text": "本路由器到达10.0.0.1的 NextHop 为10.0.12.2"
      },
      {
        "id": "C",
        "text": "本路由器到达10.0.2.2的 NextHop 为10.0.12.2"
      },
      {
        "id": "D",
        "text": "本路由器到达10.0.2.2的 NextHop 为10.0.21.2"
      }
    ],
    "crop": {
      "page": 18,
      "bbox": [
        0.158,
        0.222,
        0.325,
        0.058
      ]
    }
  },
  {
    "candidateId": "p70-q294",
    "sourcePages": [
      70
    ],
    "classification": "ocr_correction",
    "evidence": "第70页顶部嵌入题图中 A 对为绿色选中，B 错为灰色；原选项标签为 A/B。",
    "answer": "A",
    "rawAnswer": "绿色高亮选项 A 对",
    "kind": "truefalse",
    "stem": "VTY 用户界面的最大个数决定了多少个用户可以同时通过 Telnet 或 STelnet 登录设备。"
  },
  {
    "candidateId": "p127-q550",
    "sourcePages": [
      127
    ],
    "classification": "ocr_correction",
    "evidence": "第127页题号542的题干末尾为（A，右括号换至下一行；选项 A.正确 / B.错误。源答案标签为 A，不能因转换为 true/false 而丢失来源。",
    "answer": "A",
    "rawAnswer": "（A）",
    "kind": "truefalse"
  },
  {
    "candidateId": "p127-q551",
    "sourcePages": [
      127
    ],
    "classification": "source_missing",
    "evidence": "第127页题号543的答案括号为空；红色注释为“应该是错题，a，b，g，ac 应该都是标准。”；A–D选项后直接进入544题。源页确无所给正确答案，不凭网络知识补答。"
  },
  {
    "candidateId": "p134-q584",
    "sourcePages": [
      134
    ],
    "classification": "ocr_correction",
    "evidence": "第134页题号576选项D后清晰印有“参考答案：ACD”；按原文保留 ACD，不评判其专业正确性。",
    "answer": "ACD",
    "rawAnswer": "参考答案：ACD"
  },
  {
    "candidateId": "p151-q670",
    "sourcePages": [
      151
    ],
    "classification": "ocr_correction",
    "evidence": "第151页题号662选项D后清晰印有“参考答案：ABC”。",
    "answer": "ABC",
    "rawAnswer": "参考答案：ABC"
  },
  {
    "candidateId": "p158-q699",
    "sourcePages": [
      158
    ],
    "classification": "ocr_correction",
    "evidence": "第158页题号691选项D后清晰印有“参考答案：BC”。",
    "answer": "BC",
    "rawAnswer": "参考答案：BC"
  },
  {
    "candidateId": "p167-q737",
    "sourcePages": [
      167,
      168
    ],
    "classification": "ocr_correction",
    "evidence": "第167页题号726开始；第168页包含题图及A–D选项，末尾清晰印有“参考答案：BC”。",
    "answer": "BC",
    "rawAnswer": "参考答案：BC"
  },
  {
    "candidateId": "p169-q740",
    "sourcePages": [
      169,
      170
    ],
    "classification": "ocr_correction",
    "evidence": "第169页题号729开始；第170页顶部续题及A–D选项后清晰印有“参考答案：A”。",
    "answer": "A",
    "rawAnswer": "参考答案：A"
  },
  {
    "candidateId": "p171-q746",
    "sourcePages": [
      171
    ],
    "classification": "ocr_correction",
    "evidence": "第171页题号735的A对/B错后清晰印有“参考答案：A”。",
    "answer": "A",
    "rawAnswer": "参考答案：A",
    "kind": "truefalse"
  },
  {
    "candidateId": "p177-q771",
    "sourcePages": [
      177,
      178
    ],
    "classification": "ocr_correction",
    "evidence": "第177页题号760包含题图及A/B；第178页顶部续C/D后清晰印有“参考答案：D”。",
    "answer": "D",
    "rawAnswer": "参考答案：D"
  },
  {
    "candidateId": "p191-q816",
    "sourcePages": [
      191
    ],
    "classification": "ocr_correction",
    "evidence": "第191页题号801为多选题，原选项 A RA、B NA、C NS、D RS，后清晰印有“参考答案：AD”。原转换误成判断题选项，需同时恢复原A–D标签及选项。",
    "answer": "AD",
    "rawAnswer": "参考答案：AD",
    "kind": "multiple",
    "options": [
      {
        "id": "A",
        "text": "RA"
      },
      {
        "id": "B",
        "text": "NA"
      },
      {
        "id": "C",
        "text": "NS"
      },
      {
        "id": "D",
        "text": "RS"
      }
    ]
  },
  {
    "candidateId": "p198-q843",
    "sourcePages": [
      198
    ],
    "classification": "ocr_correction",
    "evidence": "第198页题号828选项D后清晰印有“参考答案：D”。",
    "answer": "D",
    "rawAnswer": "参考答案：D"
  },
  {
    "candidateId": "p216-q896",
    "sourcePages": [
      216,
      217
    ],
    "classification": "ocr_correction",
    "evidence": "第216页题号880开始；第217页续图及A–D选项后清晰印有“参考答案：CD”。",
    "answer": "CD",
    "rawAnswer": "参考答案：CD"
  },
  {
    "candidateId": "p223-q917",
    "sourcePages": [
      223
    ],
    "classification": "ocr_correction",
    "evidence": "第223页题号900题干下、选项前单独印有“正确答案C”；源标签为 C。",
    "answer": "C",
    "rawAnswer": "正确答案C"
  },
  {
    "candidateId": "p227-q928",
    "sourcePages": [
      227
    ],
    "classification": "ocr_correction",
    "evidence": "第227页题号911选项D后清晰印有“参考答案：B”；原文B为广播。仅恢复源给出的B，不按专业知识改为C。",
    "answer": "B",
    "rawAnswer": "参考答案：B"
  }
];

export const verifiedStructureCorrections:VerifiedCorrection[]=[
  {
    "candidateId": "p10-q50",
    "sourcePages": [
      10
    ],
    "originalStemPrefix": "FIT AP 获取 AC 的IP 地址之后首先执行的操作是？",
    "originalStemSha256": "2e294b86bb2a8b0fa2f69a83a82ba8d6ad15b52e3133ea4140ff6ffc5b6f9ab9",
    "classification": "ocr_correction",
    "evidence": "第10页49题明确有 A.建立 CAPWAP 隧道，题干答案（A），【单选题】。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "建立 CAPWAP 隧道"
      },
      {
        "id": "B",
        "text": "请求配置文件"
      },
      {
        "id": "C",
        "text": "下载配置文件"
      },
      {
        "id": "D",
        "text": "升级软件版本"
      }
    ],
    "answer": "A",
    "rawAnswer": "A"
  },
  {
    "candidateId": "p26-q109",
    "sourcePages": [
      26
    ],
    "originalStemPrefix": "当 AP 和 AC 处于不同的三层网络时，推荐使用何种方式让 AP发现 AC？",
    "originalStemSha256": "20662c868293b61a8f191ce607565332099acb33b67ad53ee6d8bad33f6fd91f",
    "classification": "source_anomaly",
    "evidence": "第26页105题原文明确（AC）【单选题】，类型和答案冲突；按源保存，不将其推测改为多选。",
    "kind": "single",
    "answer": "AC",
    "rawAnswer": "AC"
  },
  {
    "candidateId": "p27-q117",
    "sourcePages": [
      27
    ],
    "originalStemPrefix": "虚拟化是实现 NFV 的基础，以下关于虚拟化的特点说法正确的是？【多\n选题】A.",
    "originalStemSha256": "85c76a7f35dba387436033eded61b4779f9b6002ea3c6a46c647a03c2ee2c5c3",
    "classification": "ocr_correction",
    "evidence": "第27页113题的【多选题】换行后紧接 A；答案ABCD。",
    "kind": "multiple",
    "stem": "虚拟化是实现 NFV 的基础，以下关于虚拟化的特点说法正确的是？",
    "options": [
      {
        "id": "A",
        "text": "隔离：同一个物理服务器上的虚拟机相互隔离"
      },
      {
        "id": "B",
        "text": "分区：可以在单个物理服务器上同时运行多个虚拟机"
      },
      {
        "id": "C",
        "text": "封装：虚拟机都是共享操作系统的，通过命令空间实现封装"
      },
      {
        "id": "D",
        "text": "硬件独立：虛拟机和硬件解耦，支持虛拟机在服务器之间迁移"
      }
    ],
    "answer": "ABCD",
    "rawAnswer": "ABCD"
  },
  {
    "candidateId": "p42-q171",
    "sourcePages": [
      42
    ],
    "originalStemPrefix": "JPv6 无状态自动配置使用的 RA 授文属于以下哪种协议？",
    "originalStemSha256": "7dd1af3200b24463e355e035b2d1bb8535d98451e2ec132db8de6f1ea8b6281c",
    "classification": "ocr_correction",
    "evidence": "第42页167题A/B/C/D标签清楚，答案B。",
    "kind": "single",
    "stem": "IPv6 无状态自动配置使用的 RA 报文属于以下哪种协议？",
    "options": [
      {
        "id": "A",
        "text": "UDPv6"
      },
      {
        "id": "B",
        "text": "ICMPv6"
      },
      {
        "id": "C",
        "text": "IGMPv6"
      },
      {
        "id": "D",
        "text": "TCPv6"
      }
    ],
    "answer": "B",
    "rawAnswer": "B"
  },
  {
    "candidateId": "p46-q194",
    "sourcePages": [
      46,
      47
    ],
    "originalStemPrefix": "如下图所示网络，SWA 和SWB 的 MAC 地址表中，MAC 地址、VLAN、",
    "originalStemSha256": "95ff71171c55f4918664a5910c3e4773c27c18670ee6b92ec766c58a06d00567",
    "classification": "ocr_correction",
    "evidence": "第46页189题题干答案C、单选；第46页A/B表及第47页C/D表逐项抄录；源表端口印为GEC/0/x，照录，不将G误作标签。",
    "kind": "single",
    "stem": "如下图所示网络，SWA 和 SWB 的 MAC 地址表中，MAC 地址、VLAN、端口对应关系正确的有？",
    "options": [
      {
        "id": "A",
        "text": "SWB：\nMAC Address | VLAN | Port\nMAC-A | 100 | GEC/0/3\nMAC-B | 200 | GEC/0/3\nMAC-C | 100 | GEC/0/1"
      },
      {
        "id": "B",
        "text": "SWA：\nMAC Address | VLAN | Port\nMAC-A | 10 | GEC/0/1\nMAC-B | 20 | GEC/0/2\nMAC-C | 100 | GEC/0/3"
      },
      {
        "id": "C",
        "text": "SWB：\nMAC Address | VLAN | Port\nMAC-A | 10 | GEC/0/3\nMAC-B | 20 | GEC/0/3\nMAC-C | 100 | GEC/0/1"
      },
      {
        "id": "D",
        "text": "SWA：\nMAC Address | VLAN | Port\nMAC-A | 10 | GEC/0/3\nMAC-B | 20 | GEC/0/3\nMAC-C | 100 | GEC/0/3"
      }
    ],
    "answer": "C",
    "rawAnswer": "C"
  },
  {
    "candidateId": "p52-q224",
    "sourcePages": [
      52
    ],
    "originalStemPrefix": "以下关于 Python 语言说法错误的是？如果单选选择C",
    "originalStemSha256": "2b7631d94e3888d9820a05c7e27306a43c8a5b6c719e2a69d41b37f0bb8dfad4",
    "classification": "ocr_correction",
    "evidence": "第52页219题明确（BC）【多选题】；“如果单选选择C”是附注，不能覆盖多选题类型。",
    "kind": "multiple",
    "options": [
      {
        "id": "A",
        "text": "Python 一般都会按照次序从头到尾执行代码。"
      },
      {
        "id": "B",
        "text": "在写代码时注意多使用注释，帮助读代码人的理解。注释以#开头。"
      },
      {
        "id": "C",
        "text": "Python 语言支持自动缩进，在写代码时候不需要关注。"
      },
      {
        "id": "D",
        "text": "print ()的作用是输出括号内的内容。"
      }
    ],
    "answer": "BC",
    "rawAnswer": "BC"
  },
  {
    "candidateId": "p62-q265",
    "sourcePages": [
      62
    ],
    "originalStemPrefix": "下面关于静态与动态路由描述错误的是？",
    "originalStemSha256": "c36336b8be1e6c399d70e629681f8cb3478eac72aac0f25cb20cfea4259e073d",
    "classification": "ocr_correction",
    "evidence": "第62页259题B单独一行，答案B，单选。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "动态路由协议比静态路由要占用更多的系统资源"
      },
      {
        "id": "B",
        "text": "链路产生故障后，静态路由能够自动完成网络收敛"
      },
      {
        "id": "C",
        "text": "静态路由在企业中应用时配置简单，管理方便"
      },
      {
        "id": "D",
        "text": "管理员在企业网络中部著动态路由协议后，后期维护和扩展能够更加方便"
      }
    ],
    "answer": "B",
    "rawAnswer": "B"
  },
  {
    "candidateId": "p64-q277",
    "sourcePages": [
      64
    ],
    "originalStemPrefix": "如图所示，两台路由器配置了OSPF之后，管理员在RTA上配置了<sllent-\n",
    "originalStemSha256": "167db21fcee94722d3a08733965cbca6877b3394b5b2b627245f54d55bce3248",
    "classification": "ocr_correction",
    "evidence": "第64页271题B单独一行；源题（BD）【多选题】。",
    "kind": "multiple",
    "options": [
      {
        "id": "A",
        "text": "RTA会继续接收并分析处理RTB发送的OSPF报文"
      },
      {
        "id": "B",
        "text": "两台路由器的邻居关系将会down掉"
      },
      {
        "id": "C",
        "text": "两台路由器的邻居关系将不会受影响"
      },
      {
        "id": "D",
        "text": "RTA将不再发送OSPF报文"
      }
    ],
    "answer": "BD",
    "rawAnswer": "BD"
  },
  {
    "candidateId": "p85-q362",
    "sourcePages": [
      85,
      86
    ],
    "originalStemPrefix": "关于冲突域和广播域，描述正确的是？",
    "originalStemSha256": "6a06945c603ddb0997e178dae4db859b1aeedcfabc1d5aa0173646e2c71d15da",
    "classification": "ocr_correction",
    "evidence": "第85页355题（BCE）【多选题】；第86页A后同一行紧接B，须拆开。",
    "kind": "multiple",
    "options": [
      {
        "id": "A",
        "text": "一台采用默认配置的二层交换机所有端口上连接的设备属于一个冲突域"
      },
      {
        "id": "B",
        "text": "一台 HUB 所有端口上连接的设备属于一个广播域"
      },
      {
        "id": "C",
        "text": "一台 HUB 上所有端口上连接的设备属于一个冲突域"
      },
      {
        "id": "D",
        "text": "一台路由器所连接的设备属于一个广播域"
      },
      {
        "id": "E",
        "text": "一台采用默认配置的二层交换机所有端口上连接的设备属于一个广播域"
      }
    ],
    "answer": "BCE",
    "rawAnswer": "BCE"
  },
  {
    "candidateId": "p86-q365",
    "sourcePages": [
      86,
      87
    ],
    "originalStemPrefix": "如图所示，关于此网络拓扑图描述正确的是？\n711833\n（单法路）如圈所示，关于",
    "originalStemSha256": "6e5fac0d56ebb9daef54b1ae75e09c39c7037404780f9067276d842b9df0d05a",
    "classification": "ocr_correction",
    "evidence": "第86页358题答案D、单选；第87页顶部题图A/B/C/D可见，D绿色高亮。",
    "kind": "single",
    "stem": "如图所示，关于此网络拓扑图描述正确的是？",
    "options": [
      {
        "id": "A",
        "text": "此网络中有6个冲突域"
      },
      {
        "id": "B",
        "text": "此网络中有6个广播域"
      },
      {
        "id": "C",
        "text": "此网络中有12个冲突域"
      },
      {
        "id": "D",
        "text": "此网络中有2个广播域"
      }
    ],
    "answer": "D",
    "rawAnswer": "D"
  },
  {
    "candidateId": "p98-q422",
    "sourcePages": [
      98
    ],
    "originalStemPrefix": "网络管理员使用 Ping 来测试网络的连通性，在这个过程中下面哪些协议可能会披\n",
    "originalStemSha256": "aee633408dc4c1f7a98dd2a1307a20afd60dedbfdd551b38097076b197cdc128",
    "classification": "ocr_correction",
    "evidence": "第98页413题主答案为（B）【单选题】；随后“如果是多选题选择（BC）”是有条件附注。应按明确主类型恢复B，保留附注于证据。",
    "kind": "single",
    "stem": "网络管理员使用 Ping 来测试网络的连通性，在这个过程中下面哪些协议可能会被使用到？",
    "answer": "B",
    "rawAnswer": "（B）【单选题】；如果是多选题选择（BC）"
  },
  {
    "candidateId": "p107-q459",
    "sourcePages": [
      107
    ],
    "originalStemPrefix": "路由器开启 FTP 服务，用户名和密码均为 huawel，并且设置 FTP 的根",
    "originalStemSha256": "76e262af2f3ece6771f7380293ce35f1ad35382d286e78eb43494b1a50b6f051",
    "classification": "ocr_correction",
    "evidence": "第107页450题A单独一行，答案ABCD，多选。",
    "kind": "multiple",
    "stem": "路由器开启 FTP 服务，用户名和密码均为 huawei，并且设置 FTP 的根目录为 flash:/dhcp/，则以下哪些命令是必须要配置的？",
    "options": [
      {
        "id": "A",
        "text": "local-user huawei ftp-directory flash:/dhcp/"
      },
      {
        "id": "B",
        "text": "ftp server enable"
      },
      {
        "id": "C",
        "text": "local-user huawei password cipher huawei"
      },
      {
        "id": "D",
        "text": "local-user huawei service-type ftp"
      }
    ],
    "answer": "ABCD",
    "rawAnswer": "ABCD"
  },
  {
    "candidateId": "p110-q471",
    "sourcePages": [
      110
    ],
    "originalStemPrefix": "下面关于生成树协议中 Forwarding 状态描述错误的是？如果是\n单选选A",
    "originalStemSha256": "d911c8a093044925abe64e5074ec985dd25c2efbbb4f949caf7283f962dcc286",
    "classification": "ocr_correction",
    "evidence": "第110页462题明确（AB）【多选题】；“如果是单选选A”为条件附注，不改变主类型。",
    "kind": "multiple",
    "answer": "AB",
    "rawAnswer": "AB"
  },
  {
    "candidateId": "p120-q514",
    "sourcePages": [
      120
    ],
    "originalStemPrefix": "如下图所示的网络，两台交换机之间通过四条缝路相连，COPPER 指电接口\nFIB",
    "originalStemSha256": "5ff19c7c42a49ef53e23f7a5948aa19f698760d181febd47cf039de00868300c",
    "classification": "source_anomaly",
    "evidence": "第120页505题原文明确（CD）【单选题】，类型与答案冲突。源异常，不凭知识删答案或改类型。",
    "kind": "single",
    "answer": "CD",
    "rawAnswer": "CD"
  },
  {
    "candidateId": "p122-q522",
    "sourcePages": [
      122
    ],
    "originalStemPrefix": "管理员在路由器上做了如图配置，同时管理员希望给 DHCP 地址指定一个 较短的\n",
    "originalStemSha256": "06e4abaa05e8fc5755ac085bb817c75858efa3224379fb6bf6762f78492f9685",
    "classification": "ocr_correction",
    "evidence": "第122页513题A单独一行，主答案A、单选。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "lease day 0 hour 10"
      },
      {
        "id": "B",
        "text": "lease 24"
      },
      {
        "id": "C",
        "text": "dhcp select relay"
      },
      {
        "id": "D",
        "text": "lease"
      }
    ],
    "answer": "A",
    "rawAnswer": "A"
  },
  {
    "candidateId": "p125-q539",
    "sourcePages": [
      125
    ],
    "originalStemPrefix": "以下哪些是通信网络？",
    "originalStemSha256": "a3836100c718ec1d5e7593bbe89754538b01e922bc5c39afcf6fd647bf56a1f8",
    "classification": "ocr_correction",
    "evidence": "第125页532题A/B分行，主答案ABCD，多选。",
    "kind": "multiple",
    "options": [
      {
        "id": "A",
        "text": "使用计算机在线看视频"
      },
      {
        "id": "B",
        "text": "使用计算机访问官方网络"
      },
      {
        "id": "C",
        "text": "从公司的邮箱里下载邮件在自己电脑里"
      },
      {
        "id": "D",
        "text": "使用即时通信软件（如：QQ、微信）与好友聊天"
      }
    ],
    "answer": "ABCD",
    "rawAnswer": "ABCD"
  },
  {
    "candidateId": "p127-q551",
    "sourcePages": [
      127
    ],
    "originalStemPrefix": "在 WLAN 发展历史中不包括以下哪种移动无线业务标准？（）\n应该是错题，a，b",
    "originalStemSha256": "701807a5f1ee10ab23d0b06104d0d6ca852250356f9b69bc7033d880c37e5fdb",
    "classification": "source_anomaly",
    "evidence": "第127页543题括号为空，红字“应该是错题，a，b，g，ac 应该都是标准。”，确无答案。",
    "kind": "single",
    "stem": "在 WLAN 发展历史中不包括以下哪种移动无线业务标准？（）\n应该是错题，a，b，g，ac 应该都是标准。"
  },
  {
    "candidateId": "p127-q552",
    "sourcePages": [
      127
    ],
    "originalStemPrefix": "SNMP 由哪些主要部分组成？",
    "originalStemSha256": "44373a550a74460bc15d2f85ea4e8813d449df6ac056afd63dd48ed881f602e1",
    "classification": "ocr_correction",
    "evidence": "第127页544题A/B分行，源ABCD、多选。",
    "kind": "multiple",
    "options": [
      {
        "id": "A",
        "text": "代理进程"
      },
      {
        "id": "B",
        "text": "被管设备"
      },
      {
        "id": "C",
        "text": "网络管理站"
      },
      {
        "id": "D",
        "text": "管理信息库"
      }
    ],
    "answer": "ABCD",
    "rawAnswer": "ABCD"
  },
  {
    "candidateId": "p134-q585",
    "sourcePages": [
      134
    ],
    "originalStemPrefix": "200.200.200.200/30 的广播地址为？",
    "originalStemSha256": "d0d79287560cedcb3d1e9a791f01eeb711295fa5300888dfa3964a8f67e7545e",
    "classification": "ocr_correction",
    "evidence": "第134页577题A单独一行，主答案A、单选。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "200.200.200.203"
      },
      {
        "id": "B",
        "text": "200.200.200.200"
      },
      {
        "id": "C",
        "text": "200.200.200.255"
      },
      {
        "id": "D",
        "text": "200,200.200.252"
      }
    ],
    "answer": "A",
    "rawAnswer": "A"
  },
  {
    "candidateId": "p135-q591",
    "sourcePages": [
      135,
      136
    ],
    "originalStemPrefix": "如下图所示交换网络，所有交换机都运行了stp 协议，当拓扑稳定后，在下列哪个交\n",
    "originalStemSha256": "853888b52059fc819460af834ac22de5f84be5e249b1f6743b4956b92447ba04",
    "classification": "source_anomaly",
    "evidence": "第135页583题主答案B、单选；第136页选项源文确印为A.SWB / C.SWA / C.SWC / D.SWD，重复C且无B，属于原文标签异常。保留实际标签，不能臆改第二项为B。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "SWB"
      },
      {
        "id": "C",
        "text": "SWA"
      },
      {
        "id": "C",
        "text": "SWC"
      },
      {
        "id": "D",
        "text": "SWD"
      }
    ],
    "answer": "B",
    "rawAnswer": "B"
  },
  {
    "candidateId": "p137-q604",
    "sourcePages": [
      137,
      138
    ],
    "originalStemPrefix": "在 AP 上为区分不同的用户提供不同的网络服务，可以通过置配以下哪些网络实现？",
    "originalStemSha256": "e975d68337c2a8e1a20bdd76fe0484a96d355ff0f5cebc047fe0f183ff64bed9",
    "classification": "ocr_correction",
    "evidence": "第137页596题A.WAP / B.VAP；第138页续C.VAC / D.VT，主答案B、单选。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "WAP"
      },
      {
        "id": "B",
        "text": "VAP"
      },
      {
        "id": "C",
        "text": "VAC"
      },
      {
        "id": "D",
        "text": "VT"
      }
    ],
    "answer": "B",
    "rawAnswer": "B"
  },
  {
    "candidateId": "p141-q619",
    "sourcePages": [
      141
    ],
    "originalStemPrefix": "当AP与AC处于不同三层网络时，推荐使用哪种方式让AP发现AC？",
    "originalStemSha256": "eae6956faf9c842fe4d1c51ad776e26eb671927e3bb432cdb3782c496f381ce6",
    "classification": "source_anomaly",
    "evidence": "第141页611题确印（AD）【单选题】，主类型和答案冲突；C清晰为广播。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "DHCP"
      },
      {
        "id": "B",
        "text": "AP 手动指定"
      },
      {
        "id": "C",
        "text": "广播"
      },
      {
        "id": "D",
        "text": "DNS"
      }
    ],
    "answer": "AD",
    "rawAnswer": "AD"
  },
  {
    "candidateId": "p143-q629",
    "sourcePages": [
      143
    ],
    "originalStemPrefix": "以下关于手工负载均衡模式的链路聚合说法正确的是？A.手工负\n载分担模式下不能设置",
    "originalStemSha256": "7e204ff6dff671d6a9ad878bb9b12e3ccc77b545987477cbea75810925f63831",
    "classification": "source_anomaly",
    "evidence": "第143页621题A粘在题干后须拆开；原文（A B）【单选题】是源类型/答案冲突。",
    "kind": "single",
    "stem": "以下关于手工负载均衡模式的链路聚合说法正确的是？",
    "options": [
      {
        "id": "A",
        "text": "手工负载分担模式下不能设置活动端口的数量"
      },
      {
        "id": "B",
        "text": "手工负载分担模式下所有活动接口都参与数据的转发，分担负载流量"
      },
      {
        "id": "C",
        "text": "手工负载分担模式下最多只能有4 个活动端口"
      },
      {
        "id": "D",
        "text": "手工负载分担模式下链路两端的设备相互发送 LACP 报文"
      }
    ],
    "answer": "AB",
    "rawAnswer": "A B"
  },
  {
    "candidateId": "p144-q633",
    "sourcePages": [
      144
    ],
    "originalStemPrefix": "现在需要实现一个 Python 自动化脚本 Tehet 到设备上查看设备远程登录",
    "originalStemSha256": "2453e9ee077d22eefde470cddd1a0382bb2bc8474da3609148cf97565b2f7cb3",
    "classification": "source_anomaly",
    "evidence": "第144页625题有A.Telnetlib 可以实现这个功能；原文（B D）【单选题】为源类型/答案冲突。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "Telnetlib 可以实现这个功能"
      },
      {
        "id": "B",
        "text": "telnet.close () 用在每一次输入命令后，作用是等待交换机回显消息。"
      },
      {
        "id": "C",
        "text": "使用 telnet.Telnet (host) 连接到 Telnet 服务器。"
      },
      {
        "id": "D",
        "text": "可以使用 telnet.write (b \"display current-configuration\\n\") 向设备输入查看当前配置命令。"
      }
    ],
    "answer": "BD",
    "rawAnswer": "B D"
  },
  {
    "candidateId": "p146-q648",
    "sourcePages": [
      146
    ],
    "originalStemPrefix": "虚拟机是实现 NFV 的基础，关于虚拟机特点正确的是A.分区，\n可以在单一物理网",
    "originalStemSha256": "1538141a2873d6c1f44cf4c3e8b63dd3959655d2cecdfe94034d4dcb0225b588",
    "classification": "ocr_correction",
    "evidence": "第146页640题【多选题】后紧接A；源ABCD，不按知识改动原文。",
    "kind": "multiple",
    "stem": "虚拟机是实现 NFV 的基础，关于虚拟机特点正确的是",
    "options": [
      {
        "id": "A",
        "text": "分区，可以在单一物理网络上同时运行多个虚拟机"
      },
      {
        "id": "B",
        "text": "隔离，同一物理服务器上虚拟机相互隔离"
      },
      {
        "id": "C",
        "text": "封装，虛拟机都是共享操作空间，通过命名空间实现封装"
      },
      {
        "id": "D",
        "text": "硬件独立，虛拟机和硬件解耦支持虛拟机在服务器之同迁移"
      }
    ],
    "answer": "ABCD",
    "rawAnswer": "ABCD"
  },
  {
    "candidateId": "p146-q649",
    "sourcePages": [
      146
    ],
    "originalStemPrefix": "主机 IPv4地址为 200.200.200.201/30，拥有下列那个IPv4",
    "originalStemSha256": "14483bb128e3fc3f05d0d27e640be5cd61ed7e32075def115ede5b1e740f4e6e",
    "classification": "ocr_correction",
    "evidence": "第146页641题B单独一行，源B、单选。",
    "kind": "single",
    "options": [
      {
        "id": "A",
        "text": "200.200.200.203"
      },
      {
        "id": "B",
        "text": "200.200.200.202"
      },
      {
        "id": "C",
        "text": "200.200,200.1"
      },
      {
        "id": "D",
        "text": "200,200.200.200"
      }
    ],
    "answer": "B",
    "rawAnswer": "B"
  },
  {
    "candidateId": "p159-q702",
    "sourcePages": [
      159
    ],
    "originalStemPrefix": "下列关于RSTP协议中Backup端口说法正确的是？（单选）\nBackup端口作",
    "originalStemSha256": "69c71041835520b8549235f8178f2646ae1ba79c870c1b8168cd1cb8a2a69c1b",
    "classification": "ocr_correction",
    "evidence": "第159页694题A标签独占一行，下一行为完整A选项；主答案A、单选。",
    "kind": "single",
    "stem": "下列关于RSTP协议中Backup端口说法正确的是？（单选）",
    "options": [
      {
        "id": "A",
        "text": "Backup端口作为指定端口的备份，提供了另一条从根桥到相应网段的备份通路"
      },
      {
        "id": "B",
        "text": "Backup端口既转发用户流量又学习MAC地址"
      },
      {
        "id": "C",
        "text": "Backup端口不发用户流量但是学习MAC地址"
      },
      {
        "id": "D",
        "text": "Backup端口提供了从指定桥到根的另一条可切换路径，作为根端口的备份端口"
      }
    ],
    "answer": "A",
    "rawAnswer": "A"
  },
  {
    "candidateId": "p166-q734",
    "sourcePages": [
      166
    ],
    "originalStemPrefix": "路由器在进行数掘报转发时，每经过一个数据链路层，数掘链路层都案要重新封装",
    "originalStemSha256": "54bc0f75439908eb8da6276b1821c9de49753e39caac33d023f8784839073fbb",
    "classification": "ocr_correction",
    "evidence": "第166页723题清晰A对/B错，参考答案A。",
    "kind": "truefalse",
    "stem": "路由器在进行数据报转发时，每经过一个数据链路层，数据链路层都需要重新封装。",
    "options": [
      {
        "id": "A",
        "text": "对"
      },
      {
        "id": "B",
        "text": "错"
      }
    ],
    "answer": "A",
    "rawAnswer": "A"
  },
  {
    "candidateId": "p175-q763",
    "sourcePages": [
      175
    ],
    "originalStemPrefix": "（多选题以下关于IPv6无状态地址自动配置和DHCPv6说法正确的有？\nAIPv",
    "originalStemSha256": "5056a91401bc93d742f0f971d8bed0184a1366ff437771e0dd3699976113192e",
    "classification": "ocr_correction",
    "evidence": "第175页752题A单独选项，源多选ABC。",
    "kind": "multiple",
    "stem": "以下关于IPv6无状态地址自动配置和DHCPv6说法正确的有？",
    "options": [
      {
        "id": "A",
        "text": "IPv6无状态地址自动配置使用RA和RS报文"
      },
      {
        "id": "B",
        "text": "DHCPv6比无状态自动配置可管理性更好"
      },
      {
        "id": "C",
        "text": "DHCPVG又可以分为DHCPv6有状态自动配置和DHCPv6无状态自动配置"
      },
      {
        "id": "D",
        "text": "IPv6无状态地址自动配置和DHCPvG均可以为主机分配DNS地址等相关配置信息"
      }
    ],
    "answer": "ABC",
    "rawAnswer": "ABC"
  },
  {
    "candidateId": "p175-q765",
    "sourcePages": [
      175
    ],
    "originalStemPrefix": "IPvG组播地址标志字段《Flag）取值为以下哪个时表示该组播地址是一个永久组播",
    "originalStemSha256": "853271f9967aaee0b810d2c69f322883670efb3de12fee713f29d45c8aadcef7",
    "classification": "ocr_correction",
    "evidence": "第175页754题源A0/B1/C2/D3，答案A。",
    "kind": "single",
    "stem": "IPv6组播地址标志字段（Flag）取值为以下哪个时表示该组播地址是一个永久组播地址？",
    "options": [
      {
        "id": "A",
        "text": "0"
      },
      {
        "id": "B",
        "text": "1"
      },
      {
        "id": "C",
        "text": "2"
      },
      {
        "id": "D",
        "text": "3"
      }
    ],
    "answer": "A",
    "rawAnswer": "A"
  },
  {
    "candidateId": "p182-q783",
    "sourcePages": [
      182
    ],
    "originalStemPrefix": "（多选题）在VRP操作系统中，如何进入OSPF区域0的视圈？",
    "originalStemSha256": "cbf79e722efdbeb4a8fbc2a8534fd76e7d0b502fb493e2b845230bcd9003247e",
    "classification": "ocr_correction",
    "evidence": "第182页771题A–D四条命令选项清晰；参考答案AD。",
    "kind": "multiple",
    "stem": "在VRP操作系统中，如何进入OSPF区域0的视图？",
    "options": [
      {
        "id": "A",
        "text": "[Huawei-ospf-1]area 0"
      },
      {
        "id": "B",
        "text": "[Huawei]ospf area 0"
      },
      {
        "id": "C",
        "text": "[Huawei-ospf-1]area 0 enable"
      },
      {
        "id": "D",
        "text": "[Huawei-ospf-1]area 0.0.0.0"
      }
    ],
    "answer": "AD",
    "rawAnswer": "AD"
  },
  {
    "candidateId": "p211-q884",
    "sourcePages": [
      211,
      212
    ],
    "originalStemPrefix": "参考以下拓扑及配置，路由器R1与R2通过Serial低速线缆连授，且数据链路层封",
    "originalStemSha256": "0a01cda6f0cf7813f25e9ce3f052d314f7c5fe5b47d4e9570572caad07400f22",
    "classification": "ocr_correction",
    "evidence": "第211页869题开始，第212页图后清晰A对/B错、参考答案B。",
    "kind": "truefalse",
    "options": [
      {
        "id": "A",
        "text": "对"
      },
      {
        "id": "B",
        "text": "错"
      }
    ],
    "answer": "B",
    "rawAnswer": "B"
  },
  {
    "candidateId": "p232-q943",
    "sourcePages": [
      232
    ],
    "originalStemPrefix": "（多选题）运行STP的交换机会发送BPDU。下面关于BPDU的说法正确的是（）",
    "originalStemSha256": "29e4e079096d035501c3bc3b5a8e93b855bc5558e5e99ed7dac88858e111fe2a",
    "classification": "ocr_correction",
    "evidence": "第232页926题每个A/B/C/D标签独占一行，命令中的BPDU被误识别为选项标签；原答案AB。",
    "kind": "multiple",
    "stem": "运行STP的交换机会发送BPDU。下面关于BPDU的说法正确的是（）",
    "options": [
      {
        "id": "A",
        "text": "BPDU帧的Control字段值为3"
      },
      {
        "id": "B",
        "text": "BPDU使用的是IEEE 802.3标准的帧"
      },
      {
        "id": "C",
        "text": "BPDU帧的目的MAC地址为广播地址"
      },
      {
        "id": "D",
        "text": "BPDU使用的是Ethernet II标准的帧"
      }
    ],
    "answer": "AB",
    "rawAnswer": "AB"
  },
  {
    "candidateId": "p235-q960",
    "sourcePages": [
      235
    ],
    "originalStemPrefix": "下列哪项IEEE 802.11标准的理论 商速率可以在5Gbps以上",
    "originalStemSha256": "1241ecd717e75508edc70cceb77c36f5bb103ef88f23ee71eed85ae6ea53c258",
    "classification": "source_anomaly",
    "evidence": "第235页943题A–D后页终，无答案标记；源文件最后一页，无后续页可补。"
  }
];

export const verifiedDiagramCrops:Array<{candidateId:string;page:number;bbox:[number,number,number,number];evidence:string}>=[
  {
    "candidateId": "p68-q290",
    "page": 68,
    "bbox": [
      0.15,
      0.4915,
      0.65,
      0.066
    ],
    "evidence": "Agent inspected actual page pixels; rectangle contains diagram/conditions only and excludes question answer annotations, choices and reference answers."
  },
  {
    "candidateId": "p162-q716",
    "page": 162,
    "bbox": [
      0.15,
      0.676,
      0.49,
      0.197
    ],
    "evidence": "Agent inspected actual page pixels; rectangle contains diagram/conditions only and excludes question answer annotations, choices and reference answers."
  },
  {
    "candidateId": "p170-q741",
    "page": 170,
    "bbox": [
      0.15,
      0.261,
      0.41,
      0.023
    ],
    "evidence": "Agent inspected actual page pixels; rectangle contains diagram/conditions only and excludes question answer annotations, choices and reference answers."
  },
  {
    "candidateId": "p179-q778",
    "page": 179,
    "bbox": [
      0.15,
      0.617,
      0.6,
      0.2
    ],
    "evidence": "Agent inspected actual page pixels; rectangle contains diagram/conditions only and excludes question answer annotations, choices and reference answers."
  },
  {
    "candidateId": "p206-q871",
    "page": 206,
    "bbox": [
      0.15,
      0.497,
      0.72,
      0.111
    ],
    "evidence": "Agent inspected actual page pixels; rectangle contains diagram/conditions only and excludes question answer annotations, choices and reference answers."
  },
  {
    "candidateId": "p210-q882",
    "page": 210,
    "bbox": [
      0.15,
      0.675,
      0.59,
      0.206
    ],
    "evidence": "Agent inspected actual page pixels; rectangle contains diagram/conditions only and excludes question answer annotations, choices and reference answers."
  },
  {
    "candidateId": "p223-q918",
    "page": 223,
    "bbox": [
      0.15,
      0.747,
      0.75,
      0.103
    ],
    "evidence": "Agent inspected actual page pixels; rectangle contains diagram/conditions only and excludes question answer annotations, choices and reference answers."
  },
  {
    "candidateId": "p228-q935",
    "page": 228,
    "bbox": [
      0.15,
      0.52,
      0.84,
      0.27
    ],
    "evidence": "Agent inspected actual page pixels; rectangle contains diagram/conditions only and excludes question answer annotations, choices and reference answers."
  }
];

export const verifiedFinalOptionCorrections:VerifiedCorrection[]=[
  {
    "candidateId": "p40-extra-69035611aea8",
    "sourcePages": [
      40
    ],
    "originalStemPrefix": "管理员用如下命令在路由器上配置了DHCP服务器：ip poo1 poo11 ne",
    "originalStemSha256": "22d0f98823c5756ce677f082875838ee569bbcbf68a8b35225503260ce4611c2",
    "classification": "ocr_correction",
    "kind": "single",
    "stem": "管理员用如下命令在路由器上配置了DHCP服务器：ip pool pool1 netword 10.10.10.0 mask 255.255.255.0 gateway-List 10.10.10.1 同时管理员希望给DHCP地址指定一个较短的租期，请问应该使用如下哪条命令？",
    "options": [
      {
        "id": "A",
        "text": "dhcp select relay"
      },
      {
        "id": "B",
        "text": "Lease 24"
      },
      {
        "id": "C",
        "text": "Lease 0"
      },
      {
        "id": "D",
        "text": "Lease day 1"
      }
    ],
    "answer": "D",
    "rawAnswer": "D",
    "evidence": "第40页157题下方独立无题号题，A/B/C/D各一行，参考答案D。源题干确写netword，保留源拼写；与上题答案C的相似题分开。"
  },
  {
    "candidateId": "p66-extra-24365da65fe5",
    "sourcePages": [
      66
    ],
    "originalStemPrefix": "如下图所示，所有主机之间都可以正常通行，则SWB MAC地址和端口的对应关系正确",
    "originalStemSha256": "1bd0f81223131711f0961e5900a8c35ceeb58ebb57db7ca1434cec46a3621bfe",
    "classification": "ocr_correction",
    "kind": "single",
    "stem": "如下图所示，所有主机之间都可以正常通行，则SWB MAC地址和端口的对应关系正确的是？",
    "options": [
      {
        "id": "A",
        "text": "MAC-A G0/0/3 MAC-B G0/0/3 MAC-C G0/0/1"
      },
      {
        "id": "B",
        "text": "MAC-A G0/0/1 MAC-B G0/0/2 MAC-C G0/0/3"
      },
      {
        "id": "C",
        "text": "MAC-A G0/0/2 MAC-B G0/0/2 MAC-C G0/0/3"
      },
      {
        "id": "D",
        "text": "MAC-A G0/0/1 MAC-B G0/0/1 MAC-C G0/0/3"
      }
    ],
    "answer": "A",
    "rawAnswer": "A",
    "evidence": "第66页无题号题的四个独占行标签A/B/C/D清楚，参考答案A。"
  },
  {
    "candidateId": "p89-q375",
    "sourcePages": [
      89
    ],
    "originalStemPrefix": "以下关于 DHCP 协议的使用场景说法正确的是？",
    "originalStemSha256": "e793b45225d79254f5e8e840602690b90fb38a94854dd485e521cca088b4d1d5",
    "classification": "ocr_correction",
    "kind": "single",
    "stem": "以下关于 DHCP 协议的使用场景说法正确的是？",
    "options": [
      {
        "id": "A",
        "text": "DHCP 中继接收到 DHCP 请求或应答报文后，不修改报文格式直接进行转发"
      },
      {
        "id": "B",
        "text": "网络中不允许出现多个 DHCP 服务器"
      },
      {
        "id": "C",
        "text": "DCHP 客户端和 DHCP 服务器必须连接到同一个交换机"
      },
      {
        "id": "D",
        "text": "如果 DHCP 客户端和 DHCP 服务器不在同一个网段，需要通过 DHCP 中继来转发 DHCP 报文"
      }
    ],
    "answer": "D",
    "rawAnswer": "D",
    "evidence": "第89页367题（D）【单选题】；B紧接A同行，D的DHCP报文换行；源C确为DCHP拼写，照录。"
  },
  {
    "candidateId": "p92-q392",
    "sourcePages": [
      92
    ],
    "originalStemPrefix": "网络管理员在路由器设备上使用了 TracertRoute 功能后，路由器发出的数",
    "originalStemSha256": "79121ef2b7955ca22dcec6794e497a87bffd672fba0ca1484877e30e7d7c8d98",
    "classification": "ocr_correction",
    "kind": "single",
    "stem": "网络管理员在路由器设备上使用了 TracertRoute 功能后，路由器发出的数据包中，IPv4 首部的 Protocol 字段取值为？",
    "options": [
      {
        "id": "A",
        "text": "6"
      },
      {
        "id": "B",
        "text": "2"
      },
      {
        "id": "C",
        "text": "1"
      },
      {
        "id": "D",
        "text": "17"
      }
    ],
    "answer": "C",
    "rawAnswer": "C",
    "evidence": "第92页384题A.6 / B.2 / C.1 / D.17逐行可见；主答案C。"
  },
  {
    "candidateId": "p152-q675",
    "sourcePages": [
      152,
      153
    ],
    "originalStemPrefix": "（多选题）如下图所示的网络，网络管理员在进行流量规划时希望主机A发往主机B的数\n",
    "originalStemSha256": "a930bd2cc0b25e9dd8cf8892574f96c57e23112f831c93a8caecd1e93c5a5af7",
    "classification": "ocr_correction",
    "kind": "multiple",
    "stem": "如下图所示的网络，网络管理员在进行流量规划时希望主机A发往主机B的数据包经过路由器之间的G0/0/3接口，主机B发往主机A的数据包经过路由器之间的G0/0/4接口，下列哪些命令可以实现这个需求？",
    "options": [
      {
        "id": "A",
        "text": "Router A:ip route-static 10.0.12.5 255.255.255.252 11.0.12.2\nRouter B:ip route-static 10.0.12.1 255.255.255.252 11.0.12.5"
      },
      {
        "id": "B",
        "text": "Router A:ip route-static 0.0.0.0 0.0.0.0 11.0.12.6\nRouter B:ip route-static 0.0.0.0 0.0.0.0 11.0.12.1"
      },
      {
        "id": "C",
        "text": "Router A:ip route-static 10.0.12.5 255.255.255.252 11.0.12.6\nRouter B:ip route-static 10.0.12.1 255.255.255.252 11.0.12.1"
      },
      {
        "id": "D",
        "text": "Router A:ip route-static 0.0.0.0 0.0.0.0 11.0.12.2\nRouter B:ip route-static 0.0.0.0 0.0.0.0 11.0.12.5"
      }
    ],
    "answer": "AD",
    "rawAnswer": "AD",
    "evidence": "第152页667题多选及图；第153页续A/B/C/D命令，每项两行，参考答案AD。为可读性在紧连数字间恢复空格，没有改变命令数值。"
  },
  {
    "candidateId": "p153-q679",
    "sourcePages": [
      153,
      154
    ],
    "originalStemPrefix": "华为设备可以使用Telnet协议进行管理，关于该管理功能，以下哪个说法师正确的\n",
    "originalStemSha256": "52a721249ecfa8eddc6a983c92963308158e8ac56505c0ce39c0cd8a0f8b64d0",
    "classification": "ocr_correction",
    "kind": "single",
    "stem": "华为设备可以使用Telnet协议进行管理，关于该管理功能，以下哪个说法是正确的？",
    "options": [
      {
        "id": "A",
        "text": "Telnet默认使用的端口号为22，不可以修改"
      },
      {
        "id": "B",
        "text": "Telnet必须开启VTY接口接口，且ID为15"
      },
      {
        "id": "C",
        "text": "Telnet不支持基于用户名和密码的认证"
      },
      {
        "id": "D",
        "text": "Telnet不支持部署ACL来增加安全性"
      }
    ],
    "answer": "B",
    "rawAnswer": "B",
    "evidence": "第153页671题末尾A；第154页顶部续B/C/D及参考答案B。B源文确写“VTY接口接口，且ID为15”，保留其用词，不按专业知识改写。"
  },
  {
    "candidateId": "p175-q764",
    "sourcePages": [
      175
    ],
    "originalStemPrefix": "IPv6组播地址标志字段《Flag〉取值为以下哪个时表示该组播地址是一个临时组播",
    "originalStemSha256": "7f36452801dfc9b0d3c00ed4c8cfc60b516204e46900ae0cbb30a51deb47a568",
    "classification": "ocr_correction",
    "kind": "single",
    "stem": "IPv6组播地址标志字段（Flag）取值为以下哪个时表示该组播地址是一个临时组播地址？",
    "options": [
      {
        "id": "A",
        "text": "0"
      },
      {
        "id": "B",
        "text": "1"
      },
      {
        "id": "C",
        "text": "2"
      },
      {
        "id": "D",
        "text": "3"
      }
    ],
    "answer": "B",
    "rawAnswer": "B",
    "evidence": "第175页753题A0/B1/C2/D3各一行，参考答案B；与754题永久组播地址题分开。该原页已在上一轮视觉核验中查看。"
  },
  {
    "candidateId": "p183-q786",
    "sourcePages": [
      183,
      184
    ],
    "originalStemPrefix": "（多选题/SWA和SWB的MAC地址表中，MAC地址、WLAN、端口对应关系正确",
    "originalStemSha256": "6f9c5dba1c5c220d9fd249915e7180a31ed54c5ab18b131530a16dd3f57aee9a",
    "classification": "ocr_correction",
    "kind": "multiple",
    "stem": "SWA和SWB的MAC地址表中，MAC地址、VLAN、端口对应关系正确的有？",
    "options": [
      {
        "id": "A",
        "text": "SWA：\nMAC Address | VLAN | Port\nMAC-A | 100 | GE0/0/3\nMAC-B | 200 | GE0/0/3\nMAC-C | 100 | GE0/0/3"
      },
      {
        "id": "B",
        "text": "SWB：\nMAC Address | VLAN | Port\nMAC-A | 10 | GE0/0/3\nMAC-B | 20 | GE0/0/3\nMAC-C | 100 | GE0/0/1"
      },
      {
        "id": "C",
        "text": "SWA：\nMAC Address | VLAN | Port\nMAC-A | 10 | GE0/0/3\nMAC-B | 20 | GE0/0/3\nMAC-C | 100 | GE0/0/3"
      },
      {
        "id": "D",
        "text": "SWB：\nMAC Address | VLAN | Port\nMAC-A | 10 | GE0/0/1\nMAC-B | 20 | GE0/0/2\nMAC-C | 100 | GE0/0/1"
      }
    ],
    "answer": "BC",
    "rawAnswer": "BC",
    "evidence": "第183页774题明确多选，第184页A/B/C/D表逐项可见，参考答案BC。仅恢复源表，不判断源网络答案正确性。"
  },
  {
    "candidateId": "p220-q908",
    "sourcePages": [
      220,
      221
    ],
    "originalStemPrefix": "某台交换机链路聚合端口输出信息如下，如果想要删除Eth-Trunk 1，下列命今",
    "originalStemSha256": "20e140f3ab8abe50d15003ec336fc5fab438eee652b376db08c6da0132151d53",
    "classification": "ocr_correction",
    "kind": "single",
    "stem": "某台交换机链路聚合端口输出信息如下，如果想要删除Eth-Trunk 1，下列命令正确的是？",
    "options": [
      {
        "id": "A",
        "text": "undo interface Eth-Trunk 1"
      },
      {
        "id": "B",
        "text": "inte GigabitEthernet 0/0/1\nundo eth-trunk\nquit\nundo interface Eth-Trunk 1"
      },
      {
        "id": "C",
        "text": "inte GigabitEthernet 0/0/1\nundo eth-trunk\nquit\ninte GigabitEthernet 0/0/2\nundo eth-trunk\nquit\nundo interface Eth-Trunk1"
      },
      {
        "id": "D",
        "text": "inte GigabitEthernet 0/0/2\nundo eth-trunk\nquit\nundo interface Eth-Trunk 1"
      }
    ],
    "answer": "C",
    "rawAnswer": "C",
    "evidence": "第220页892题开始，第221页续原图及A/B/C/D命令。C标签独占行，包含删除两个成员端口后删聚合口，原参考答案C。"
  },
  {
    "candidateId": "p232-q944",
    "sourcePages": [
      232
    ],
    "originalStemPrefix": "OSPF协议数据包在网络层的协议号是？",
    "originalStemSha256": "93b3c66a0af89a1040e9ae243b306412e6f6863b4802e252d51a4a960ab5e9cd",
    "classification": "ocr_correction",
    "kind": "single",
    "stem": "OSPF协议数据包在网络层的协议号是？",
    "options": [
      {
        "id": "A",
        "text": "1"
      },
      {
        "id": "B",
        "text": "6"
      },
      {
        "id": "C",
        "text": "0"
      },
      {
        "id": "D",
        "text": "89"
      }
    ],
    "answer": "D",
    "rawAnswer": "D",
    "evidence": "第232页927题A1/B6/C0/D89各一行，参考答案D。该原页已在上一轮视觉核验中查看。"
  }
];
