# 模型供应商策略

## 结论

PlayDrama Studio 分国内版和海外版处理模型能力。

国内大陆公开商用版：

```text
默认接国内大模型 API，不直接接 OpenAI / GPT。
```

海外版或研究环境：

```text
可按 OpenAI 支持地区政策接 OpenAI / GPT 系列。
```

## 国内版推荐模型池

优先接：

- DeepSeek
- 通义千问
- 豆包
- 智谱 GLM
- 文心
- Kimi / Moonshot
- MiniMax
- 腾讯混元

用途拆分：

| 能力 | 国内版建议 |
|---|---|
| 剧情生成 | DeepSeek、通义千问、豆包、GLM |
| 角色设定 | Kimi、DeepSeek、MiniMax |
| 长文本改写 | Kimi、通义千问 |
| 内容安全 | 国内云厂商内容安全 API + 自建规则 |
| 图片/视频 | 后续单独评估可商用和版权条款 |

## OpenAI / GPT 策略

不作为国内公开商用默认供应商。

允许场景：

- 海外版
- OpenAI 官方支持地区
- 内部研究
- 非中国大陆公开产品

禁止场景：

- 中国大陆公开产品默认调用
- 通过代理绕过支持地区限制
- 向国内用户包装转售 GPT 能力
- 使用用户自己的 OpenAI Key 规避平台责任

## 产品内路由规则

当前原型在项目数据里加入：

```text
modelRouting
```

字段含义：

- `market`：目标市场
- `defaultProvider`：默认模型供应商
- `openaiPolicy`：OpenAI 使用策略
- `contentSafety`：内容安全要求
- `fallbackProvider`：备用模型供应商

## 后端实现建议

未来后端不要让前端直接调用模型 API。

推荐结构：

```text
前端 -> AI Orchestrator -> Provider Adapter -> 国内/海外模型
```

这样可以统一处理：

- 鉴权
- 成本
- 内容审核
- 敏感词
- 提示词模板
- 供应商切换
- 日志和追踪

## 当前决策

当前阶段按国内版优先：

```text
默认模型池：DeepSeek / 通义千问 / 豆包 / 智谱 GLM
OpenAI 策略：Disabled for China public launch
内容安全：Required
```

