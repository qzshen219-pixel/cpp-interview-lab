(()=>{
const added=[
  {
    "id": "cloud-disk-v1-01",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：两分钟讲清架构和职责",
    "prompt": "请从一次文件上传说明客户端、Nginx、FastCGI、MySQL、Redis 与 FastDFS 分别做什么。",
    "answer": [
      "客户端发 multipart HTTP 请求，Nginx 转到常驻 C FastCGI 程序；仓库同时保留 Web 页面和 Qt 客户端，面试时先明确演示的是哪个入口。",
      "Redis 当前用于会话 Token；MySQL 存用户、文件元数据与分享状态，文件内容走 FastDFS，上传失败时还有本地存储回退。",
      "用 upload、download、filelist、delete、share、login、register 七个程序说明业务边界；不能用“组件多”替代可用性验证。"
    ],
    "pitfalls": [
      "不要把旧 README 的“Redis 预留”当成当前实现，也不要声称已有断点续传、秒传或跨机事务。"
    ],
    "follow": "怎么证明一次上传返回成功后能够按同一文件 ID 下载？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 客户端发 multipart HTTP 请求，Nginx 转到常驻 C FastCGI 程序；仓库同时保留 Web 页面和 Qt 客户端，面试时先明确演示的是哪个入口。\n- Redis 当前用于会话 Token；MySQL 存用户、文件元数据与分享状态，文件内容走 FastDFS，上传失败时还有本地存储回退。\n- 用 upload、download、filelist、delete、share、login、register 七个程序说明业务边界；不能用“组件多”替代可用性验证。\n\n### 易错点\n不要把旧 README 的“Redis 预留”当成当前实现，也不要声称已有断点续传、秒传或跨机事务。\n\n### 面试追问\n怎么证明一次上传返回成功后能够按同一文件 ID 下载？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-02",
    "module": "项目追问",
    "project": "云盘",
    "type": "概念题",
    "title": "云盘：FastCGI 常驻进程的收益与代价",
    "prompt": "为什么用 FCGI_Accept 循环，而不是每个请求启动一次程序？",
    "answer": [
      "进程常驻可复用初始化工作，Nginx 通过 FastCGI 协议传入请求参数和正文；实际并发由进程数量和每个进程的处理模型决定。",
      "当前程序在循环外初始化库与 Redis 配置，在循环内申请请求资源并清理；一个进程持续处理请求也会累积泄漏和状态污染。",
      "不能直接说性能固定提升十倍，应以同环境吞吐、尾延迟和资源占用测试。"
    ],
    "pitfalls": [
      "FCGI_Accept 循环不意味着自动多线程，也不保证数据库连接跨请求复用。"
    ],
    "follow": "处理完一次失败请求后，下一次请求能否继续正常执行？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/filelist_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 进程常驻可复用初始化工作，Nginx 通过 FastCGI 协议传入请求参数和正文；实际并发由进程数量和每个进程的处理模型决定。\n- 当前程序在循环外初始化库与 Redis 配置，在循环内申请请求资源并清理；一个进程持续处理请求也会累积泄漏和状态污染。\n- 不能直接说性能固定提升十倍，应以同环境吞吐、尾延迟和资源占用测试。\n\n### 易错点\nFCGI_Accept 循环不意味着自动多线程，也不保证数据库连接跨请求复用。\n\n### 面试追问\n处理完一次失败请求后，下一次请求能否继续正常执行？\n\n### 源码核对\n`docker/server/filelist_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-03",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：登录与 Redis Token 的真实链路",
    "prompt": "当前版本是否真的用了 Redis？请按源码说明登录和后续鉴权。",
    "answer": [
      "create_token 使用 OpenSSL 随机字节生成随机段，再创建 cloud:token: 与 cloud:user_token: 两类键，并设置 TTL。",
      "Lua 脚本读取并删除该用户旧 Token，再写入新 Token 和用户索引；verify_token 按 Token 查 Redis 得到可信用户 ID，当前不查 MySQL Token 表。",
      "Redis 不可用返回负值，调用接口对应 503；Token 缺失、失效或不合法走 401。旧文档与当前源码冲突时应说明版本。"
    ],
    "pitfalls": [
      "不能继续说 Redis 只是接口预留；也不能把随机会话 Token 说成 JWT。"
    ],
    "follow": "为什么不在客户端传 user_id 后直接按这个 ID 查文件？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/fcgi_common.h",
    "answerMarkdown": "### 参考回答\n- create_token 使用 OpenSSL 随机字节生成随机段，再创建 cloud:token: 与 cloud:user_token: 两类键，并设置 TTL。\n- Lua 脚本读取并删除该用户旧 Token，再写入新 Token 和用户索引；verify_token 按 Token 查 Redis 得到可信用户 ID，当前不查 MySQL Token 表。\n- Redis 不可用返回负值，调用接口对应 503；Token 缺失、失效或不合法走 401。旧文档与当前源码冲突时应说明版本。\n\n### 易错点\n不能继续说 Redis 只是接口预留；也不能把随机会话 Token 说成 JWT。\n\n### 面试追问\n为什么不在客户端传 user_id 后直接按这个 ID 查文件？\n\n### 源码核对\n`docker/server/fcgi_common.h`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-04",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：同账号重登如何撤销旧 Token",
    "prompt": "为什么 Token 键和用户索引需要通过同一个 Lua 脚本更新？",
    "answer": [
      "当前替换脚本把读取旧 Token、删除旧键和写入两类新键放在同次 Redis 脚本执行中，避免其他命令在步骤间交错。",
      "两类键都使用相同 TTL，校验入口以 Token 映射为准；新登录成功后旧 Token 的请求应失效。",
      "这说明单个 Redis 主节点上的命令执行原子性，不等于故障切换时绝不丢最近写入；如迁移到 Redis Cluster，还需审查多键同槽和动态访问旧键的问题。"
    ],
    "pitfalls": [
      "分别 SET 两个键再 DEL 旧键，会出现并发登录交错窗口；Lua 也不是跨 Redis、MySQL 的事务。"
    ],
    "follow": "两次并发登录返回的 Token 哪个最终有效，应怎样写测试？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/fcgi_common.h",
    "answerMarkdown": "### 参考回答\n- 当前替换脚本把读取旧 Token、删除旧键和写入两类新键放在同次 Redis 脚本执行中，避免其他命令在步骤间交错。\n- 两类键都使用相同 TTL，校验入口以 Token 映射为准；新登录成功后旧 Token 的请求应失效。\n- 这说明单个 Redis 主节点上的命令执行原子性，不等于故障切换时绝不丢最近写入；如迁移到 Redis Cluster，还需审查多键同槽和动态访问旧键的问题。\n\n### 易错点\n分别 SET 两个键再 DEL 旧键，会出现并发登录交错窗口；Lua 也不是跨 Redis、MySQL 的事务。\n\n### 面试追问\n两次并发登录返回的 Token 哪个最终有效，应怎样写测试？\n\n### 源码核对\n`docker/server/fcgi_common.h`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-05",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：Redis 故障时为什么返回 503",
    "prompt": "用户 Token 看起来格式正确，但 Redis 查询失败，是否应该放行或报密码错？",
    "answer": [
      "verify_token 区分有效用户 ID、无效 Token 的 0、依赖不可用的 -1；接口将后者映射为 503，避免把基础设施故障说成用户凭证错误。",
      "当前选择拒绝无法确认的受保护操作，不按 Token 字符串中的用户前缀信任身份，也不回退为任意 user_id。",
      "对外返回稳定错误，对内记录请求关联信息与依赖失败阶段，避免记录完整 Token；恢复后重试须考虑上传等写操作是否重复。"
    ],
    "pitfalls": [
      "随机字符串或前缀合法不能证明会话仍有效。"
    ],
    "follow": "客户端收到上传 503 时，为什么要区分鉴权失败与存储失败阶段？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- verify_token 区分有效用户 ID、无效 Token 的 0、依赖不可用的 -1；接口将后者映射为 503，避免把基础设施故障说成用户凭证错误。\n- 当前选择拒绝无法确认的受保护操作，不按 Token 字符串中的用户前缀信任身份，也不回退为任意 user_id。\n- 对外返回稳定错误，对内记录请求关联信息与依赖失败阶段，避免记录完整 Token；恢复后重试须考虑上传等写操作是否重复。\n\n### 易错点\n随机字符串或前缀合法不能证明会话仍有效。\n\n### 面试追问\n客户端收到上传 503 时，为什么要区分鉴权失败与存储失败阶段？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-06",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：Sentinel 发现主库与配置初始化",
    "prompt": "redis_connect_master 如何支持 Sentinel？为什么配置在接请求前缓存？",
    "answer": [
      "配置支持直连，或遍历 Sentinel 地址，执行 get-master-addr-by-name 获取主库后再建立连接并认证；不是从副本随便读 Token。",
      "fcgi_common.h 明确记录 FCGI_Accept 会影响 getenv 可见请求环境，因此在接收请求前把 Redis 环境配置复制到进程配置中。",
      "源码存在发现逻辑不等于已完成故障切换验证；应测试旧连接失败、Sentinel 不可达、主库变更及认证失败。"
    ],
    "pitfalls": [
      "配置了多个 Sentinel 地址不能直接证明业务“零中断”。"
    ],
    "follow": "切换瞬间一次写命令结果未知，你如何定义客户端的重试行为？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/fcgi_common.h",
    "answerMarkdown": "### 参考回答\n- 配置支持直连，或遍历 Sentinel 地址，执行 get-master-addr-by-name 获取主库后再建立连接并认证；不是从副本随便读 Token。\n- fcgi_common.h 明确记录 FCGI_Accept 会影响 getenv 可见请求环境，因此在接收请求前把 Redis 环境配置复制到进程配置中。\n- 源码存在发现逻辑不等于已完成故障切换验证；应测试旧连接失败、Sentinel 不可达、主库变更及认证失败。\n\n### 易错点\n配置了多个 Sentinel 地址不能直接证明业务“零中断”。\n\n### 面试追问\n切换瞬间一次写命令结果未知，你如何定义客户端的重试行为？\n\n### 源码核对\n`docker/server/fcgi_common.h`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-07",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：从 multipart 到元数据落库",
    "prompt": "按 upload_fcgi.c 解释一个上传请求经过哪些检查和写入步骤。",
    "answer": [
      "先取 Token 并鉴权，再解析 Content-Type 的 boundary，按 CONTENT_LENGTH 读取有上限的正文并解析 file 部分。",
      "对实际二进制数据计算 MD5；若客户端提供 MD5 则比对，之后先尝试临时文件上传 FastDFS，失败则尝试本地随机文件。",
      "存储成功后 INSERT 文件所属用户、文件名、存储 ID、大小、MD5、storage_type 和 active 状态；元数据插入失败会尝试删除已写内容。"
    ],
    "pitfalls": [
      "不能把客户端宣称的大小或摘要直接当成已验证事实。"
    ],
    "follow": "响应丢失后用户重传，当前版本会自动复用上一次文件吗？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 先取 Token 并鉴权，再解析 Content-Type 的 boundary，按 CONTENT_LENGTH 读取有上限的正文并解析 file 部分。\n- 对实际二进制数据计算 MD5；若客户端提供 MD5 则比对，之后先尝试临时文件上传 FastDFS，失败则尝试本地随机文件。\n- 存储成功后 INSERT 文件所属用户、文件名、存储 ID、大小、MD5、storage_type 和 active 状态；元数据插入失败会尝试删除已写内容。\n\n### 易错点\n不能把客户端宣称的大小或摘要直接当成已验证事实。\n\n### 面试追问\n响应丢失后用户重传，当前版本会自动复用上一次文件吗？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-08",
    "module": "项目追问",
    "project": "云盘",
    "type": "代码题",
    "title": "云盘：二进制正文为什么不能用 strlen",
    "prompt": "文件内容包含零字节时，用 strlen(data) 计算文件长度有什么后果？",
    "answer": [
      "strlen 遇到首个零字节结束，二进制文件会被截断；必须把正文长度和文件片段长度与指针一起传递。",
      "当前上传解析通过 find_bytes 与长度范围定位分隔符，以 data_len 写文件和计算摘要；不能把整个正文当普通 C 字符串。",
      "示例只说明按长度计数，解析 multipart 还要验证 boundary、头部和终止标记。"
    ],
    "pitfalls": [
      "给缓冲区末尾补零不代表二进制中间没有零字节。"
    ],
    "follow": "怎样用包含 0x00 和伪 boundary 前缀的文件做回归验证？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- strlen 遇到首个零字节结束，二进制文件会被截断；必须把正文长度和文件片段长度与指针一起传递。\n- 当前上传解析通过 find_bytes 与长度范围定位分隔符，以 data_len 写文件和计算摘要；不能把整个正文当普通 C 字符串。\n- 示例只说明按长度计数，解析 multipart 还要验证 boundary、头部和终止标记。\n\n### 易错点\n给缓冲区末尾补零不代表二进制中间没有零字节。\n\n### 面试追问\n怎样用包含 0x00 和伪 boundary 前缀的文件做回归验证？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。\n\n### 练习示例（独立片段）\n```c\nconst unsigned char data[] = {0x41, 0x00, 0x42};\nsize_t len = sizeof(data); /* 3，不能用 strlen */\nif (fwrite(data, 1, len, stdout) != len) {\n    /* 处理短写或输出失败 */\n}\n```"
  },
  {
    "id": "cloud-disk-v1-09",
    "module": "项目追问",
    "project": "云盘",
    "type": "概念题",
    "title": "云盘：有 MD5 为什么不等于秒传",
    "prompt": "当前上传计算了 MD5，能否说已经实现秒传与全局去重？",
    "answer": [
      "当前 upload 对实际文件字节计算 MD5，并可验证客户端摘要，再进行存储与 INSERT；这证明摘要核对，不证明通过摘要查找并复用已有存储对象。",
      "真正去重需要明确文件对象与用户引用的关系、并发唯一约束、引用计数或等价回收策略，以及权限和存在性泄漏边界。",
      "秒传应作为扩展设计讨论，不能把数据库中有 file_md5 字段说成已经落地。"
    ],
    "pitfalls": [
      "同名文件、相同摘要和相同用户文件记录是不同概念；MD5 不适合承担强抗碰撞安全承诺。"
    ],
    "follow": "若两名用户引用相同存储对象，删除其中一人的文件应删除内容吗？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 当前 upload 对实际文件字节计算 MD5，并可验证客户端摘要，再进行存储与 INSERT；这证明摘要核对，不证明通过摘要查找并复用已有存储对象。\n- 真正去重需要明确文件对象与用户引用的关系、并发唯一约束、引用计数或等价回收策略，以及权限和存在性泄漏边界。\n- 秒传应作为扩展设计讨论，不能把数据库中有 file_md5 字段说成已经落地。\n\n### 易错点\n同名文件、相同摘要和相同用户文件记录是不同概念；MD5 不适合承担强抗碰撞安全承诺。\n\n### 面试追问\n若两名用户引用相同存储对象，删除其中一人的文件应删除内容吗？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-10",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：上传上限与内存占用",
    "prompt": "后端限制正文为 10 MiB，能否说支持任意大文件且内存恒定？",
    "answer": [
      "read_post_data 的上传调用限制整个 HTTP 请求正文为 10×1024×1024 字节，multipart 头部也占用额度，因此不等于净文件恰好能到 10 MiB。",
      "当前正文整块分配内存，峰值与正文大小、并发进程数相关；写临时文件不改变此前已经把正文读入内存的事实。",
      "流式解析、分块上传、断点续传和配额属于后续扩展，需要上传会话、分片校验及合并策略。"
    ],
    "pitfalls": [
      "下载分块输出不能证明上传也为流式处理。"
    ],
    "follow": "Nginx 的正文限制、超时和后端上限不一致时，用户会看到什么？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- read_post_data 的上传调用限制整个 HTTP 请求正文为 10×1024×1024 字节，multipart 头部也占用额度，因此不等于净文件恰好能到 10 MiB。\n- 当前正文整块分配内存，峰值与正文大小、并发进程数相关；写临时文件不改变此前已经把正文读入内存的事实。\n- 流式解析、分块上传、断点续传和配额属于后续扩展，需要上传会话、分片校验及合并策略。\n\n### 易错点\n下载分块输出不能证明上传也为流式处理。\n\n### 面试追问\nNginx 的正文限制、超时和后端上限不一致时，用户会看到什么？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-11",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：FastDFS 失败后的本地回退边界",
    "prompt": "上传 FastDFS 失败后写本地文件，是否就保证多节点高可用？",
    "answer": [
      "当前上传在 FastDFS 未初始化或上传失败时尝试 UPLOAD_DIR，本次实际存储类型会作为 storage_type 写到 MySQL。",
      "download 和 delete 根据 storage_type 分支处理；本地文件依赖当前节点或共享挂载，换一个节点不一定可访问。",
      "需要验证负载均衡路由、挂载和容灾策略；不存在实际共享存储时不能把本地回退称为跨节点可用。"
    ],
    "pitfalls": [
      "回退降低部分失败概率，但会引入数据位置与运维边界。"
    ],
    "follow": "若同一文件请求落到另一个容器，怎样避免元数据存在而内容找不到？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 当前上传在 FastDFS 未初始化或上传失败时尝试 UPLOAD_DIR，本次实际存储类型会作为 storage_type 写到 MySQL。\n- download 和 delete 根据 storage_type 分支处理；本地文件依赖当前节点或共享挂载，换一个节点不一定可访问。\n- 需要验证负载均衡路由、挂载和容灾策略；不存在实际共享存储时不能把本地回退称为跨节点可用。\n\n### 易错点\n回退降低部分失败概率，但会引入数据位置与运维边界。\n\n### 面试追问\n若同一文件请求落到另一个容器，怎样避免元数据存在而内容找不到？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-12",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：文件写成功但 MySQL 插入失败",
    "prompt": "当前上传如何补偿？这个补偿能否覆盖进程突然崩溃？",
    "answer": [
      "源码在 INSERT 失败时按实际 storage_type 调用 FastDFS 删除或 unlink 本地文件，是同步失败路径上的尽力补偿。",
      "存储成功到 INSERT 之前崩溃，或补偿删除本身失败，仍可能出现孤儿文件；MySQL 事务不能回滚外部文件系统。",
      "持久化操作记录、可重试清理和对账属于进一步设计；说明检测、重试、幂等和告警，不声称已有任务队列。"
    ],
    "pitfalls": [
      "同一个函数中执行两次写入不代表原子提交。"
    ],
    "follow": "如何用故障注入复现“存储完成但元数据尚未写入”的窗口？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 源码在 INSERT 失败时按实际 storage_type 调用 FastDFS 删除或 unlink 本地文件，是同步失败路径上的尽力补偿。\n- 存储成功到 INSERT 之前崩溃，或补偿删除本身失败，仍可能出现孤儿文件；MySQL 事务不能回滚外部文件系统。\n- 持久化操作记录、可重试清理和对账属于进一步设计；说明检测、重试、幂等和告警，不声称已有任务队列。\n\n### 易错点\n同一个函数中执行两次写入不代表原子提交。\n\n### 面试追问\n如何用故障注入复现“存储完成但元数据尚未写入”的窗口？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-13",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：如何防止下载或删除别人的文件",
    "prompt": "攻击者修改 file_id 或客户端 user_id 时，后端如何决定所有者？",
    "answer": [
      "先通过 Redis 验证 Token 获得可信 user_id；普通下载、删除和创建分享查询均同时限制文件 ID、所属用户和 active 状态。",
      "filelist 根据鉴权结果查当前用户文件，不信任请求附带的 user_id；分享下载是另一条以分享能力凭证授权的路径。",
      "验证 A 用户无法访问 B 的文件、失效 Token 不能写入、删除状态文件不可继续分享或下载。"
    ],
    "pitfalls": [
      "已登录只证明身份，不能自动证明对任意文件有权限。"
    ],
    "follow": "返回 403 和统一 404 对暴露文件是否存在有什么差异？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/download_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 先通过 Redis 验证 Token 获得可信 user_id；普通下载、删除和创建分享查询均同时限制文件 ID、所属用户和 active 状态。\n- filelist 根据鉴权结果查当前用户文件，不信任请求附带的 user_id；分享下载是另一条以分享能力凭证授权的路径。\n- 验证 A 用户无法访问 B 的文件、失效 Token 不能写入、删除状态文件不可继续分享或下载。\n\n### 易错点\n已登录只证明身份，不能自动证明对任意文件有权限。\n\n### 面试追问\n返回 403 和统一 404 对暴露文件是否存在有什么差异？\n\n### 源码核对\n`docker/server/download_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-14",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：普通下载与分享下载有何不同",
    "prompt": "download 接口如何分别处理私有文件访问和分享访问？",
    "answer": [
      "普通下载校验登录 Token，然后按 file_id、user_id 与 active 状态查询。",
      "分享路径读取 share_token，检查长度，并查询匹配的分享 Token、share_expire>NOW() 及 active 状态；不要求访问者提供所有者登录 Token。",
      "分享 Token 具有访问能力，应控制日志、传播和有效期；失效、删除或重新生成分享后，要验证旧链接行为。"
    ],
    "pitfalls": [
      "分享不是允许客户端直接传存储路径，也不应泄露所有者登录凭证。"
    ],
    "follow": "已打开的下载在分享过期后是否立即终止，当前代码保证了哪一步？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/download_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 普通下载校验登录 Token，然后按 file_id、user_id 与 active 状态查询。\n- 分享路径读取 share_token，检查长度，并查询匹配的分享 Token、share_expire>NOW() 及 active 状态；不要求访问者提供所有者登录 Token。\n- 分享 Token 具有访问能力，应控制日志、传播和有效期；失效、删除或重新生成分享后，要验证旧链接行为。\n\n### 易错点\n分享不是允许客户端直接传存储路径，也不应泄露所有者登录凭证。\n\n### 面试追问\n已打开的下载在分享过期后是否立即终止，当前代码保证了哪一步？\n\n### 源码核对\n`docker/server/download_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-15",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：下载是否为真正的存储直传",
    "prompt": "当前 FastDFS 文件下载是否直接从存储节点流向客户端？",
    "answer": [
      "源码先创建临时文件，调用 cloud_fdfs_download 将 FastDFS 内容下载到本机，再打开临时文件输出。",
      "向 HTTP 输出时用 8192 字节缓冲区 read/fwrite；所以输出阶段内存有界，但 FastDFS 路径需要完整临时磁盘空间并增加首字节等待。",
      "这是中转方案，不能说已实现零拷贝或存储直传；临时文件的关闭、删除与磁盘不足都要测试。"
    ],
    "pitfalls": [
      "“按块输出”不等于“从 FastDFS 到客户端全程不落地”。"
    ],
    "follow": "大量并发大文件下载时，应优先观察哪几项磁盘与进程指标？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/download_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 源码先创建临时文件，调用 cloud_fdfs_download 将 FastDFS 内容下载到本机，再打开临时文件输出。\n- 向 HTTP 输出时用 8192 字节缓冲区 read/fwrite；所以输出阶段内存有界，但 FastDFS 路径需要完整临时磁盘空间并增加首字节等待。\n- 这是中转方案，不能说已实现零拷贝或存储直传；临时文件的关闭、删除与磁盘不足都要测试。\n\n### 易错点\n“按块输出”不等于“从 FastDFS 到客户端全程不落地”。\n\n### 面试追问\n大量并发大文件下载时，应优先观察哪几项磁盘与进程指标？\n\n### 源码核对\n`docker/server/download_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-16",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：下载次数增加代表用户收到文件了吗",
    "prompt": "服务端输出完整后更新 download_count，是否可以称为客户端确认成功？",
    "answer": [
      "当前代码检查 read 到 EOF、fwrite 未失败、total_sent 等于实际文件大小后才更新计数。",
      "这描述应用输出路径完成，不能证明浏览器已经收完、校验过并保存；FastCGI、代理或网络仍有后续缓冲。",
      "对外把该字段定义为服务端完成输出的次数，若需要端到端确认，应额外设计客户端回执与幂等统计。"
    ],
    "pitfalls": [
      "HTTP 状态码和服务端写成功均不等于用户已保存文件。"
    ],
    "follow": "代理接收完整而手机中途断网时，这个计数可能怎样变化？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/download_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 当前代码检查 read 到 EOF、fwrite 未失败、total_sent 等于实际文件大小后才更新计数。\n- 这描述应用输出路径完成，不能证明浏览器已经收完、校验过并保存；FastCGI、代理或网络仍有后续缓冲。\n- 对外把该字段定义为服务端完成输出的次数，若需要端到端确认，应额外设计客户端回执与幂等统计。\n\n### 易错点\nHTTP 状态码和服务端写成功均不等于用户已保存文件。\n\n### 面试追问\n代理接收完整而手机中途断网时，这个计数可能怎样变化？\n\n### 源码核对\n`docker/server/download_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-17",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：文件名与本地路径的安全边界",
    "prompt": "为什么不能把用户原始文件名直接拼接成磁盘路径或响应头？",
    "answer": [
      "当前上传用 mkstemp 随机路径存储，原始文件名作为元数据；下载本地文件经 realpath 检查落在 UPLOAD_DIR 目录下。",
      "Content-Disposition 使用固定 ASCII 回退名及 UTF-8 百分号编码的 filename*，避免直接拼接原始控制字符。",
      "realpath 检查与 open 之间仍需考虑本机恶意替换的竞争条件，不能宣称完全消除所有路径风险；更严格方案可研究目录 fd 与 openat 等方式。"
    ],
    "pitfalls": [
      "显示名不等于存储 ID；扩展名决定 Content-Type 也不等于内容已通过安全检测。"
    ],
    "follow": "文件名包含中文、引号、换行和 ../ 时，如何逐项验证？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/download_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 当前上传用 mkstemp 随机路径存储，原始文件名作为元数据；下载本地文件经 realpath 检查落在 UPLOAD_DIR 目录下。\n- Content-Disposition 使用固定 ASCII 回退名及 UTF-8 百分号编码的 filename*，避免直接拼接原始控制字符。\n- realpath 检查与 open 之间仍需考虑本机恶意替换的竞争条件，不能宣称完全消除所有路径风险；更严格方案可研究目录 fd 与 openat 等方式。\n\n### 易错点\n显示名不等于存储 ID；扩展名决定 Content-Type 也不等于内容已通过安全检测。\n\n### 面试追问\n文件名包含中文、引号、换行和 ../ 时，如何逐项验证？\n\n### 源码核对\n`docker/server/download_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-18",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：当前删除状态机实际做到了哪一步",
    "prompt": "请解释 active、deleting、deleted、delete_failed 的状态变化与剩余窗口。",
    "answer": [
      "delete 先按用户和 active 查文件，再条件更新 active→deleting，只有影响一行才继续；然后按存储类型删除内容。",
      "物理删除结果决定最终状态为 deleted 或 delete_failed；列表、下载与分享仅处理 active，因此 deleting 阶段已不可见。",
      "源码已经有状态标记，不能再描述成“只直接物理删”；但没有在该程序中看到后台扫描恢复闭环，崩溃可能留下 deleting 或未完成的最终状态。"
    ],
    "pitfalls": [
      "有删除状态机不等于跨存储事务或自动重试已经实现。"
    ],
    "follow": "物理文件已删除但最终数据库更新失败，下次恢复任务应怎样幂等处理？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/delete_fcgi.c",
    "answerMarkdown": "### 参考回答\n- delete 先按用户和 active 查文件，再条件更新 active→deleting，只有影响一行才继续；然后按存储类型删除内容。\n- 物理删除结果决定最终状态为 deleted 或 delete_failed；列表、下载与分享仅处理 active，因此 deleting 阶段已不可见。\n- 源码已经有状态标记，不能再描述成“只直接物理删”；但没有在该程序中看到后台扫描恢复闭环，崩溃可能留下 deleting 或未完成的最终状态。\n\n### 易错点\n有删除状态机不等于跨存储事务或自动重试已经实现。\n\n### 面试追问\n物理文件已删除但最终数据库更新失败，下次恢复任务应怎样幂等处理？\n\n### 源码核对\n`docker/server/delete_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-19",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：重新生成分享链接会发生什么",
    "prompt": "share_fcgi 是否允许一个文件同时拥有多条独立分享记录？",
    "answer": [
      "当前在 files 行上 UPDATE share_token 和 share_expire，重新生成会覆盖该文件之前的分享字段；旧链接后续查询不再匹配。",
      "分享期限参数严格转换并限制为 1 至 365 天，令牌使用安全随机数；链接以配置的 SHARE_BASE_URL 生成。",
      "多分享、独立撤销与访问审计需要单独分享表等扩展；当前单文件一组字段不能当成完整分享管理系统。"
    ],
    "pitfalls": [
      "分享 Token 与登录 Token 生命周期和权限不同，不能混用。"
    ],
    "follow": "如果要支持一个文件多条不同期限分享，表结构和下载查询怎样变化？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/share_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 当前在 files 行上 UPDATE share_token 和 share_expire，重新生成会覆盖该文件之前的分享字段；旧链接后续查询不再匹配。\n- 分享期限参数严格转换并限制为 1 至 365 天，令牌使用安全随机数；链接以配置的 SHARE_BASE_URL 生成。\n- 多分享、独立撤销与访问审计需要单独分享表等扩展；当前单文件一组字段不能当成完整分享管理系统。\n\n### 易错点\n分享 Token 与登录 Token 生命周期和权限不同，不能混用。\n\n### 面试追问\n如果要支持一个文件多条不同期限分享，表结构和下载查询怎样变化？\n\n### 源码核对\n`docker/server/share_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-20",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：文件列表很多时如何分页",
    "prompt": "当前 filelist 查询有什么规模边界？如何设计下一版分页？",
    "answer": [
      "当前按 user_id 与 active 过滤，按 upload_time DESC 返回全部匹配行，并用 mysql_store_result 缓存结果；该接口本身没有 LIMIT 分页。",
      "扩展可用 (upload_time,id) 作为稳定倒序游标，避免相同时间无确定次序；索引可按实际查询评估 user_id、status、upload_time、id 的组合。",
      "用 EXPLAIN 与真实数据分布验证索引和扫描量，不把设计索引描述成已建；深页与列表实时变化要明确一致性要求。"
    ],
    "pitfalls": [
      "前端搜索或只显示几项不能自动减少后端查询与结果内存。"
    ],
    "follow": "文件在翻页期间被删除或新增，如何定义“不重复”和“允许变化”的边界？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/filelist_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 当前按 user_id 与 active 过滤，按 upload_time DESC 返回全部匹配行，并用 mysql_store_result 缓存结果；该接口本身没有 LIMIT 分页。\n- 扩展可用 (upload_time,id) 作为稳定倒序游标，避免相同时间无确定次序；索引可按实际查询评估 user_id、status、upload_time、id 的组合。\n- 用 EXPLAIN 与真实数据分布验证索引和扫描量，不把设计索引描述成已建；深页与列表实时变化要明确一致性要求。\n\n### 易错点\n前端搜索或只显示几项不能自动减少后端查询与结果内存。\n\n### 面试追问\n文件在翻页期间被删除或新增，如何定义“不重复”和“允许变化”的边界？\n\n### 源码核对\n`docker/server/filelist_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-21",
    "module": "项目追问",
    "project": "云盘",
    "type": "代码题",
    "title": "云盘：严格解析整数与 atoi 的差别",
    "prompt": "为什么 expire_days 应拒绝 7abc、溢出和空字符串？请说明 strtol 校验。",
    "answer": [
      "share 的 get_strict_json_int 使用 strtol、errno、结束指针及 int 范围检查，区分缺失与非法值；随后做天数业务范围检查。",
      "atoi 无法完整报告转换失败，7abc 可被截成 7，不能仅判断结果为正就接受；其他接口仍有 atoi/json_get_int，不能声称全仓统一严格解析。",
      "练习代码只处理十进制数字字符串，JSON 结构与字段类型仍需合格解析器处理。"
    ],
    "pitfalls": [
      "严格整数转换不能修复手写 JSON 解析器对转义字符和嵌套结构的不足。"
    ],
    "follow": "缺省 7 天与显式传错应返回相同结果吗？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/share_fcgi.c",
    "answerMarkdown": "### 参考回答\n- share 的 get_strict_json_int 使用 strtol、errno、结束指针及 int 范围检查，区分缺失与非法值；随后做天数业务范围检查。\n- atoi 无法完整报告转换失败，7abc 可被截成 7，不能仅判断结果为正就接受；其他接口仍有 atoi/json_get_int，不能声称全仓统一严格解析。\n- 练习代码只处理十进制数字字符串，JSON 结构与字段类型仍需合格解析器处理。\n\n### 易错点\n严格整数转换不能修复手写 JSON 解析器对转义字符和嵌套结构的不足。\n\n### 面试追问\n缺省 7 天与显式传错应返回相同结果吗？\n\n### 源码核对\n`docker/server/share_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。\n\n### 练习示例（独立片段）\n```c\n#include <errno.h>\n#include <limits.h>\n#include <stdlib.h>\nint parse_int(const char *s, int *out) {\n    char *end;\n    if (!s || !*s || !out) return 0;\n    errno = 0;\n    long v = strtol(s, &end, 10);\n    if (errno || end == s || *end || v < INT_MIN || v > INT_MAX) return 0;\n    *out = (int)v;\n    return 1;\n}\n```"
  },
  {
    "id": "cloud-disk-v1-22",
    "module": "项目追问",
    "project": "云盘",
    "type": "代码题",
    "title": "云盘：常驻 C 服务如何处理资源归属",
    "prompt": "为什么 strdup 数据库列后才能释放 MYSQL_RES？错误路径要清理什么？",
    "answer": [
      "mysql_fetch_row 返回的数据依赖结果集生命周期；download、delete 等复制后再释放结果集，随后使用自己的副本。",
      "每个请求需清理正文、Token、文件名、结果集、MySQL 连接、文件 fd 和临时文件；释放后不继续借用原地址。",
      "建议按所有权表审查 continue、goto cleanup 和成功路径；示例描述通用清理模式，具体程序按实际初始化情况处理。"
    ],
    "pitfalls": [
      "常驻进程的小泄漏会跨请求累计；一个分支未释放也不能因进程最终退出而忽略。"
    ],
    "follow": "上传解析失败、存储失败和数据库失败三条路径怎样查泄漏？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/download_fcgi.c",
    "answerMarkdown": "### 参考回答\n- mysql_fetch_row 返回的数据依赖结果集生命周期；download、delete 等复制后再释放结果集，随后使用自己的副本。\n- 每个请求需清理正文、Token、文件名、结果集、MySQL 连接、文件 fd 和临时文件；释放后不继续借用原地址。\n- 建议按所有权表审查 continue、goto cleanup 和成功路径；示例描述通用清理模式，具体程序按实际初始化情况处理。\n\n### 易错点\n常驻进程的小泄漏会跨请求累计；一个分支未释放也不能因进程最终退出而忽略。\n\n### 面试追问\n上传解析失败、存储失败和数据库失败三条路径怎样查泄漏？\n\n### 源码核对\n`docker/server/download_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。\n\n### 练习示例（独立片段）\n```c\nchar *name = NULL;\nMYSQL_RES *res = mysql_store_result(conn);\nif (!res) goto cleanup;\nMYSQL_ROW row = mysql_fetch_row(res);\nif (row && row[0]) name = strdup(row[0]);\nmysql_free_result(res);\nres = NULL;\n/* 此后仅使用 name；实际业务还需检查分配失败 */\ncleanup:\nif (res) mysql_free_result(res);\nfree(name);\n```"
  },
  {
    "id": "cloud-disk-v1-23",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：区分源码事实、文档描述与扩展方案",
    "prompt": "README 说 Redis 预留、直接物理删除，而当前源码已有新逻辑，面试怎么回答？",
    "answer": [
      "先标明仓库路径与版本，以 docker/server 当前实现为主要证据；旧 README 有历史说明，不能逐句当成当前行为。",
      "当前可核对 Redis Token、Lua 替换、FastDFS/本地存储、删除状态标记、带期限分享；代码存在并不自动证明部署已更新或压测已通过。",
      "断点续传、秒传、异步补偿闭环与生产规模数据都需要独立证据；讨论方案时说“计划/可改进”，不说已经完成。"
    ],
    "pitfalls": [
      "不要把旧文档、建议设计和运行验证揉成同一个版本的已实现能力。"
    ],
    "follow": "你会在项目说明中留下哪些 commit、命令和测试结果方便复核？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/fcgi_common.h",
    "answerMarkdown": "### 参考回答\n- 先标明仓库路径与版本，以 docker/server 当前实现为主要证据；旧 README 有历史说明，不能逐句当成当前行为。\n- 当前可核对 Redis Token、Lua 替换、FastDFS/本地存储、删除状态标记、带期限分享；代码存在并不自动证明部署已更新或压测已通过。\n- 断点续传、秒传、异步补偿闭环与生产规模数据都需要独立证据；讨论方案时说“计划/可改进”，不说已经完成。\n\n### 易错点\n不要把旧文档、建议设计和运行验证揉成同一个版本的已实现能力。\n\n### 面试追问\n你会在项目说明中留下哪些 commit、命令和测试结果方便复核？\n\n### 源码核对\n`docker/server/fcgi_common.h`（distributed-cloud-disk/main；以当前源码为准）。"
  },
  {
    "id": "cloud-disk-v1-24",
    "module": "项目追问",
    "project": "云盘",
    "type": "场景题",
    "title": "云盘：面试时怎样给出故障验证证据",
    "prompt": "选出最能证明云盘关键边界的测试，而不是只演示上传成功一次。",
    "answer": [
      "正常链路：上传带零字节文件后下载逐字节比对；分别核对 fastdfs/local 分支、文件列表、中文名和有效分享。",
      "权限链路：A 用户不能下载/删除/分享 B 的文件；新登录撤销旧 Token；失效分享、非 active 文件均拒绝访问。",
      "故障链路：Redis 不可用返回 503；存储后 INSERT 失败触发补偿；删除进程在 deleting 后崩溃，记录残留状态和当前缺少的恢复方式。未执行用例明确列为待验证。"
    ],
    "pitfalls": [
      "编译成功、单次功能通过和故障恢复通过是三种不同证据，不虚构并发与零丢失数字。"
    ],
    "follow": "如果只给你十分钟演示，你会选择哪三个用例并留下哪些原始结果？",
    "manual": true,
    "priority": false,
    "sourceFile": "docker/server/upload_fcgi.c",
    "answerMarkdown": "### 参考回答\n- 正常链路：上传带零字节文件后下载逐字节比对；分别核对 fastdfs/local 分支、文件列表、中文名和有效分享。\n- 权限链路：A 用户不能下载/删除/分享 B 的文件；新登录撤销旧 Token；失效分享、非 active 文件均拒绝访问。\n- 故障链路：Redis 不可用返回 503；存储后 INSERT 失败触发补偿；删除进程在 deleting 后崩溃，记录残留状态和当前缺少的恢复方式。未执行用例明确列为待验证。\n\n### 易错点\n编译成功、单次功能通过和故障恢复通过是三种不同证据，不虚构并发与零丢失数字。\n\n### 面试追问\n如果只给你十分钟演示，你会选择哪三个用例并留下哪些原始结果？\n\n### 源码核对\n`docker/server/upload_fcgi.c`（distributed-cloud-disk/main；以当前源码为准）。"
  }
];
const ids=new Set(window.QUESTION_BANK.map(q=>q.id));
for(const q of added){if(!ids.has(q.id)){window.QUESTION_BANK.push(q);ids.add(q.id);}}
})();
