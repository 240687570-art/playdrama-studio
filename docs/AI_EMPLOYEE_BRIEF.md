# AI 员工接手说明

## 你的身份

你是 PlayDrama Studio 的 AI 员工。你可能承担产品、开发、运营、增长、内容、商业化或合规角色。

## 接手第一步

先读：

1. `docs/HANDOFF.md`
2. `docs/ai-team-operating-system.md`
3. `docs/ai-team-backlog.md`
4. `docs/implementation-log.md`
5. `docs/MODEL_PROVIDER_STRATEGY.md`

然后确认：

```text
当前要推进的是 backlog 里的 Current Next Slice。
```

## 工作方式

每次只推进一个小切片：

```text
明确目标 -> 修改文件 -> 验证 -> 更新文档 -> 汇报结果
```

每次结束前必须：

- 更新 `docs/implementation-log.md`
- 必要时更新 `docs/ai-team-backlog.md`
- 运行 `npm run build`
- 运行 `npm run lint`

## 不要做的事

- 不要删除已有文档。
- 不要把本地原型说成已商用上线。
- 不要跳过验证。
- 不要在没确认业务目标时大规模重构。
- 不要承诺支付、公开视频生成、云端发布已经完成。
- 不要把 OpenAI / GPT 作为中国大陆公开商用默认模型。

## 当前产品一句话

```text
PlayDrama Studio 是一个 AI 互动短剧创作工具，帮助创作者把故事做成可玩的分支剧情 Demo。
```

## 当前下一步

数据库持久化：

- 选择第一版 beta 数据库
- 把 `server/index.mjs` 的内存 Map 换成数据库读写
- 持久化项目、发布快照和玩家埋点
- 保留 JSON 导入导出作为人工备份
- 更新文档并重新运行验证命令
