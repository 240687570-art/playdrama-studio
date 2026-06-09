# 抖音渠道分发方案

PlayDrama 当前先采用 H5 引流闭环：短视频负责获客，PlayDrama H5 负责互动播放、数据埋点和付费结局。抖音内播放和抖音内支付需要后续接入抖音小程序。

## 当前已实现

- 发布页生成渠道链接：抖音、视频号、小红书、私域社群。
- 每个渠道链接带 `channel`、`utm_source`、`utm_medium`、`utm_campaign`。
- H5 播放事件会把渠道参数写进 analytics metadata。
- 发布页提供抖音预热视频钩子、发布文案和话题组合。
- 发布页展示渠道漏斗：访问会话、节点浏览、互动选择、付费订单。

## 抖音开放平台分阶段

### 阶段 1：H5 引流

创作者把 PlayDrama 生成的抖音渠道链接或二维码放进短视频评论、私信、主页、社群或投放素材中。用户在 H5 里完成互动和付费。

### 阶段 2：投稿能力

申请抖音开放平台“发布内容至抖音”和 H5 场景能力。通过开放平台把预热视频、标题、话题带到抖音发布器，由用户确认发布。

官方参考：
- 发布内容至抖音：https://developer.open-douyin.com/docs/resource/zh-CN/dop/ability/opensdk/content-management/share-and-publish-to-douyin
- H5 分享/投稿：https://open.douyin.com/platform/resource/docs/develop/share/H5/

### 阶段 3：抖音小程序闭环

创建抖音小程序播放器，把短视频挂载到小程序。用户在抖音内进入互动短剧，付费结局走小程序担保支付。

官方参考：
- 抖音小程序支付 `tt.pay`：https://partner.open-douyin.com/docs/resource/zh-CN/mini-app/develop/api/open-interface/pay/tt-pay/

## 尚未接入

- 抖音开放平台 OAuth 和投稿 API。
- 抖音小程序工程。
- `tt.pay` 担保支付和回调验签。
- 抖音短视频挂载小程序入口。
- 抖音内支付订单和 PlayDrama 订单的对账。
