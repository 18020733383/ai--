# 模块边界说明

## 目标
这份文档用于约束后续重构，避免把大文件拆成一堆无主代码。

## 目录职责
- `app/`: 应用壳层。负责顶层装配、页面切换、Provider、设置与存档入口，不承载具体玩法规则。
- `game/`: 核心领域。负责世界数据、系统规则、类型、状态选择器。
- `features/`: 按玩法或页面组织的功能模块。每个 feature 自带自己的 `ui`、`model`、`hooks`。
- `shared/`: 跨 feature 复用的叶子组件、纯工具和通用 hook。
- `services/`: 外部集成和 IO，例如 AI 接口、解析器。不保存 feature 业务状态。
- `docs/`: 架构说明、迁移记录、索引文档。

## 放置规则
- 页面级容器放在 `features/<feature>/ui/`。
- 纯派生函数、selector、数据整形逻辑放在 `features/<feature>/model/` 或 `game/selectors/`。
- 世界规则、战斗规则、外交规则放在 `game/systems/`。
- 静态世界数据放在 `game/data/`。
- 通用按钮、卡片、弹窗壳层放在 `shared/ui/`。

## 禁止事项
- 不要新建泛用 `utils.ts` 或 `helpers.ts` 垃圾桶。
- 不要在 `index.ts` 中写业务逻辑。
- 不要让 feature 之间直接 import 对方的深层私有文件。
- 不要把本应属于单个玩法的代码塞进 `shared/`。
- 不要让页面组件继续直接吞几十个离散 props。

## `index.ts` 规则
- `index.ts` 只做公开出口。
- feature 对外暴露组件、hook、类型和少量稳定 API。
- feature 内部模块之间允许相对路径导入。
- 上层装配代码优先从 feature 的 `index.ts` 导入。

## 状态归属
- `App.tsx` 只保留壳层状态、跨 feature 编排和顶层导航。
- 城镇、战斗、地图、世界报表等 feature 状态尽量收敛为 `state/actions/derived` 三组输入。
- 纯函数优先无副作用，副作用集中在壳层或 hook 内。

## 迁移原则
- 先抽纯函数，再抽设置和存档，再抽页面边界，最后才动日推进和战斗结算。
- 允许保留兼容层，优先降低风险，不追求一次性重写。
- 每新增一层目录时，都需要同步明确它的职责。
