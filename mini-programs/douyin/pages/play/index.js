Page({
  data: {
    webUrl: ""
  },

  onLoad(query) {
    const app = getApp()
    const baseUrl = app.globalData.h5BaseUrl || "https://playdrama.tokenaicloud.com/"
    const params = []
    params.push("preview=1")
    params.push("channel=douyin-mini")
    params.push("utm_source=douyin-mini")
    params.push("utm_medium=mini_program")
    if (query.build) params.push(`build=${encodeURIComponent(query.build)}`)
    if (query.campaign) params.push(`utm_campaign=${encodeURIComponent(query.campaign)}`)
    this.setData({
      webUrl: `${baseUrl}?${params.join("&")}`
    })
  }
})
