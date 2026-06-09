# PlayDrama 微信小程序壳

这个目录是微信小程序上线准备壳。当前先用 `web-view` 承载 PlayDrama H5 发布页，后续拿到小程序 AppID、业务域名和微信支付商户号后，再接原生播放器与 `wx.requestPayment`。

## 需要在微信公众平台配置

- 小程序 AppID
- 服务器域名和业务域名：`https://playdrama.tokenaicloud.com`
- 微信支付商户号和支付回调
- 视频号/社群落地入口

## 本地打开

用微信开发者工具导入此目录，把 `project.config.json` 里的 `appid` 替换为真实 AppID。
