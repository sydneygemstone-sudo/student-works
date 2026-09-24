"""Authored AI review and project model. Not generated from player star votes."""
REV='hub-r6-lifecycle-20260925'
SOURCE_REF='a18e698073fecac2f6a70b07f5783771073f690e'
def bi(z,e): return [z,e]
SOURCES={
 'M-HISTORY':('martins-monster-quest/DEVLOG.md',bi('Martin 历史开发日志','Martin historical development log')),
 'M-SPEC':('martins-monster-quest/v2/SPEC.md',bi('Wildbound V2 范围与规则','Wildbound V2 scope and rules')),
 'M-QA':('martins-monster-quest/v2/QA.md',bi('V2 正常流程、夹具失败与边界重跑','V2 normal flow, fixture failure and boundary rerun')),
 'AW-HISTORY':('adventure-world/hub/historical-context.json',bi('已合并的 Adventure World 历史资料','Consolidated Adventure World history')),
 'SKY-QA':('adventure-world/builds/skyvale-3d/development/QA-DELIVERY.md',bi('Skyvale 三连接与浏览器验证','Skyvale three-client and browser checks')),
 'SKY-HUD':('adventure-world/builds/skyvale-3d/development/IPAD-HUD-FIX.md',bi('Skyvale HUD 修复前后记录','Skyvale before/after HUD repair')),
 'OPUS-HISTORY':('adventure-world/builds/trio-world-opus/README.md',bi('Opus 桌面初稿与触屏修订来源','Opus desktop-first and touch revision provenance')),
 'OPUS-FIRST':('adventure-world/builds/trio-world-opus/development/initial-write/RECOVERY.json',bi('首次 Write 快照，不是最终桌面发行版','Initial Write snapshot, not a final desktop release')),
 'R6-QA':('shared/hub-r6/qa/results.json',bi('R6 双语、单机、暂停与展示检查','R6 language, solo, pause and presentation checks')),
 'R6-TOUCH':('shared/hub-r6/qa/touch-results.json',bi('R6 触屏事件验证','R6 touch-event checks')),
 'CLOUD-R1':('adventure-world/builds/trio-world-opus/cloudflare/QA-REPORT.json',bi('Opus 首轮云端联机回执','Opus first cloud multiplayer evidence')),
 'CLOUD-R2':('adventure-world/builds/trio-world-opus/cloudflare/QA-LIVE-R2.json',bi('六位房间、14任务与测评真实部署验收','Live six-digit rooms, 14 tasks and reviews acceptance')),
 'CLOUD-GUIDE':('adventure-world/builds/trio-world-opus/cloudflare/ONLINE-R2.md',bi('联机规则、保存与访问边界','Multiplayer, persistence and access boundaries')),
 'SELECTION':('docs/hub-standard/R6-FINAL-PRESENTATION.md',bi('已确认 Opus 首推与语言常驻规则','Confirmed Opus preference and persistent language controls')),
}
RUBRIC=[
 {'id':'loop','name':bi('核心玩法与需求对齐','Core loop and requirements'),'max':30},
 {'id':'usability','name':bi('可玩性、输入与引导','Playability, controls and guidance'),'max':25},
 {'id':'reliability','name':bi('稳定性与测试证据','Reliability and test evidence'),'max':20},
 {'id':'presentation','name':bi('MVP 视听反馈与一致性','MVP audiovisual feedback and coherence'),'max':15},
 {'id':'recoverability','name':bi('版本可追溯与可交付性','Traceability and recoverability'),'max':10},
]
def review(id,name,scores,reasons,strength,risk,next_,refs):
 return {'id':id,'name':name,'reviewer_type':'AI','reviewer':'ChatGPT','review_kind':'authored_evidence_based_judgment','scope':'MVP','source_ref':SOURCE_REF,'points':scores,'reasons':reasons,'total':sum(scores),'stars':round(sum(scores)/20+1e-8,1),'strength':strength,'risk':risk,'next_test':next_,'evidence':refs,'final_device_acceptance':False}
REVIEWS={
 'martin':[
 review('martin-v2',bi('Wildbound V2 · 当前 R6 单机版','Wildbound V2 · current R6 solo'),[27,20,16,10,8],[
 bi('捕捉、买卖、料理、训练和进化已经连成可验证循环；完整三 Boss 战役尚未闭环。','Capture, trade, meals, training and evolution form a checked loop; the complete three-boss campaign is still unverified.'),
 bi('已有键盘、模拟触控、地图互动和状态切换检查；真实 iPad 长流程及难度手感仍需最终测试。','Keyboard, simulated touch, landmarks and state transitions have evidence; real-iPad sustained play and balance need a final test.'),
 bi('正常流程、存档及边界重跑有记录；原组合测试失败仍保留，不将修正夹具后的结果夸成全通关。','Normal flow, saves and a boundary rerun are recorded; the failed combined run remains and is not rewritten as full completion.'),
 bi('有独立 3D 世界、技能反馈与曝光修订；故事深度、正式美术、配乐音效和配音仍属第二阶段。','3D exploration, skill feedback and exposure fixes exist; deeper story and production art/music/sound/voice belong to phase 2.'),
 bi('V1/V2 与存档分开、源码和测试可回溯；当前只是可交付 MVP 候选，不是商业成品。','V1/V2 and saves are isolated with traceable source/tests; this is an MVP candidate, not a commercial product.')],
 bi('抓怪之后有明确的资源选择与成长循环。','Captures create meaningful resource choices and growth.'),
 bi('最终两阶段 Boss、完整三 Boss 通关、实际设备长时体验未验证。','The final two-phase boss, full campaign and sustained physical-device play remain unverified.'),
 bi('从全新存档走完正常战役，验证交易/料理边界、失败恢复和结局。','Complete the normal campaign from a fresh save, including economy/meal boundaries, defeat recovery and the ending.'),['M-SPEC','M-QA','R6-QA']),
 review('martin-v1',bi('Martin V1 · 历史对照的 R6 试玩','Martin V1 · R6-wrapped historical comparison'),[23,14,11,9,6],[
 bi('探索、捕捉、战斗与进化已成形；此前反馈认为深度与反馈不足，才有独立 V2。','Exploration, capture, combat and evolution exist; feedback about depth and feedback motivated the independent V2.'),
 bi('历史中多次修复战斗显示、触屏和镜头；R6 包装不自动证明原玩法问题全部解决。','Battle visibility, touch and camera required repeated fixes; the R6 wrapper does not certify every historical gameplay issue.'),
 bi('保留了历史日志及当前启动/包装检查，但历史自述不能替代同一版本完整回归。','Historical logs and current startup/wrapper checks exist; old claims do not replace full regression on the same build.'),
 bi('2D 升为 3D、随行伙伴与镜头改善是实质迭代；资产精修与声画统一尚未完成。','The 2D-to-3D shift, followers and camera improvements are substantial, but full audiovisual polish is unfinished.'),
 bi('源码保留可对照；早期细分节点多为日志阶段，而非都能独立恢复的发行版。','Source is retained; some early nodes are documented steps rather than independently recoverable releases.')],
 bi('适合作为需求迭代与大修的历史样本。','Useful as a historical example of requirements iteration and major repair.'),
 bi('旧日志的完成宣称与当时缺陷不能当作当前全量通过。','Historical completion claims and defects are not current full acceptance.'),
 bi('以相同动作回归旧问题，用它对照 V2，不再默认为主线。','Reproduce the old issues consistently to compare with V2; do not treat it as the mainline.'),['M-HISTORY','M-QA','R6-QA'])],
 'trio':[
 review('opus-online',bi('Opus · 当前六位房间联机版','Opus · current six-digit-room online edition'),[28,22,18,11,8],[
 bi('保留三区与能力玩法，并把第14项改为真实庆祝完成事件；个人任务和共享小屋能形成闭环。','Zones and powers remain, with a real task-14 celebration; personal quests and the shared cabin close the loop.'),
 bi('有触屏操作、清晰房间上限、自动测评及恢复身份；换设备恢复与新手长流程仍有边界。','Touch controls, room limits, automatic review and identity resume exist; cross-device recovery and sustained onboarding retain limits.'),
 bi('独立与线上验收覆盖三人、满员拒绝、14任务、持久化和动态测评；移动是协议模拟，不冒称实机通关。','Isolated/live checks cover three players, capacity, 14 tasks, persistence and live reviews; movement was protocol-simulated, not a physical-device playthrough.'),
 bi('世界、天气与即时反馈支持 MVP 体验；正式故事、美术、音乐音效和配音资产还未完整制作。','World, weather and feedback support the MVP; production story, art, music, sound and voice assets are still incomplete.'),
 bi('源码、部署与测评依据可追踪，原分支保留；隐私、平台上架和长期服务能力尚未完成第三阶段。','Source, deployment and review evidence are traceable and originals retained; platform, privacy and long-term operations still need phase 3.')],
 bi('当前最完整的玩法→联机→通关→反馈链路，作为首推主线。','The most complete current play→multiplayer→completion→feedback loop; featured mainline.'),
 bi('真实三台 iPad/跨家庭网络长测未完成；并非商业发布就绪。','Sustained three-iPad/cross-home play is not complete; this is not commercial release readiness.'),
 bi('三台真实设备从新房间通关、断线重入、提交与查看测评，冻结 MVP 范围。','Complete a fresh room on three physical devices, reconnect, submit/read reviews, then freeze MVP scope.'),['CLOUD-R1','CLOUD-R2','CLOUD-GUIDE','SELECTION']),
 review('opus-touch',bi('Opus · 当前 R6 单机版','Opus · current R6 solo edition'),[28,21,16,11,8],[
 bi('保留大厅、三区、三能力、采集喂养和五阶段小屋；与联机版同源但状态在本机。','Preserves lobby, zones, powers, collection, feeding and the five-stage cabin; same lineage as online, local state.'),
 bi('首稿遗漏无键盘条件，随后补触屏；R6 单机的双语、暂停和返回都已验证。','The initial build missed keyboard-free input; touch followed, with R6 language/pause/return checks.'),
 bi('单机规则与启动、存档检查有证据；不能套用云端43项回执来替代本版完整实机验收。','Local rules, startup and saves have evidence; the cloud edition’s 43 checks do not certify this edition’s complete device play.'),
 bi('能力、天气、外观和建屋反馈较完整；现有表现仍是程序化 MVP，而非完整资产成品。','Powers, weather, skins and cabin feedback are developed, but remain procedural MVP presentation rather than a full asset production.'),
 bi('无需游戏服务器，独立存档和运行包便于恢复；仍需要最终正常流程回归。','No game server, isolated saves and runtime archive aid recovery; the final normal-path test remains.')],
 bi('直接单人体验原 Opus 主线，是联机版之外的保留入口。','Direct solo access to the Opus core, retained alongside multiplayer.'),
 bi('单机与联机是两个运行分支，测试结论不能混用。','Solo and online are distinct runtime branches; their test conclusions must not be mixed.'),
 bi('真实 iPad 上正常完成任务链，并验证语言切换与刷新恢复。','Complete the normal task chain on iPad and verify language switching and reload recovery.'),['OPUS-HISTORY','R6-QA','SELECTION']),
 review('skyvale-hud1',bi('Astra · Skyvale R6 单机对照','Astra · Skyvale R6 solo comparison'),[26,20,17,10,8],[
 bi('星环、采果、篝火、动物、小屋和庆祝形成合作规则闭环，单机保留原规则。','Rings, fruit, campfire, animals, cabin and celebration form a loop preserved in solo.'),
 bi('独立发送输入、触屏取消与 HUD 可视区修复提升可用性；完整实机体验仍待测。','Independent input transmission, touch cancellation and viewport repairs improve usability; full device experience remains open.'),
 bi('三连接流程和 HUD 回归证据较明确；原房间内存存储与当前单机存储不能混为云存档。','Three-client and HUD regression evidence is explicit; original memory rooms and current solo saves are not cloud persistence.'),
 bi('统一岛屿、任务路标与反馈可理解，但正式视听资产与完整故事仍需第二阶段。','The island, markers and feedback are understandable; production audiovisual assets and story need phase 2.'),
 bi('修复前文件与修复后回执、R6 试玩均保留；不是首推商业版本。','Pre/post-fix files, reports and R6 play are retained; it is not the featured commercial version.')],
 bi('适合对照任务引导与 HUD 修复方法，不删除已有成果。','Useful comparison for quest guidance and HUD repair; preserved rather than discarded.'),
 bi('没有证据表明其代码已经融合进 Opus；保留对照不等于合并。','No evidence its code was merged into Opus; retention is not a merge.'),
 bi('以与 Opus 相同的设备/任务条件比较，不按模型名称排名。','Compare under the same device/task conditions as Opus, not by model name.'),['SKY-QA','SKY-HUD','R6-QA','SELECTION']),
 review('aw-v1',bi('Adventure World · 历史单机','Adventure World · historical solo'),[22,14,11,9,6],[
 bi('白天印章、夜间线索与能力机制已成形，但课堂实际目标可理解性与通关存在缺口。','Day stamps, night clues and powers exist, with classroom gaps in goal clarity and completion.'),
 bi('保留孩子喜欢的能力和互动；旧触控粘住、缩放和夜间引导问题不能因新分支上线而消失。','Retains liked powers/interactions; old sticky controls, zoom and night guidance are not fixed by another branch going live.'),
 bi('旧规则测试和浏览器完整流程结果不同；自动夜间路径失败仍须保留。','Old rule tests and browser flow results differ; failed automated night progression remains evidence.'),
 bi('昼夜探索和反馈是可用原型，但表现与故事张力有限。','Day/night exploration and feedback make a usable prototype, with limited presentation and story depth.'),
 bi('历史需求、预算、源代码已经合并归档；当前只保留对照，不冒充最新主线。','Historical requirements, budget and source are consolidated; retained as comparison, not the latest mainline.')],
 bi('记录三人共同创意如何落成第一版。','Shows how shared ideas became the first build.'),
 bi('旧版夜间流程与触控问题仍需单独看证据。','Historical night-flow and touch issues need their own evidence.'),
 bi('保留真实失败记录用于对照，无需为历史样本再扩展范围。','Keep genuine failed evidence for comparison without expanding the historical build.'),['AW-HISTORY','R6-QA'])]
}
def gate(id,title,deliverable,status='planned',evidence=None):return dict(id=id,title=title,deliverable=deliverable,status=status,evidence=evidence or [])
def lifecycle(sid):
 is_trio=sid=='trio'
 first=[
 gate('m1',bi('需求与不做项对齐','Align requirements and exclusions'),bi('核心目标、设备、用户和本轮范围已记录。','Record core goals, devices, users and scope.'),'complete',['AW-HISTORY' if is_trio else 'M-SPEC']),
 gate('m2',bi('核心规则与玩法闭环','Define rules and the gameplay loop'),bi('可验证的资源、任务、完成条件和失败路径。','Verifiable resources, tasks, completion conditions and failure paths.'),'complete',['CLOUD-GUIDE' if is_trio else 'M-SPEC']),
 gate('m3',bi('可操作 MVP 原型','Build an operable MVP'),bi('核心动作真实改变游戏状态，不是只有菜单。','Core actions change state rather than only displaying menus.'),'complete',['OPUS-HISTORY' if is_trio else 'M-QA']),
 gate('m4',bi('分支评审与主线收敛','Review branches and choose a mainline'),bi('明确当前主线与对照版本；选择不冒充源码合并。','Identify mainline and comparisons; selection is not source merging.'),'complete',['SELECTION'] if is_trio else ['M-SPEC','M-QA']),
 gate('m5',bi('试玩入口与操作适配','Adapt play entry and controls'),bi('双语、单机、返回与本机保存；需要时加联机测试入口。','Language, solo, return and saves; an online test entry where needed.'),'complete',['R6-QA']),
 gate('m6',bi('自动回归、缺陷与证据归档','Automated regression and evidence'),bi('已执行的测试、失败记录和修复来源可读回。','Executed checks, failures and repair provenance can be retrieved.'),'complete',['CLOUD-R2','R6-QA'] if is_trio else ['M-QA','R6-QA']),
 gate('m7',bi('最终正常流程测试 → MVP 定稿','Final normal-path test → MVP freeze'),bi('真实设备完整通关、关键边界与恢复测试；确认后固定核心范围，不再任意扩展。','Full physical-device normal flow, key boundaries and recovery; then freeze core scope.'),'pending')]
 second=[
 gate('a1',bi('完整故事线','Complete storyline'),bi('世界设定、角色动机、章节、冲突、结局与任务逻辑补足。','Complete world, motives, chapters, conflict, ending and quest logic.')),
 gate('a2',bi('完整引导与可理解性','Complete guidance and comprehension'),bi('新手教学、目标提示、失败/返回引导及双语文案成套验证。','Validate onboarding, objectives, failure/recovery guidance and bilingual copy.')),
 gate('a3',bi('资产规格与清单','Asset specification and inventory'),bi('锁定风格、格式、性能预算、文件命名、版本和授权来源。','Define style, formats, performance budgets, naming, versions and provenance.')),
 gate('a4',bi('视觉资产与动画特效','Visual assets, animation and effects'),bi('角色、场景、界面、道具、动画、技能与反馈资产完整替换/强化。','Complete characters, environments, UI, props, animation, skills and feedback assets.')),
 gate('a5',bi('音乐资产','Music assets'),bi('场景/情绪/战斗/结局音乐、循环与混音，形成可复用资产。','Produce reusable scene, mood, combat and ending music, loops and mixes.')),
 gate('a6',bi('音效资产','Sound-effect assets'),bi('动作、交互、环境、能力和 UI 提示音齐备，控制响度与触发逻辑。','Complete action, interaction, ambient, ability and UI sounds, loudness and triggers.')),
 gate('a7',bi('配音与角色声音','Voice and character audio'),bi('旁白/角色/引导台词、授权、双语发音和字幕，对话音频资产化。','Assetize narration, dialogue and guidance with consent, bilingual pronunciation and subtitles.')),
 gate('a8',bi('视听集成与整体验收','Integrated audiovisual acceptance'),bi('全量资产装配、故事体验、音量可控、加载性能与多端回归。','Integrate all assets, story experience, audio controls, loading performance and device regression.'))]
 third=[
 gate('r1',bi('发行与商业方案','Release and commercial plan'),bi('选择实际平台、目标受众、销售/免费模式和服务边界。','Choose platforms, audiences, paid/free model and service scope.')),
 gate('r2',bi('授权、隐私与平台要求','Rights, privacy and platform requirements'),bi('核对资产许可、商店规则、儿童数据、隐私告知与删除机制。','Verify asset rights, store requirements, children’s data, notices and deletion mechanisms.')),
 gate('r3',bi('发行构建与兼容验收','Release builds and compatibility'),bi('发行包、安装/升级、设备兼容、稳定性、安全与恢复检查。','Test release packages, installation/upgrades, compatibility, stability, security and recovery.')),
 gate('r4',bi('商店与宣传素材','Store and marketing material'),bi('商品页、图文/视频、价格、帮助说明与支持入口完成。','Complete listing, screenshots/video, pricing, help and support entry.')),
 gate('r5',bi('正式平台销售发布','Production platform/sales launch'),bi('完成平台发布与购买/访问/交付路径验证，而非只有测试网址。','Launch and verify purchase/access/delivery paths, not only a test URL.')),
 gate('r6',bi('长期服务运营准备','Long-term service readiness'),bi('监控、成本、备份恢复、客服、内容更新和事故处理可执行；之后按运行指标持续管理。','Make monitoring, costs, backup/recovery, support, updates and incident handling operational; then track ongoing service metrics.'))]
 return {'revision':REV,'current_phase':'mvp','overall_basis':'three_phase_equal_weight_gate_index','overall_label':bi('三阶段总进度 · 里程碑口径','Overall progress · three-phase milestone index'),'formula':bi('总进度 = (MVP完成率 + 资产完成率 + 发布运营准备完成率) ÷ 3。三个阶段等权；每阶段内部只数已完成的验收项。不表示工时、花费或日历时间占比。','Overall = (MVP gate completion + asset gate completion + release/operations readiness completion) / 3. Phases have equal weight; only completed gates count within a phase. This is not labour, spending or elapsed-time percentage.'),'not_authorized_for_execution':True,'phases':[
 {'id':'mvp','name':bi('MVP 核心玩法定稿','MVP core-gameplay freeze'),'weight':1/3,'state':'active','goal':bi('先把核心玩法真正做通、选定主线并验证稳定。','Make the core loop work, select the mainline and verify it.'),'exit':bi('最终测试通过，固定 MVP 基线。','Pass the final test and freeze the MVP baseline.'),'gates':first},
 {'id':'assets','name':bi('完整资产与视听呈现','Complete assets and audiovisual experience'),'weight':1/3,'state':'planned','depends_on':'mvp','goal':bi('补足故事与引导，强化视觉，把音乐、音效和配音制作成完整资产。','Complete story/guidance, strengthen visuals and produce full music, sound and voice assets.'),'exit':bi('完整资产包与故事体验集成验收通过。','Pass integrated full-asset and story-experience acceptance.'),'gates':second},
 {'id':'release','name':bi('平台发布、销售与长期运营','Platform release, sales and long-term operations'),'weight':1/3,'state':'planned','depends_on':'assets','goal':bi('从作品变为能发布、交付、支持与持续运营的产品。','Turn the work into a product that can launch, deliver, support and operate.'),'exit':bi('完成正式发布并建立持续服务能力；运营本身不以100%表示永远结束。','Launch and establish continuing service capability; 100% readiness does not end ongoing operations.'),'gates':third}],
 'coverage_note':bi('已有 3D、程序化声音、任务提示和公网试玩是 MVP 的原型资产与技术验证；第二、三阶段尚无成套验收，因此暂计0%，不是声称现有资产完全不存在。','Existing 3D, procedural sound, prompts and public play are MVP assets/technical proofs. Phases 2/3 have no complete accepted delivery gates yet, so count 0%; this does not mean no assets exist.'),
 'phase1_final_tests':bi('三台真实设备从新房间正常走完14任务、断线恢复、测评提交与读取；再冻结主线。' if is_trio else '从新存档正常走完三地区与最终双阶段Boss；验证交易/料理/倒下切换/恢复和真实设备触控。','Complete 14 tasks normally on three physical devices in a fresh room, reconnect, submit/read feedback, then freeze.' if is_trio else 'Complete all three regions and the final two-phase boss from a fresh save; verify trade/meals/fallen switches/recovery and physical touch.')}
# Typed edges keep source inheritance, requirements reuse, major repair and selection separate.
TYPES={'derive':bi('源码适配/继续实现','Source adaptation/continuation'),'requirements':bi('复用需求，不继承旧源码','Requirements reuse, not old source'),'repair':bi('同分支大修与回归','Major in-branch repair/regression'),'review':bi('输入评审，不是合并代码','Review input, not a code merge'),'select':bi('选择主线','Mainline selection'),'retain':bi('保留对照','Retained comparison'),'future':bi('尚未完成','Not yet completed')}
def node(id,title,state,refs,detail):return dict(id=id,title=title,state=state,evidence=refs,detail=detail)
def edge(a,b,kind,label,reason,refs):return dict(source=a,target=b,type=kind,label=label,reason=reason,evidence=refs)
def graph(id,title,nodes,edges,summary,direction='TB'):return dict(id=id,title=title,nodes=nodes,edges=edges,summary=summary,direction=direction)
GRAPHS={
'martin':[
 graph('lineage',bi('Martin：历史基线 → 独立重做 → 当前主线','Martin: historical baseline → independent rebuild → current mainline'),[
 node('old',bi('V1 · 3D 历史基线','V1 · 3D historical baseline'),'archive',['M-HISTORY'],bi('早期2D原型、3D大修和镜头修订详见大修图；不是每一步都存在独立源码快照。','Early 2D/3D/camera steps are detailed below; not every step has an independent source snapshot.')),
 node('brief',bi('9/24 新需求\n交易 / 料理 / 培养','24 Sep new brief\ntrade / meals / training'),'decision',['M-SPEC'],bi('沿用抓宠方向，明确不做建房；形成独立V2范围。','Keep the capture concept, exclude building and define independent V2 scope.')),
 node('v2',bi('Wildbound V2\n独立新实现','Wildbound V2\nindependent implementation'),'version',['M-SPEC'],bi('不把V1作为必须继承的代码基础，不覆盖旧存档。','Do not require the V1 codebase or overwrite old saves.')),
 node('v2fixed',bi('V2 修正与回归\n夹具 / 曝光 / 边界','V2 fixes and regression\nfixture / exposure / boundaries'),'repair',['M-QA'],bi('正常流程后修正测试夹具与曝光，保留首轮失败证据。','Correct fixtures/exposure after normal-path checks and preserve failed evidence.')),
 node('oldsolo',bi('V1 · R6 历史试玩','V1 · R6 historical preview'),'archive',['R6-QA'],bi('保留对照入口，不意味着旧问题全部修复。','Retained comparison entry, not certification that old issues are solved.')),
 node('v2solo',bi('V2 · R6 当前单机','V2 · R6 current solo'),'version',['R6-QA'],bi('双语、暂停、返回和独立保存包装。','Language, pause, return and isolated saves.')),
 node('choice',bi('评审收敛\nV2 主线 / V1 对照','Review convergence\nV2 mainline / V1 comparison'),'decision',['M-SPEC','M-QA'],bi('是主线选择，不是V1与V2源码合并。','Mainline selection, not a V1/V2 source merge.')),
 node('focus',bi('当前 MVP 候选\nWildbound V2','Current MVP candidate\nWildbound V2'),'main',['M-SPEC','R6-QA'],bi('下一步只做最终正常流程测试，先完成第一阶段。','Next is the final normal-path test to complete phase 1.')),
 node('freeze',bi('待最终测试\nMVP 基线定稿','Final test pending\nfreeze MVP baseline'),'pending',[],bi('未完成，不能画为已收口发布。','Pending, not shown as completed release.'))],[
 edge('old','brief','requirements',bi('吸收反馈，重新定范围','Feedback → new scope'),bi('继承需求背景，不主张源码继承。','Requirements context only, not source inheritance.'),['M-HISTORY','M-SPEC']),
 edge('brief','v2','requirements',bi('独立重做','Independent rebuild'),bi('需求驱动新实现，不覆盖旧版。','New implementation from requirements; preserve V1.'),['M-SPEC']),
 edge('v2','v2fixed','repair',bi('修正并回归','Fix and regress'),bi('区分夹具失败、画面曝光与游戏逻辑结论。','Separate fixture failures, exposure and gameplay evidence.'),['M-QA']),
 edge('old','oldsolo','derive',bi('历史单机包装','Historical solo wrapper'),bi('只保留可访问对照。','Keep an accessible comparison.'),['R6-QA']),
 edge('v2fixed','v2solo','derive',bi('R6 单机适配','R6 solo adaptation'),bi('包装语言、输入与独立存档。','Wrap language, input and independent saves.'),['R6-QA']),
 edge('oldsolo','choice','review',bi('对照输入','Comparison evidence'),bi('不是将旧版代码合入新版本。','Not merging old source into the new version.'),['M-HISTORY','R6-QA']),
 edge('v2solo','choice','review',bi('候选评审','Candidate review'),bi('依据需求与已执行测试。','Based on requirements and executed checks.'),['M-QA','R6-QA']),
 edge('choice','focus','select',bi('保留 V2 为主线','Select V2 mainline'),bi('继续既有独立V2方向。','Continue the existing independent V2 direction.'),['M-SPEC']),
 edge('focus','freeze','future',bi('最终测试后才定稿','Freeze only after final test'),bi('当前6/7，不是全产品完成86%。','Currently 6/7 of phase 1, not 86% of the entire product.'),['M-QA'])],bi('先从旧版反馈重新形成需求，再独立重做 V2；V1 只保留对照。两个版本在评审处收敛，不发生源码合并。','Feedback produces a new brief and independent V2; V1 stays for comparison. Convergence is a review decision, not source merging.')),
 graph('major-repairs',bi('Martin：必须保留的大修路径','Martin: major repair paths that must remain visible'),[
 node('spike',bi('日志：早期 2D 小样','Log: early 2D spike'),'archive',['M-HISTORY'],bi('日志记录，未承诺独立恢复包。','Documented step, not a promised independent package.')),
 node('explore',bi('补地图 / 选人 / 探索','Add map / selection / exploration'),'repair',['M-HISTORY'],bi('从只有战斗小样扩成可移动冒险。','Expand the battle spike into an explorable adventure.')),
 node('three',bi('大修：2D → 3D','Major rebuild: 2D → 3D'),'repair',['M-HISTORY'],bi('加入可见人物、随行伙伴和立体场景。','Add visible trainers, followers and 3D scenes.')),
 node('camera',bi('修战斗显示与镜头\n再扩进化 / Boss','Repair battle/camera\nthen expand evolution/bosses'),'repair',['M-HISTORY'],bi('旧日志声称的根因和实机结果不是本轮重新证明的事实。','Historical cause/device claims are not newly re-proven here.')),
 node('v1',bi('V1 历史基线','V1 historical baseline'),'archive',['M-HISTORY'],bi('作为历史对照冻结。','Retained as historical comparison.')),
 node('new',bi('新 Brief → 独立 V2','New brief → independent V2'),'version',['M-SPEC'],bi('不同于在V1上继续补丁。','Different from continuing patches on V1.')),
 node('firstqa',bi('正常路径检查\n组合测试后段失败','Normal-path checks\nlater combined test failure'),'repair',['M-QA'],bi('低血量夹具被自动保存覆盖；不是所有验证都通过。','Low-HP fixture overwritten by saving; not every check passed.')),
 node('fixqa',bi('夹具时机修正 + 曝光修正\n边界重跑通过','Fixture timing + exposure fix\nboundary rerun passed'),'repair',['M-QA'],bi('失败证据保留；没有凭夹具测试宣布完整三Boss通关。','Retain failure evidence; no full three-boss claim from fixture checks.')),
 node('current',bi('R6 V2 单机候选','R6 V2 solo candidate'),'main',['R6-QA'],bi('包装检查与核心最终测试分开。','Wrapper checks remain separate from final gameplay acceptance.'))],[
 edge('spike','explore','repair',bi('补足冒险需求','Complete adventure requirements'),bi('历史日志的第一次范围深化。','First scope expansion in historical logs.'),['M-HISTORY']),edge('explore','three','repair',bi('维度与画面大修','Dimension/presentation rebuild'),bi('2D升级为3D。','2D upgraded to 3D.'),['M-HISTORY']),edge('three','camera','repair',bi('现场反馈驱动','Classroom feedback'),bi('战斗不可见与镜头不适先修，再扩内容。','Repair visibility/camera before expanding content.'),['M-HISTORY']),edge('camera','v1','derive',bi('形成历史基线','Historical baseline'),bi('保留旧成果和问题记录。','Retain work and issues.'),['M-HISTORY']),edge('v1','new','requirements',bi('不是源码继承','Not source inheritance'),bi('新需求驱动独立重做。','Independent rebuild from requirements.'),['M-SPEC']),edge('new','firstqa','derive',bi('实现后验证','Implement, then test'),bi('正常路径与边界分开。','Separate normal and boundary paths.'),['M-QA']),edge('firstqa','fixqa','repair',bi('失败 → 修正 → 重跑','Fail → fix → rerun'),bi('不能删除失败或夸大重跑范围。','Do not erase failure or overstate rerun scope.'),['M-QA']),edge('fixqa','current','derive',bi('R6 展示/操作适配','R6 presentation/input adaptation'),bi('最终全流程仍待完成。','Final end-to-end test remains open.'),['R6-QA'])],bi('旧版大修是历史事实记录；V2 重做与后续测试修正是不同层次的变化，不能画成一次无风险直线升级。','Historical major rebuilds, independent V2 and later test corrections are different changes, not one risk-free linear upgrade.'))],
 'trio':[
 graph('lineage',bi('三人组：同一 Brief 发散 → 两分支演进 → Opus 主线收敛','Trio: shared brief → parallel evolution → Opus mainline convergence'),[
 node('old',bi('Adventure World\n旧单机基线','Adventure World\noriginal solo baseline'),'archive',['AW-HISTORY'],bi('旧玩法与预算保留；不是新版联机源码。','Retain gameplay history and budget; not new multiplayer source.')),
 node('brief',bi('同一新 Brief\n3D / 三区 / 共享世界','One new brief\n3D / zones / shared world'),'decision',['OPUS-HISTORY','SKY-QA'],bi('从头做两条实现，不把多开单机当联机。','Two fresh implementations; multiple solo tabs are not multiplayer.')),
 node('astra',bi('Astra · Skyvale\n独立联机实现','Astra · Skyvale\nindependent network build'),'version',['SKY-QA'],bi('独立服务端和三阶段建屋任务链。','Independent server and three-stage cabin loop.')),
 node('astraFixed',bi('Astra 修输入发送 / 批处理\n再修 iPad HUD','Astra input/batching fixes\nthen iPad HUD repair'),'repair',['SKY-QA','SKY-HUD'],bi('模拟回归有证据，仍不等于实机完成。','Simulated regressions are evidenced, not full device completion.')),
 node('astraSolo',bi('Astra · R6 单机\n保留对照','Astra · R6 solo\nretained comparison'),'archive',['R6-QA'],bi('同规则本机运行；没有合入Opus。','Local execution of its rules; not merged into Opus.')),
 node('opus',bi('Opus · 首次桌面 Write\n不是最终交付快照','Opus · first desktop Write\nnot a final delivery snapshot'),'version',['OPUS-FIRST'],bi('初始生成在QA与触屏修正之前。','Initial generation precedes QA and touch repair.')),
 node('opusTouch',bi('Opus 补 iPad 触屏\n当前课堂分支','Opus adds iPad touch\nclassroom branch'),'repair',['OPUS-HISTORY'],bi('补上无键盘操作条件。','Add the previously missed keyboard-free condition.')),
 node('opusSolo',bi('Opus · R6 单人试玩','Opus · R6 solo preview'),'version',['R6-QA'],bi('独立本机规则和存档分支。','Independent local rules/save branch.')),
 node('cloud1',bi('Opus · Cloud R1\nWorker + 房间','Opus · Cloud R1\nWorker + rooms'),'version',['CLOUD-R1'],bi('从LAN服务适配为云端持久化房间。','Adapt the LAN service to cloud rooms.')),
 node('cloud2',bi('Opus · Cloud R2\n6位码 / 14任务 / 测评','Opus · Cloud R2\n6 digits / 14 tasks / reviews'),'version',['CLOUD-R2'],bi('保留旧协议，新增个人任务、通关测评与动态状态。','Retain legacy protocol, add personal progress, completion review and live status.')),
 node('review',bi('评审 / 取舍节点\n比较而非代码合并','Review / selection node\ncomparison, not code merge'),'decision',['SELECTION'],bi('用户确认Opus首推；本轮AI质量评分另列，不能把选择当评分来源。','User confirmed Opus preference; AI quality ratings are separately reasoned, not derived from preference.')),
 node('main',bi('当前主线：Opus\n联机首推 + 单人入口','Current mainline: Opus\nonline first + solo entry'),'main',['SELECTION'],bi('Astra保留对照，旧单机仍在历史区。','Astra stays comparison; old solo remains in the historical area.')),
 node('gate',bi('最终正常流程测试\n通过后冻结 MVP','Final normal-path test\nthen freeze MVP'),'pending',[],bi('第一阶段6/7；未完成完整资产与商业发布。','Phase 1 is 6/7; full assets/commercial release are not finished.'))],[
 edge('old','brief','requirements',bi('吸收旧版反馈','Learn from old feedback'),bi('复用需求而非从旧Canvas代码继续拼。','Requirements reuse, not continuation of the old Canvas code.'),['AW-HISTORY','OPUS-HISTORY']),
 edge('brief','astra','requirements',bi('同 Brief 独立实现 A','Independent build A'),bi('发散为Astra分支。','Diverge into Astra.'),['SKY-QA']),edge('brief','opus','requirements',bi('同 Brief 独立实现 B','Independent build B'),bi('发散为Opus分支。','Diverge into Opus.'),['OPUS-HISTORY']),
 edge('astra','astraFixed','repair',bi('大修并回归','Repair and regress'),bi('低帧输入与HUD问题在本分支修。','Repair low-frame input/HUD in this branch.'),['SKY-QA','SKY-HUD']),edge('astraFixed','astraSolo','derive',bi('R6 单机适配','R6 solo adaptation'),bi('规则本机化；非Opus合并。','Local rules; not an Opus merge.'),['R6-QA']),
 edge('opus','opusTouch','repair',bi('补无键盘条件','Add keyboard-free input'),bi('桌面初稿到触屏修订。','Desktop initial write to touch revision.'),['OPUS-HISTORY']),edge('opusTouch','opusSolo','derive',bi('分支：浏览器单机','Fork: browser solo'),bi('本机规则与单独存档。','Local rules and separate saves.'),['R6-QA']),edge('opusTouch','cloud1','derive',bi('分支：云端联机','Fork: cloud multiplayer'),bi('保留玩法，迁移同步服务。','Preserve gameplay, adapt synchronization.'),['CLOUD-R1']),edge('cloud1','cloud2','repair',bi('协议/存储/通关大修','Protocol/storage/completion revision'),bi('不是仅更换展示网址。','More than changing a display URL.'),['CLOUD-R2']),
 edge('astraSolo','review','review',bi('对照输入','Comparison input'),bi('虚线评审箭头不表示合并代码。','Dashed review input does not mean merged source.'),['SELECTION']),edge('opusSolo','review','review',bi('单机候选证据','Solo candidate evidence'),bi('与云端测试范围分开。','Scope separate from cloud checks.'),['R6-QA']),edge('cloud2','review','review',bi('联机候选证据','Online candidate evidence'),bi('已部署不等于商业发行完成。','Deployment is not commercial release completion.'),['CLOUD-R2']),edge('review','main','select',bi('选择收敛：Opus','Converge by selecting Opus'),bi('没有证据证明Astra源码已合入。','No evidence Astra source was merged.'),['SELECTION']),edge('main','gate','future',bi('最后一项待完成','Final gate pending'),bi('真实设备正常路径和恢复测试后冻结。','Freeze after real-device normal-flow and recovery checks.'),['CLOUD-R2'])],bi('两次发散：同 Brief → Astra / Opus；Opus 触屏分支 → 单机 / 云端。收敛发生在主线选择，不是把两家代码画成已融合。','Two divergences: shared brief → Astra/Opus; Opus touch → solo/cloud. Convergence is mainline selection, not a claimed cross-model code merge.')),
 graph('major-repairs',bi('三人组：两条大修路径与各自验证','Trio: major repair paths and their own evidence'),[
 node('asky',bi('Astra：三上下文移动失败','Astra: movement failure in three contexts'),'repair',['SKY-QA'],bi('软件渲染多上下文中出现移动问题。','Movement issue under multiple software-rendered contexts.')),
 node('afix',bi('独立70ms输入发送\n场景材质批处理','Independent 70ms input\nscene/material batching'),'repair',['SKY-QA'],bi('发送不再依赖每帧渲染。','Input sending no longer depends on render frames.')),
 node('ahud',bi('Joey 报底部 HUD 裁切','Joey reports clipped bottom HUD'),'repair',['SKY-HUD'],bi('这是具体可复现的设备现象。','A concrete device observation to reproduce.')),
 node('adone',bi('可视区/安全区/取消输入\nHUD 回归与前后文件','Viewport/safe-area/cancel\nHUD regression and snapshots'),'archive',['SKY-HUD'],bi('六尺寸等回归不代表真实iPad最终通关。','Viewport regression is not final physical-iPad completion.')),
 node('odesk',bi('Opus：首稿只有键鼠','Opus: initial keyboard/mouse build'),'repair',['OPUS-HISTORY','OPUS-FIRST'],bi('不能将初始Write冒称完整桌面交付。','Do not call the first Write a final desktop release.')),
 node('otouch',bi('摇杆 / 视角手势 / 触屏按钮','Joystick / camera gesture / touch buttons'),'repair',['OPUS-HISTORY'],bi('补齐iPad无键盘条件。','Add iPad keyboard-free input.')),
 node('ocloud',bi('LAN → Worker / Durable Objects','LAN → Worker / Durable Objects'),'repair',['CLOUD-R1'],bi('保留原LAN源码与房间协议适配记录。','Preserve LAN source and protocol adaptation history.')),
 node('or2',bi('R2：6位邀请码\n个人进度 + 14任务 + 云测评','R2: six-digit invitations\npersonal progress + 14 tasks + reviews'),'repair',['CLOUD-R2'],bi('服务端验证、可重入身份、提交幂等和访问边界。','Server validation, resume identity, idempotency and access scope.')),
 node('olive',bi('隔离测试 + 真实部署回归\n保留43项回执','Isolated + live regression\nretain the 43-check record'),'main',['CLOUD-R2'],bi('移动态由协议模拟；不可标作真实三iPad长测。','Protocol-simulated movement, not sustained three-iPad testing.'))],[
 edge('asky','afix','repair',bi('失败 → 修改 → 重跑','Fail → fix → rerun'),bi('保留失败与最终检查范围。','Keep the failure and final check scope.'),['SKY-QA']),edge('afix','ahud','derive',bi('随后收到 HUD 反馈','Subsequent HUD feedback'),bi('独立于之前输入发送问题。','Separate from prior input sending.'),['SKY-HUD']),edge('ahud','adone','repair',bi('快照 → 修复 → 回归','Snapshot → repair → regress'),bi('旧文件不覆盖，结论不跨版本套用。','Preserve old files; do not transfer conclusions across versions.'),['SKY-HUD']),
 edge('odesk','otouch','repair',bi('需求遗漏返工','Rework a missed requirement'),bi('触屏能力在后续补上。','Touch arrived in the subsequent revision.'),['OPUS-HISTORY']),edge('otouch','ocloud','derive',bi('同步服务迁移','Migrate synchronization'),bi('迁到云端，不再依赖老师电脑。','Move to cloud, independent of the teacher’s machine.'),['CLOUD-R1']),edge('ocloud','or2','repair',bi('联机协议与状态大修','Protocol/state revision'),bi('保留旧房间兼容路径，新增通关反馈闭环。','Preserve legacy room compatibility and add completion feedback.'),['CLOUD-R2']),edge('or2','olive','derive',bi('测试并上线读回','Test and read back deployment'),bi('只证明该回执覆盖的条件。','Proves only the receipt’s stated scope.'),['CLOUD-R2'])],bi('Astra 与 Opus 的修复各自沿自己的分支发生。没有跨分支箭头，避免把一版修复冒认成另一版已修。','Repairs stay on their own Astra/Opus branches. No cross-branch repair arrows imply that fixing one automatically fixes the other.'))]
}
