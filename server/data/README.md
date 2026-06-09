# 本地数据目录

后端 API 会自动在这里创建：

```text
playdrama-db.json
```

这个文件保存本地作品、发布快照和玩家埋点。

它适合内测和交接，不适合正式商用生产。正式上线前，需要迁移到 PostgreSQL、Supabase 或其他云数据库。
