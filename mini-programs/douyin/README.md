# PlayDrama 抖音小程序壳

这个目录是抖音小程序上线准备壳。当前先用 `web-view` 承载 PlayDrama H5 发布页，后续拿到抖音小程序 AppID、挂载能力和担保支付资质后，再接原生播放器与 `tt.pay`。

## 需要在抖音开放平台配置

- 抖音小程序 AppID
- 业务域名：`https://playdrama.tokenaicloud.com`
- 视频挂载小程序入口
- 担保支付商户入驻和回调

## 本地打开

用抖音开发者工具导入此目录，把 `project.config.json` 里的 `appid` 替换为真实 AppID。
