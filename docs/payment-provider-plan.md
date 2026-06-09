# 支付接入计划

## 当前状态

线上支付已从沙盒切到真实供应商链路：

```text
PAYMENT_PROVIDER=alipay
PAYMENT_CURRENCY=CNY
ALIPAY_NOTIFY_URL=https://playdrama.tokenaicloud.com/api/payment/callbacks/alipay
```

下单后订单状态保持为 `pending`，不会提前解锁付费结局。只有支付宝异步通知通过 RSA2 验签并返回支付成功后，订单才会更新为 `paid`，客户端刷新状态后解锁对应结局。

回调验签现在包含二次校验：支付宝回调除了 RSA2 验签，还会校验 `app_id`、订单金额，并在配置 `ALIPAY_SELLER_ID` 时校验收款方；微信支付回调会验 API v3 签名、解密 resource，并校验 `appid`、`mchid` 和订单金额。伪造签名或金额篡改不会修改订单。

一键验收：

```powershell
npm run payment:provider:verify
npm run payment:callbacks:verify
```

服务器运维命令：

```sh
sudo bash deploy/aliyun/ops.sh payment
```

该脚本只创建待支付订单并检查收银台链接，不打开收银台，不触发扣款；测试订单会自动清理。

## 支持的供应商

- `alipay`: 已接入 WAP 收银台下单、RSA2 异步通知验签、订单 `paid` 标记。
- `wechat`: 已接入 API v3 Native 下单和回调解密逻辑，但线上未启用，因为还缺商户私钥 PEM 和平台公钥 PEM 文件。
- `sandbox`: 仅保留给开发验收，不用于真实收款。

## 微信支付待补

要启用微信支付，需要把以下文件放到服务器，并确认环境变量指向真实路径：

```text
WECHAT_PAY_PRIVATE_KEY_PATH=/path/to/apiclient_key.pem
WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH=/path/to/wechatpay_platform_public_key.pem
PAYMENT_PROVIDER=alipay,wechat
```

启用后再运行：

```sh
sudo bash deploy/aliyun/ops.sh payment
```

## 上线验收

- 支付供应商状态：`GET /api/payment/provider`
- 商用门禁：`GET /api/readiness`
- 订单创建：`POST /api/play/:buildId/orders`
- 支付宝回调：`POST /api/payment/callbacks/alipay`
- 微信回调：`POST /api/payment/callbacks/wechat`

## 不做的事

- 不把未支付订单标记为已支付。
- 不在聊天、代码仓库或发布包中输出商户密钥。
- 不保存用户银行卡、身份证或支付账号敏感信息。
