# rsshub-routes
借助RSSHUB创建动态路由，自己快速定制网站的feed源

文件放置结构
.
├── docker-compose.yml
├── Dockerfile
├── routes.json
└── routes/
    └── my/
        └── dynamic.ts

RSSHUB需要构建编译过程才能将ts文件编译为可读的js文件被读取，直接挂载是没用的
