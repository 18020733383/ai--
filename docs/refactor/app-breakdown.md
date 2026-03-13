# `App.tsx` 拆分索引

## 当前职责分区
- 应用壳层与视图切换：`view`、`currentLocation`、顶部导航、弹窗开关。
- 世界状态：`player`、`heroes`、`locations`、`lords`、`worldDiplomacy`。
- 战斗流程：遭遇、谈判、战前部署、结算、战报播放。
- 城镇流程：招募、驻军、矿区、祭坛、藏身处、锻造、领主交互。
- AI 设置：Provider、Profile、模型列表、本地持久化。
- 存档：序列化、索引、自动存档、导入导出。
- 世界报表：全图兵力统计、信徒统计、世界公告栏数据整形。

## 已迁出或预留迁出点
- `game/systems/diplomacy/`: 世界关系初始化、归一化、关系变更。
- `app/providers/ai-settings/`: AI 配置构造与本地存储读写。
- `app/save-load/`: 存档 schema、索引、slot 元数据。
- `features/world-board/model/`: 世界兵力与信徒统计。
- `features/town/`: TownView 的类型边界和公开出口。

## 后续优先级
1. 继续缩减 `App.tsx` 中的内联渲染 helper。
2. 拆 `processDailyCycle` 为世界系统模块。
3. 抽离战斗发起、战斗结算和奖励应用。
4. 将地图、战斗、城镇的局部状态改成 feature hook 或容器对象。

## 拆分约束
- 不改玩法行为，只做结构重组。
- 优先保持导入兼容，允许过渡期 re-export。
- 迁移时优先把“状态边界”理顺，再考虑“文件大小”。
