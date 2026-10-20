(function(root){
'use strict';
const TOPICS=[
 {id:'cpp-memory',label:'智能指针与内存',module:'C++',pattern:/shared_ptr|weak_ptr|unique_ptr|RAII|内存|引用计数|\bnew\b|\bdelete\b|生命周期|分配器|allocator/i},
 {id:'cpp-stl',label:'STL 与容器',module:'C++',pattern:/vector|deque|unordered_|\bmap\b|\bset\b|\blist\b|迭代器|容器|rehash|reserve|resize|emplace|STL/i},
 {id:'cpp-object',label:'对象模型与多态',module:'C++',pattern:/构造|析构|虚函数|虚表|继承|多态|对象布局|切片|重载|重写|名字隐藏|Rule of/i},
 {id:'cpp-thread',label:'并发与线程安全',module:'C++',pattern:/线程|并发|mutex|atomic|memory_order|条件变量|死锁|数据竞争|互斥|锁|future|promise|协程|coroutine/i},
 {id:'cpp-language',label:'语言规则与移动语义',module:'C++',pattern:/const|constexpr|static|decltype|\bauto\b|move|forward|noexcept|右值|左值|移动|转发|模板|异常|Lambda|拷贝|复制|类型转换|C\+\+1|C\+\+2|指针|引用/i},
 {id:'linux-io',label:'IO 多路复用与事件循环',module:'Linux',pattern:/epoll|select|poll|Reactor|Proactor|事件循环|timerfd|eventfd|非阻塞|阻塞|IO|I\/O|描述符/i},
 {id:'linux-process',label:'进程线程与同步',module:'Linux',pattern:/进程|线程|fork|exec|信号|僵尸|孤儿|调度|锁|条件变量|同步|共享内存/i},
 {id:'linux-debug',label:'Linux 排障与资源诊断',module:'Linux',pattern:/排查|排障|CPU|内存|泄漏|负载|日志|strace|perf|gdb|lsof|\bss\b|top|资源|fd|连接数|崩溃|监控/i},
 {id:'net-tcp',label:'TCP 连接与可靠传输',module:'TCP/HTTP',pattern:/TCP|UDP|握手|挥手|TIME_WAIT|CLOSE_WAIT|重传|拥塞|流量控制|粘包|拆包|序列号|Keepalive|滑动窗口/i},
 {id:'net-http',label:'HTTP、TLS 与 WebSocket',module:'TCP/HTTP',pattern:/HTTP|HTTPS|TLS|WebSocket|DNS|CDN|证书|缓存|Cookie|跨域|状态码|POST|PUT|GET|幂等|连接/i},
 {id:'mysql-index',label:'索引与执行计划',module:'MySQL',pattern:/索引|B\+|EXPLAIN|执行计划|回表|覆盖|最左|分页|OFFSET|游标/i},
 {id:'mysql-transaction',label:'事务、MVCC 与锁',module:'MySQL',pattern:/事务|MVCC|隔离|快照|当前读|死锁|锁|FOR UPDATE|幻读|回滚/i},
 {id:'mysql-reliability',label:'日志、连接池与恢复',module:'MySQL',pattern:/日志|redo|undo|binlog|连接池|恢复|主从|复制|持久|断连|重连|超时|慢查询|监控/i},
 {id:'redis-cache',label:'缓存设计与数据结构',module:'Redis',pattern:/缓存|穿透|击穿|雪崩|布隆|淘汰|过期|TTL|数据结构|哈希|跳表|\bSET\b|\bZSET\b|\bLIST\b|bitmap/i},
 {id:'redis-ha',label:'持久化、主从与高可用',module:'Redis',pattern:/持久|RDB|AOF|主从|哨兵|Sentinel|切换|复制|故障|丢失|可靠|Cluster|集群|脑裂/i},
 {id:'redis-coordination',label:'分布式锁与消息协作',module:'Redis',pattern:/分布式锁|\bNX\b|\bPX\b|Lua|原子|Pub.?Sub|订阅|发布|队列|Stream|令牌|Token|路由/i},
 {id:'nginx-routing',label:'反向代理与负载均衡',module:'Nginx',pattern:/代理|负载|轮询|upstream|哈希|会话|路由|转发|location|静态|均衡/i},
 {id:'nginx-debug',label:'超时、502 与连接排障',module:'Nginx',pattern:/超时|502|504|timeout|断开|断连|排查|排障|日志|WebSocket|连接数|限流|缓冲/i},
 {id:'project-delivery',label:'消息可靠性与一致性',module:'项目追问',pattern:/消息|幂等|重复|顺序|一致|事务|补偿|撤回|重试|离线|outbox|Pub.?Sub|发布|订阅|在线|路由|Token|心跳/i},
 {id:'project-files',label:'云盘、上传与文件安全',module:'项目追问',pattern:/云盘|文件|上传|下载|分片|multipart|S3|对象存储|路径|权限|签名|哈希|校验/i},
 {id:'project-debug',label:'项目排障与工程交付',module:'项目追问',pattern:/排查|排障|监控|告警|关闭|退出|上线|部署|回滚|日志|CPU|资源|故障|性能|压测|限流|熔断|恢复|测试/i}
];
const fallbackIds={'C++':'cpp-fundamentals',Linux:'linux-fundamentals','TCP/HTTP':'net-fundamentals',MySQL:'mysql-fundamentals',Redis:'redis-fundamentals',Nginx:'nginx-fundamentals','项目追问':'project-fundamentals'};
for(const [module,id] of Object.entries(fallbackIds))TOPICS.push({id,label:module==='项目追问'?'项目方案与边界':module+' 综合基础',module});
const ROUTES=[
 {id:'backend',label:'C++ 后端',intro:'从语言与并发，到网络服务、数据库和项目表达。',stages:[
  {id:'memory',label:'对象与资源管理',goal:'解释生命周期、所有权、拷贝移动和资源释放边界。',topics:['cpp-memory','cpp-object','cpp-language','cpp-fundamentals']},
  {id:'stl',label:'容器选型与失效规则',goal:'说明容器复杂度、扩容、迭代器失效与使用边界。',topics:['cpp-stl']},
  {id:'concurrency',label:'并发与事件驱动',goal:'把线程同步、异步回调和 IO 事件循环连起来。',topics:['cpp-thread','linux-io','linux-process','linux-fundamentals']},
  {id:'network',label:'网络服务与连接管理',goal:'解释 TCP、HTTP、WebSocket 和代理超时。',topics:['net-tcp','net-http','net-fundamentals','nginx-routing','nginx-debug','nginx-fundamentals']},
  {id:'storage',label:'数据库与缓存',goal:'用项目例子说明索引、事务、缓存和高可用。',topics:['mysql-index','mysql-transaction','mysql-reliability','mysql-fundamentals','redis-cache','redis-ha','redis-coordination','redis-fundamentals']},
  {id:'project',label:'项目可靠性与追问',goal:'用故障场景检验幂等、一致性、恢复与交付。',topics:['project-delivery','project-files','project-debug','project-fundamentals','linux-debug']}
 ]},
 {id:'ops',label:'云网运维',intro:'围绕现有题库，练习 Linux、网络、代理、数据服务和故障处理。',stages:[
  {id:'linux',label:'Linux 巡检与资源排障',goal:'从进程、IO 和日志定位 CPU、内存、连接与退出问题。',topics:['linux-debug','linux-process','linux-io','linux-fundamentals']},
  {id:'network',label:'网络链路与协议排障',goal:'区分传输、协议、连接状态和应用层超时。',topics:['net-tcp','net-http','net-fundamentals']},
  {id:'proxy',label:'代理、负载与服务入口',goal:'结合 Nginx 处理 502、断连、转发和超时场景。',topics:['nginx-debug','nginx-routing','nginx-fundamentals']},
  {id:'data',label:'数据服务可靠性',goal:'核对事务锁、主从切换、恢复与缓存风险。',topics:['mysql-index','mysql-transaction','mysql-reliability','mysql-fundamentals','redis-cache','redis-ha','redis-coordination','redis-fundamentals']},
  {id:'incident',label:'故障恢复与项目复盘',goal:'按现象、定位、恢复、验证的顺序讲清项目问题。',topics:['project-debug','project-delivery','project-files','project-fundamentals']}
 ]}
];
const indexes=new WeakMap(),pools=new WeakMap();
function classify(q){
 const value=[q.title,q.prompt,q.promptMarkdown,q.code].filter(Boolean).join('\n').normalize('NFKC');
 const tags=TOPICS.filter(t=>t.module===q.module&&t.pattern?.test(value)).map(t=>t.id);
 return tags.length?tags:(fallbackIds[q.module]?[fallbackIds[q.module]]:[]);
}
function index(bank){if(!indexes.has(bank))indexes.set(bank,new Map(bank.map(q=>[q.id,classify(q)])));return indexes.get(bank);}
function stage(key){for(const route of ROUTES)for(const part of route.stages)if(key===route.id+':'+part.id)return {route,...part,key};return null;}
function routePools(bank){
 if(!pools.has(bank)){
  const tags=index(bank),result=new Map();for(const route of ROUTES){for(const s of route.stages)result.set(route.id+':'+s.id,[]);
   for(const q of bank){const matches=route.stages.filter(s=>s.topics.some(t=>tags.get(q.id).includes(t)));if(!matches.length)continue;
    // Assign once within each route. Favor the stage with the most matching tags,
    // using its more specific first topic to break ties.
    matches.sort((a,b)=>b.topics.filter(t=>tags.get(q.id).includes(t)).length-a.topics.filter(t=>tags.get(q.id).includes(t)).length||Number(tags.get(q.id).includes(b.topics[0]))-Number(tags.get(q.id).includes(a.topics[0])));
    result.get(route.id+':'+matches[0].id).push(q);
   }
  }pools.set(bank,result);
 }return pools.get(bank);
}
function cleanSessions(raw,bank){
 const out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 for(const [key,s] of Object.entries(raw))if(stage(key)&&s&&Array.isArray(s.ids)){
  const allowed=new Set(routePools(bank).get(key).map(q=>q.id)),ids=[...new Set(s.ids.filter(id=>allowed.has(id)))].slice(0,10);
  if(ids.length)out[key]={ids,startedAt:Number.isFinite(s.startedAt)&&s.startedAt>=0&&s.startedAt<=8640000000000000?s.startedAt:0,updatedAt:Number.isFinite(s.updatedAt)&&s.updatedAt>=0&&s.updatedAt<=8640000000000000?s.updatedAt:0};
 }return out;
}
function pick(bank,key,state,core,now=Date.now()){
 const eligible=[...(routePools(bank).get(key)||[])],chosen=[],moduleCounts={},typeCounts={};
 const rank=q=>core.isDue(state,q.id,now)?0:core.needsReview(state,q.id)?1:!core.isCompleted(state,q.id)?2:3;
 while(chosen.length<10&&eligible.length){let best=0;
  const cost=q=>rank(q)*1000+(moduleCounts[q.module]||0)*20+(typeCounts[q.type]||0)*10;
  for(let i=1;i<eligible.length;i++)if(cost(eligible[i])<cost(eligible[best]))best=i;
  const q=eligible.splice(best,1)[0];chosen.push(q.id);moduleCounts[q.module]=(moduleCounts[q.module]||0)+1;typeCounts[q.type]=(typeCounts[q.type]||0)+1;
 }return chosen;
}
function related(bank,id,limit=4){
 const byId=new Map(bank.map(q=>[q.id,q])),q=byId.get(id);if(!q)return [];const tags=index(bank),mine=new Set(tags.get(id));
 return bank.filter(other=>other.id!==id&&other.module===q.module).map((other,i)=>({q:other,i,score:tags.get(other.id).filter(t=>mine.has(t)).length})).filter(x=>x.score).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,Math.max(0,Math.min(8,limit))).map(x=>x.q);
}
const api={TOPICS,ROUTES,classify,index,stage,routePools,cleanSessions,pick,related};if(typeof module==='object'&&module.exports)module.exports=api;else root.LearningPaths=api;
})(typeof window==='object'?window:globalThis);
