# 抖音和微信小程序上线方案

PlayDrama 的渠道策略升级为三层：

1. H5 发布页：立即可用，承载互动播放、数据埋点和当前支付宝付费结局。
2. 小程序壳：抖音和微信各有一个最小壳，先用 `web-view` 承载 H5，保持渠道参数和数据回传。
3. 原生小程序闭环：拿到平台资质后，替换为原生播放器、平台内支付和平台挂载入口。

## 已建目录

- `mini-programs/douyin`：抖音小程序壳，渠道参数为 `douyin-mini`。
- `mini-programs/wechat`：微信小程序壳，渠道参数为 `wechat-mini`。

## 抖音小程序

目标闭环：

短视频预热 -> 挂载抖音小程序 -> 小程序内互动播放 -> `tt.pay` 担保支付 -> PlayDrama 订单回调和数据分析。

需要用户配合：

- 抖音开放平台账号和小程序 AppID。
- 小程序业务域名配置。
- 视频挂载小程序能力。
- 担保支付商户入驻。
- `tt.pay` 回调地址和密钥。

官方参考：

- 发布内容至抖音：https://developer.open-douyin.com/docs/resource/zh-CN/dop/ability/opensdk/content-management/share-and-publish-to-douyin
- 抖音小程序支付 `tt.pay`：https://partner.open-douyin.com/docs/resource/zh-CN/mini-app/develop/api/open-interface/pay/tt-pay/

## 微信小程序

目标闭环：

视频号/社群/公众号 -> 微信小程序 -> 小程序内互动播放 -> `wx.requestPayment` -> PlayDrama 订单回调和数据分析。

需要用户配合：

- 微信小程序 AppID。
- 小程序服务器域名和业务域名。
- 微信支付商户号。
- 支付证书、API v3 Key、回调地址。
- 视频号/公众号入口配置。

官方参考：

- 微信小程序支付：https://pay.weixin.qq.com/doc/v3/merchant/4012791898
- 小程序 WebView 业务域名：https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html

## 当前限制

当前小程序壳仍然承载 H5。它能提前验证渠道入口和播放数据，但不能替代平台内支付。平台内付费需要后端新增抖音 `tt.pay` 和微信 `wx.requestPayment` 订单适配器。

## 已接入的后端任务流

- `GET /api/distribution/providers` 返回抖音 OpenAPI、抖音小程序、微信小程序的配置状态。
- `POST /api/projects/:projectId/distribution/jobs` 生成平台发布任务，写入 `distribution_jobs`。
- `douyin` 渠道在有 `DOUYIN_ACCESS_TOKEN`、`DOUYIN_OPEN_ID` 和 `videoId` 时会尝试调用抖音 OpenAPI 发布视频；否则生成手动发布交接任务。
- `douyin-mini` 和 `wechat-mini` 渠道会生成对应小程序路径，例如 `/pages/play/index?build=...&channel=wechat-mini`。
- 工作台“发布变现”页已经显示平台状态、任务按钮和最近发布任务。

## 下一步

1. 用户提供抖音小程序 AppID、微信小程序 AppID。
2. 在两个平台后台配置 `playdrama.tokenaicloud.com` 为业务域名。
3. 申请抖音视频挂载小程序和微信支付商户能力。
4. 后端新增 `douyin-mini-pay` 和 `wechat-mini-pay` 支付 provider。
5. 小程序播放器从 `web-view` 迁移为原生互动页面。
