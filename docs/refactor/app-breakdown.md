# `App.tsx` 拆分索引

## 当前职责分区
- 应用壳层与视图切换：`view`、`currentLocation`、顶部导航、弹窗开关。
- 世界状态：`player`、`heroes`、`locations`、`lords`、`worldDiplomacy`。
- 战斗流程：遭遇、谈判、战前部署、结算、战报播放。
- 城镇流程：招募、驻军、矿区、祭坛、藏身处、锻造、领主交互。
- AI 设置：Provider、Profile、模型列表、本地持久化。
- 存档：序列化、索引、自动存档、导入导出。
- 世界报表：全图兵力统计、信徒统计、世界公告栏数据整形。

## 已迁出
- `game/systems/diplomacy`: 世界关系、worldInit、randomUtils、workContracts。
- `game/systems/locationDefense`: `getLocationDefenseDetails`。
- `game/systems/recruitment`: `getRecruitmentPool`。
- `game/systems/relationHelpers`: `getLocationRace`, `getLocationRelationTarget`, `getLocationRecruitId`, `getRelationScale`, `getEncounterChance`, `getEnemyRace`, `buildSupportTroops`, `getCityReligionTierCap`, `computePreachPlan`, `normalizeRelationMatrix`, `getRelationValue`。
- `game/systems/heroHelpers`: `getHeroRoleLabel`, `getHpRatio`, `getHeroPower`, `canHeroBattle`, `buildHeroAttributes`, `buildPlayerAttributes`, `buildHeroTroop`, `buildHeroAttributesFromTroop`, `buildEnemyLordHero`, `buildEnemyCommanderHero`, `pickBestTroop`, `ensureEnemyHeroTroops`, `buildPlayerTroop`, `getBattleTroops`。
- `game/systems/mapMovement`: `findLocationAtPosition`。
- `game/systems/garrisonHelpers`: `getGarrisonLimit`, `getGarrisonCount`, `mergeTroops`, `splitTroops`, `getFactionLocations`。
- `game/data`: minerals、siegeEngines、buildings、heroes (HERO_EMOTIONS)。
- `features/battle/model/resolveBattleProgrammatic`: 程序化战斗结算。
- `app/providers/ai-settings`、`app/save-load`、`features/world-board/model`、`features/town`。

## 后续优先级（按块大小与依赖复杂度）

| 优先级 | 块 | 约行数 | 复杂度 |
|--------|-----|--------|--------|
| 1 | `processDailyCycle` | ~3600 | 高：大量 state/setters、addLog、回调 |
| 2 | ~~`getLocationDefenseDetails`~~ | ~~~230~~ | ✅ 已迁至 `game/systems/locationDefense` |
| 3 | ~~`getRecruitmentPool`~~ | ~~~150~~ | ✅ 已迁至 `game/systems/recruitment` |
| 4 | ~~关系/外交 helpers~~ | ~~~200~~ | ✅ 已迁至 `game/systems/relationHelpers` |
| 5 | ~~Hero 相关逻辑~~ | ~~~150~~ | ✅ 已迁至 `game/systems/heroHelpers` |
| 6 | ~~地图/移动逻辑~~ | ~~~100~~ | ✅ 已迁至 `game/systems/mapMovement`、`garrisonHelpers` |
| 7 | ~~parrotChatter/parrotMischiefEvents~~ | ~~~65~~ | ✅ 已迁至 `game/data/flavor.ts` |

## 拆分约束
- 不改玩法行为，只做结构重组。
- 优先保持导入兼容，允许过渡期 re-export。
- 迁移时优先把“状态边界”理顺，再考虑“文件大小”。
