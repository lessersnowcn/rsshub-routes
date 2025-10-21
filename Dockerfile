# 第一阶段：构建环境（命名为 builder）
# 使用一个包含 Node.js 的官方基础镜像
FROM node:22-alpine AS builder

# 安装 git 用来克隆仓库
RUN apk add --no-cache git

# 克隆 RSSHub 仓库到 /app 目录
RUN git clone https://github.com/DIYgod/RSSHub.git /app

# 设置工作目录
WORKDIR /app

# 全局安装 pnpm
RUN npm install -g pnpm

# 安装所有依赖
RUN pnpm install

# --- 核心改动 5：修正自定义路由的复制路径 --- #
# 将本地 ./routes/ 文件夹里的 *所有内容*，复制到容器的 /app/lib/routes/ 目录下
# 注意后面的 `.` 和 `/`，这能确保是复制文件夹内容，而不是文件夹本身
COPY ./routes/ /app/lib/routes/
# ----------------------------------------------- #

# 编译项目
RUN pnpm build


# 第二阶段：创建最终的、精简的生产镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 因为 RSSHub 在运行时也需要 git 来更新路由信息，所以最终镜像也需要安装它
RUN apk add --no-cache git

# 全局安装 pnpm，因为生产环境启动时可能也需要它
RUN npm install -g pnpm

# --- 创建干净的生产环境 --- #
# 1. 只从 builder 阶段复制项目的清单文件
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# 2. 在这个干净的环境中，只安装生产环境必需的依赖
RUN pnpm install --prod

# 3. 从 builder 阶段复制已经编译好的代码和运行时需要的文件
# 复制编译产物
COPY --from=builder /app/dist ./dist
# 复制路由、模块、中间件等运行时必需的源代码
COPY --from=builder /app/lib ./lib
# 复制 .git 目录，以解决 "Git Hash: unknown" 问题并确保功能完整
COPY --from=builder /app/.git ./.git

# 暴露端口
EXPOSE 1200

# 最终的启动命令
CMD ["pnpm", "start"]
