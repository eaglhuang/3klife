import json,re,pathlib,hashlib,collections
BASE=pathlib.Path(__file__).parent
SHA='96a83124094d3b2485bfb749ef37d567ad834559'
TREES={r['prefix']:r['result'] for r in json.load(open(BASE/'trees.json'))}
# Domain IDs are audit buckets, not claims that these features are fully implemented.
# id|name|candidate filename tokens|spec title tokens|scenario to accept|prior evidence
DATA='''
G01|新手開局與逐步解鎖|Opening,Onboarding,FirstBattle,InitialGeneral,InitialShowcase,StarterRoster,UnlockPhase,DiscoveryProgress,LoadingTips|新手開場,因子解鎖|新帳號逐幕完成→首戰→紅顏到達→存讀後不重領；中斷、取消、跳過、跨階門檻|未執行
G02|武將名冊與同名版本|GeneralVersion,GeneralRole,GeneralCoreFields,GeneralReadModel,GeneralSchema,GeneralMainSchema,PlayerRoster,PersonRegistry,GeneralPoolCycle,ProvisionalGeneral,GeneralTitle,GeneralStage|武將系統,同名武將,武將人物介面|同模板多UID的取得、出戰、收藏與版本切換互不覆寫；死者／試用者／英靈角色限制|僅前包角色生命週期局部讀碼
G03|結緣來源與出生交易|Breeding,Female,RedFace,Daughter,Fertility,HistoricalPairs,ChildFactorExpectation|結緣系統,可結緣女性|選父母／來源→受孕→孕期→出生及配額一次提交；失敗無半扣款、重讀不重生|R5另包，未沿用為本版驗收
G04|因子血統繼承與揭露|Factor,Gene,VirtualAncestor,BloodlineMerge,BloodlineInfusion,WildGene,StatRevelation,Unveiling,BlueFactor,WhiteFactor,HiddenFactor|血統理論,因子解鎖,因子爆發|候選到持有、星等、純化、隱藏／揭露、近親視窗與RNG重播；不得偷看隱藏值|R5另包，未沿用為本版驗收
G05|育成排程與結業|Nurture,TrainingGain,CurveSystem,BloodlineCurve,LateBloom|培育系統,育成與戰鬥|手動／自動回合耗費、訓練收益、事件、休息、結業TP與評級；同一結業只入帳一次|前包育成公式及評級部分
G06|教官支援與研習|Mentor,FriendBorrow,LegendaryMentoring,TeachingSpirit|教官系統|借卡／排卡→羈絆與靈感→星突破／重複卡溢出→歸還；道具和獎勵保存|前包僅育成caller局部
G07|精力疲勞與恢復|Vitality,Fatigue,AccelerateCard,WarInjury|武將壽命,培育系統|精力門檻、訓練失敗、負傷、補充藥、出戰扣除；不同時鐘不得混扣|新樣本靜態讀碼，未測
G08|衰老死亡與壽命支出|GeneralAging,Lifespan,Longevity|武將壽命|閒置／活躍跨季、主動支出、壽命耗盡、死亡存讀重播；生理年齡與外部時鐘分開|前包原碼探針部分
G09|轉職重練與宿命祝福|JobChange,ReviveRetrain,FateBlessing,SoulInject,SoulFragment,LifeScript|轉職與宿命|滿齡及令牌檢查→副職／重練→能力、物品與狀態原子更新；失敗不可消耗|新樣本靜態讀碼，未測
G10|名士預言與占卜|Sage,Oracle|名士預言|未解鎖名士、無候選、扭曲／準確預言、求籤令扣除、因子覺醒與保存|新樣本靜態讀碼，未測
G11|傭兵試用與永久招募|Mercenary|傭兵系統|入池→試用倒數→好感／薪俸→結義扣點→永久名冊或離隊冷卻；試用戰敗保護|新樣本靜態讀碼，未測
G12|虎符兵種與卡片養成|TigerTally,Tally,StarUpMaterial,Troop|兵種（虎符）|虎符取得／持有／部署→升星／突破／保底／忠誠→扣材與套裝；品質封頂與失敗返還|前包僅死亡品質／產卡部分
G13|退役英靈與家系祭祀|Retire,Retirement,Legacy,Spirit,FamilyOverview,FamilyBranch,HereditaryKeep,GeneralArchiver,SoulTransfer|英靈世家|退役→壽終→英靈及虎符→同模板合併／主英靈貢獻；一次結算、切換守恆|前包局部探針及規格衝突
G14|重複名將轉生與分流|Rebirth,OverflowBond,SameName|同名武將,重複卡分流|同名卡→1至5轉→滿轉溢出；不同卡類的轉生／突破／灌注分流不得串帳|前包僅靜態讀碼
G15|裝備倉庫與子嗣承接|Gear,Equipment,Warehouse,GeneralBackpack,TreasureCodex,Heirloom|武將裝備,武將背包|裝備六槽解鎖、互斥持有、替換、鎖定分解、子嗣承接；一物一主與保存|新樣本靜態讀碼，未測
G16|道具背包與消耗效果|Item,Inventory,BagDomain,WeatherItem,GeneCatalyst|道具系統|取得→分類→使用或過期→消耗效果原子提交；不足、不可用、重按、重登不重複|新樣本靜態讀碼，未測
G17|資源經濟商城與上限|ResourceCap,MaterialSystem,CellarProtection,GachaCurrency,GachaWallet,ItemShopPricing,WishPool,WishAltar|經濟系統,資源循環|資源收入／支出／封頂／保護庫存與商城兌換；不足不扣、超限不反扣|未完整讀／未測
G18|轉蛋卡池保底與天命兌換|Gacha,DestinyPool,DestinyGacha,DestinyShop,LimitedPool,SupportPool|轉蛋系統|池別、機率、UP、49→50小保底、199→200兌換、重複卡分流；網路重試不可雙扣|新樣本靜態讀碼，未測
G19|每日留存與月卡權益|DailyFree,DailySubsidy,LoginStreak,SevenDay,MonthlyCard,MilestoneRewards|留存系統,經濟系統|UTC+8跨日、連續／斷登、免費招募、補貼、月卡到期續期；單日只領一次|新樣本靜態讀碼，未測
G20|官職晉升與職能權限|Officer,ChildOfficial,ChildMagistrate,CareerTag,RosterRoleLoad|官職系統|軍政任務經驗→多階晉升→一次獎勵與能力解鎖；Era保留、無權限拒絕|新樣本靜態讀碼，未測
G21|領地內政與軍備|Domestic,GovernanceAssignment,TerritoryUpgrade,MilitaryReserve,GovernorHall|領地治理|每季五類內政、指派能力、領地升級、徵兵、資源上限；一次結算與武將占用|新樣本靜態讀碼，未測
G22|幕府派遣與任務牆|HallMission,HallTask,HallVolunteer,HallAutoAssign,Dispatch,HallBoard,HallExecute,HallDetailAction|大廳系統|接取→確認→派人→倒數／成功或失敗→獎勵／官職／日誌；不可雙派或重領|新樣本靜態讀碼，未測
G23|他國治理外交與盛衰|Rival|治理模式他國AI|國家產出→軍備薪俸→結盟／貿易／宣戰→擴張／敗亡／再起；季順序與守恆|新樣本靜態讀碼，未測
G24|天下沙盤遠征與趕路|Sandtable,TravelCountdown,HallMap|領地治理,大廳系統|地圖選點→可達／門檻→遠征接取→趕路到達→事件與戰役；離線不誤當回合|新樣本靜態讀碼，未測
G25|戰役關卡與連環闖關|CampaignStages,StageChain,StageLoadout,StageSalvage,MonthlyScenario,Encounter|關卡設計|前置關卡→帶隊連戰→HP／SP／戰損持續→首通／重打／拾荒獎勵|新樣本靜態讀碼，未測
G26|出陣編隊與部署|Sortie,Loadout,PlayerDeck,LeadGeneralSelect,DeckSelect,BattleRoster,BattlePower,Deploy|戰場部署|主副將／軍師／虎符預設→限制與預測→部署耗費→重開／撤銷；死者試用排除|新樣本靜態讀碼，未測
G27|戰鬥回合普攻與勝負|BattleSystem,BattleController,BattleState,BattleTurn,BattleCombat,BattleAuto,BattleFlow,BattleRuntime,BattlePhase,BattleVictory,ActionSystem,CombatCrit,FormulaSystem,TurnBasedTempo,BattleTempo|戰場部署,數值系統|回合相位→移動普攻／暴擊→同時死亡／城門／回合上限→勝負只結算一次|前包公式局部，整場未測
G28|環境適性天氣與機關|BattleAptitude,Terrain,Weather,Tile,Desert,SceneTile,FormationZone,Hazard|戰場適性,戰場格子|地形／兵種／天氣乘算→排程變天／陷阱持續→進出格與死亡清理；水D例外|前包適性原碼探針部分
G29|戰法技能狀態與場景計|Tactic,BattleSkill,Skill,SceneGambit,Buff,Effect,UnitDot,TeamAura,TeamRecover,Morale,EnemyMass,SelfBurst,SingleExecute,Stealth,PushMove,GhostMove,WisdomMeter,StrategistHud|戰法系統,戰法場景|技能來源→條件／目標→花費／傷害／控制／持續效果→回收；被動觸發與反制順序|前包TP局部，完整技能未測
G30|奧義覺醒連攜與決戰|Ultimate,Awakening,Combo,AncestralSpirit,LastSpurt,BloodlineTransmission,BloodlineBeast,BloodlineUltimate|奧義系統,因子爆發|槽位／等級／覺醒→EP／SP門檻→單體／連攜→決戰加速；一次扣費、浮點與取整|前包原碼探針部分
G31|戰場敵軍AI與難度|Ai,EnemyAI,EnemyTactic,BossGuard|AI武將強度|敵方配置／強度匹配→部署／移動／技能／單挑決策→適應難度；合法行動與固定seed|新樣本靜態讀碼，未測
G32|單挑突圍與特殊行動|Duel,BattleSpecial,BattleSoloBreach,BattleGeneralDuel,BattlefieldRecon|戰場部署,戰法系統|單挑接受／拒絕→最多交手→平局／死亡／懲罰；突圍交換位置與主將狀態一致|新樣本靜態讀碼，未測
G33|撤退負傷戰損與掉落|BattleRetreat,RetreatRisk,WarInjury,StageSalvage,ExtremeTaskDrop,StageSalvageSettlement|關卡設計,武將戰績|勝敗／撤退→戰損負傷／壽命／掉落→回大廳；中斷及重送結果不重扣重發|未完整讀／未測
G34|俘虜處置監獄與救援|Prisoner,DungeonRescue|俘虜處理|捕獲→勸降／招募／關押／釋放→監獄產出／寶物／回投；試用豁免、滿牢、不重擲|新樣本靜態讀碼，未測
G35|名將挑戰賽與競技場|Tournament,Arena,LegacyArena,MonthlyScenarioCup|名將挑戰賽|14日準備／競賽→配對／積分／段位／獎勵→軟重置；跨服時鐘／快照公平性；月劇本選擇、月份切換、杯賽計分與獎勵保存|新樣本靜態讀碼，未測
G36|戰績排行與家族成就|BattleRecord,BattleSeasonStats,BattleLeaderboard,LegacyAchievement,YearReport,ReportCardBook,BattleReview|武將戰績|實戰績效→個人季統計／排行／里程碑→獎勵；重播去重、死亡退休保留|新樣本靜態讀碼，未測
G37|親緣史實關係與好感事件|Kin,Relation,HistoricalPairs,GiftAffection,LoyaltyGauge,OverflowBond|家族關係|史實／動態親緣→好感／忠誠→事件或連攜；對稱去重、同場一次、跨季演變|前包親緣連攜部分
G38|人物NPC日誌與離線互動|Npc,Personality,Journal,Offline,MorningReport,DailyNews,FunLine,FarewellLetter|NPC人性化,武將日誌,武將個性卡,三國大腦|事件→記憶／人物狀態→對話及日誌→離線晨報；窗去重、無資料不捏造、外部服務失效|新樣本靜態讀碼，未測
G39|運氣與跨玩法隨機修正|Luck,FateBlessing|運氣系統|LUK上限／門檻→繁殖／戰法複製／掉落／事件；不同消費者量尺、取整與seed一致|新樣本靜態讀碼，未測
G40|季節年份與長局輪轉|GameClock,Season,EraReset,Countdown,YearReport|遊戲時間,領地治理|行動回合→季→年→Era→保留／重置／報告；快轉或重登不得跳結算與重結算|前包原碼探針部分
G41|首次統一結局與家族榮譽|__R5_FIRST_UNIFICATION__|05_首次統一結局與家族榮譽|統一條件快照→結局一次提交→家族榮譽／長局轉換；契約與caller尚待重核|候選規格；不可稱已實作
G42|主題賽季跨家族與祖地延續|__R5_THEME_ANCESTRAL__|06_主題賽季,07_祖地存續|新主題賽季→跨家族延續／祖地守護→敵方再起；身份、時鐘、重置及政策待定|候選規格；不可稱已實作
'''
DOM=[]
for line in DATA.strip().splitlines():
 id,name,tokens,specs,case,prior=line.split('|');DOM.append(dict(id=id,name=name,tokens=tokens.split(','),spec_tokens=specs.split(','),minimum_acceptance=case,prior_evidence=prior,full_acceptance='NOT_RUN'))
# Supplemental gates are shared dependencies, not additional gameplay completion percentages.
GATES=[
 dict(id='X01',name='保存／同步／遷移／恢復',tokens=['Save','Sync','DeltaPatch','Serialization','Codec','Storage','DataLifecycle','DataGrowth','BranchCompactor','PendingDelete','ActionLog','BattleLog','SeasonalRollup'],minimum_acceptance='快照→格式驗證→本機保存→同步→重新載入；重送、故障、舊版遷移不可丟狀態／增資源'),
 dict(id='X02',name='資料Catalog／數值版本／RNG契約',tokens=['DataSchema','DataCatalog','DataMount','DataPage','NumericalConfig','Constants','SeededRandom','ReadModelValidators','GeneralSearch','RarityResolver','CommercialRarity','BattleBindData','CommonEnums','HeroBase','GeneralGrowth','GeneralLifecycle'],minimum_acceptance='ID參照、enum、量尺、數值版本、seed與算法版本可追；catalog完整且真consumer讀到'),
 dict(id='X03',name='UI互動投影／資產與讀取狀態',tokens=['View','Panel','Presenter','Layout','Text','UI','Art','Audio','Vfx','Visual','Renderer','Particle','Sprite','Backdrop','Portrait','Cinematic','Scene','MemoryManager','ResourceManager','MaterialUtils','MaterialSystem','FloatText','MirrorFate','StoryStrip','CrestStyle','HallStage','HallTheme','HallCharacter','HallCrowd','HallSync','BloodlineTree','BloodlineRight','BloodlineStory','BloodlineNode','BloodlineConnections','AncestorTree','Vortex','Loading','Asset','CountdownIcon','RedFaceCopy'],minimum_acceptance='真資料→顯示→點擊→狀態回饋；取消／Back／連點／舊非同步結果不得覆寫新選擇'),
 dict(id='X04',name='入口接線與外部服務邊界',tokens=['GameSession','ServiceLoader','GameManager','NetworkService','RuntimeContract','RuntimeContext','Protocol','SkillRuntimeContract','skill-runtime','protocols'],minimum_acceptance='UI/服務→原碼規則→狀態提交→保存的真consumer可達；server及NPC跨repo斷線處理')]
ALL=DOM+GATES
code=[]
for root in ['assets/scripts','server','shared']:
 for e in TREES[root]['tree']:
  if e['type']=='blob' and e['path'].endswith('.ts'):
   code.append(dict(path=root+'/'+e['path'],blob_sha=e['sha'],bytes=e.get('size')))
prior=json.load(open(BASE/'PRIOR_SOURCE_METADATA.json'))
priorpaths={r['path'] for r in prior['records']}
newrecords=json.load(open(BASE/'SOURCE_MANIFEST.json'))['files']
newpaths={r['path'] for r in newrecords}
for e in code:
 stem=pathlib.Path(e['path']).stem
 e['candidate_domains']=[d['id'] for d in ALL if any((t in stem and not (t == 'Gene' and 'General' in stem)) for t in d['tokens'])]
 e['routing_basis']='filename token only; not semantic verification'
 e['read_status']='PRIOR_PARTIAL_EVIDENCE' if e['path'] in priorpaths else 'SAMPLED_STATIC_NOT_FULL_AUDIT' if e['path'] in newpaths else 'UNREAD'
 e['execution_status']='NOT_RUN_IN_THIS_INVENTORY'
 e['source_url']=f'https://github.com/eaglhuang/3klife/blob/{SHA}/'+e['path']
 if '/tools/' in e['path']:e['scope']='developer_tool'
 # Explicit known shared files; routing only, not implementation acceptance.
 explicit={'BattleTypes':['X04'],'BattleUnitSpawner':['G26'],'BattlePresentationTiming':['X03'],'BattleTutorialHint':['G01'],'TurnFlowManager':['G27'],'SupportCardBase':['G03','G06'],'BloodlineGraph':['G04'],'AptitudeDialogue':['G28','X03'],'BattleModifiers':['G27','G28'],'BattleSnapshot':['G36','X01'],'BloodlineGuarantee':['G04','G05'],'EventSystem':['X04'],'I18nSystem':['X03'],'LobbyHubSchema':['X03'],'LobbyThemeResolver':['X03'],'PoolSystem':['X03'],'UCUFLogger':['X03'],'BattleEntryParams':['X04'],'VideoPlayerTest':['X03'],'vfx-block-registry':['X03'],'vfx-usage-table':['X03'],'AIPopulationConfig':['G02','G23'],'EquipPageSegments':['G15','X03'],'SpineGeneralOverlay':['X03'],'GeneralUnit':['G02','G27']}
 if stem in explicit:e['candidate_domains']=sorted(set(e['candidate_domains']+explicit[stem]))
 if stem == 'LegacyArena':e['candidate_domains']=[x for x in e['candidate_domains'] if x != 'G35'] + ['G08','G09']
 if '/tools/' in e['path']:e['scope']='developer_tool'
 elif e['path'].startswith('server/'):e['scope']='server_contract_or_storage'
 else:e['scope']='runtime_or_presentation_candidate'
 # Explicit UI and storage routing only, never elevates read/test status.
 if not e['candidate_domains'] and '/ui/' in e['path']:e['candidate_domains']=['X03']
 if not e['candidate_domains'] and e['path'].startswith('server/'):e['candidate_domains']=['X01','X04']
 if not e['candidate_domains'] and '/storage/' in e['path']:e['candidate_domains']=['X01','X02']
specs=[]
for e in TREES['docs/遊戲規格文件']['tree']:
 if e['type']=='blob' and e['path'].endswith('.md'):
  p='docs/遊戲規格文件/'+e['path']
  layer='HISTORICAL_DISCUSSION' if e['path'].startswith('討論來源/') else 'R5_CANDIDATE_OR_RESEARCH' if '/血統與家系-R5/' in p else 'SYSTEM_SPEC_CANDIDATE' if e['path'].startswith('系統規格書/') else 'REFERENCE_OR_AUDIT'
  specs.append(dict(path=p,authority_layer=layer,blob_sha=e['sha'],candidate_domains=[d['id'] for d in DOM if any(t in e['path'] for t in d['spec_tokens'])],read_status='PRIOR_PARTIAL_EVIDENCE' if p in priorpaths else 'UNREAD',source_url=f'https://github.com/eaglhuang/3klife/blob/{SHA}/'+p))
tests=[]
for e in TREES['tests']['tree']:
 if e['type']=='blob' and re.search(r'\.test\.(ts|js|cjs)$',e['path']):
  stem=pathlib.Path(e['path']).stem
  tests.append(dict(path='tests/'+e['path'],blob_sha=e['sha'],candidate_domains=[d['id'] for d in ALL if any((t in stem and not (t == 'Gene' and 'General' in stem)) for t in d['tokens'])],read_status='PRIOR_PARTIAL_EVIDENCE' if 'tests/'+e['path'] in priorpaths else 'UNREAD',execution_status='NOT_RUN',scope='candidate only; mixed gameplay/framework/UI tests; filename E2E is not actual E2E evidence'))
for t in tests:
 if '/LegacyArena' in t['path']:
  t['candidate_domains']=[x for x in t['candidate_domains'] if x != 'G35'] + ['G08','G09','G13']
for d in ALL:
 d['source_candidates']=[e['path'] for e in code if d['id'] in e['candidate_domains']]
 d['test_candidates']=[e['path'] for e in tests if d['id'] in e['candidate_domains']]
 d['spec_candidates']=[e['path'] for e in specs if d['id'] in e['candidate_domains']]
 d['fully_read']='NO';d['full_acceptance']='NOT_RUN'
 d['snapshot_evidence_count']=sum(e['read_status']!='UNREAD' for e in code if d['id'] in e['candidate_domains'])
json.dump({'commit':SHA,'provisional_gameplay_domains':DOM,'crosscutting_gates':GATES,'warning':'Inventory only. Candidate routing is not proof of implementation, requirements completeness, test execution, or acceptance.'},open(BASE/'system_matrix.json','w'),ensure_ascii=False,indent=2)
json.dump(code,open(BASE/'code_inventory.json','w'),ensure_ascii=False,indent=2)
json.dump(specs,open(BASE/'spec_inventory.json','w'),ensure_ascii=False,indent=2)
json.dump(tests,open(BASE/'test_inventory.json','w'),ensure_ascii=False,indent=2)
json.dump([e for e in code if not e['candidate_domains']],open(BASE/'unassigned_code.json','w'),ensure_ascii=False,indent=2)
counts={'commit':SHA,'gameplay_domain_buckets':len(DOM),'crosscutting_gates':len(GATES),'full_gameplay_acceptance_pass':0,'new_execution_tests':0,'typescript_files_in_scanned_roots':len(code),'typescript_by_root':dict(collections.Counter(e['path'].split('/')[0] for e in code)),'code_read_status':dict(collections.Counter(e['read_status'] for e in code)),'unassigned_code_count':sum(not e['candidate_domains'] for e in code),'test_filename_candidates':len(tests),'source_spec_markdown_files':len(specs),'warning':'42 is a provisional behavior-domain routing denominator, not complete requirement/atomic-case count. 14 probes are earlier partial characterization, not 14 domains accepted.'}
json.dump(counts,open(BASE/'counts.json','w'),ensure_ascii=False,indent=2)
print(json.dumps(counts,ensure_ascii=False,indent=2))
print('UNASSIGNED\n'+'\n'.join(e['path'] for e in code if not e['candidate_domains']))
