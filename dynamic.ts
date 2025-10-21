// /routes/my/dynamic.ts

import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
// 引入 Node.js 的文件系统和路径模块
import fs from 'fs';
import path from 'path';

// 定义配置对象的类型，让代码更健壮
interface SiteConfig {
    title: string;
    url: string;
    listSelector: string;
    titleSelector: string;
    linkSelector?: string; // linkSelector 是可选的
    linkIsSelf?: boolean; // linkIsSelf 也是可选的
    descSelector?: string;
    authorSelector?: string;
    pubDateSelector?: string;
}

export const route: Route = {
    // path 依然是 /:id，这个 id 会对应 routes.json 里的 "sspai" 或 "hackernews"
    path: '/:id',
    categories: ['other'],
    example: '/dynamic/sspai',
    parameters: { id: '路由ID，对应 routes.json 中的键' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiUserAgent: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    handler: async (ctx) => {
        // 1. 从用户请求的 URL 中获取 id，比如 "sspai"
        const id = ctx.req.param('id');
        if (!id) {
            throw new Error('路由ID不能为空');
        }

        // 2. 读取并解析 routes.json 文件
        // 注意：这里的路径是相对于容器内部的绝对路径
        const routesJsonPath = '/app/routes.json';
        const routesConfig = JSON.parse(fs.readFileSync(routesJsonPath, 'utf-8'));

        // 3. 根据 id 查找对应的配置
        const siteInfo = routesConfig[id];
        if (!siteInfo || !siteInfo.config) {
            throw new Error(`在 routes.json 中未找到 ID 为 "${id}" 的有效配置`);
        }
        const config: SiteConfig = siteInfo.config;

        // 4. 使用配置中的 url 进行网络请求
        const response = await got(config.url);
        const $ = load(response.data);

        // 5. 使用配置中的 listSelector 选取列表
        const list = $(config.listSelector);

        // 6. 遍历列表，使用配置中的选择器提取数据
        const items = list
            .map((_, item) => {
                const $item = $(item);
                
                // 提取标题
                const title = $item.find(config.titleSelector).text().trim();

                // 提取链接
                let link;
                if (config.linkIsSelf) {
                    link = $item.attr('href');
                } else if (config.linkSelector) {
                    link = $item.find(config.linkSelector).attr('href');
                }
                // 将相对链接转为绝对链接
                if (link) {
                    link = new URL(link, config.url).href;
                }

                // (可选) 提取其他信息
                const description = config.descSelector ? $item.find(config.descSelector).html() : '';
                const author = config.authorSelector ? $item.find(config.authorSelector).text() : '';
                const pubDate = config.pubDateSelector ? parseDate($item.find(config.pubDateSelector).text()) : undefined;

                return {
                    title,
                    link,
                    description,
                    author,
                    pubDate,
                };
            })
            .get()
            .filter((item) => item.link); // 过滤掉没有链接的无效项

        // 7. 返回格式化的 RSS 数据，标题也来自配置
        return {
            title: config.title,
            link: config.url,
            item: items,
        };
    },
};
