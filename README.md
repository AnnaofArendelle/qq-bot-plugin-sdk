# QQ Bot Plugin SDK v1

用于 Cloudflare Pages / Workers 上 QQ Bot 的独立插件 SDK。SDK 提供类型、构建器、配置协议和测试工具，不包含机器人核心源代码。需要 Node.js 22+。

## 开发与安装

```sh
npm install -D https://github.com/AnnaofArendelle/qq-bot-plugin-sdk/releases/download/v1.0.0/qq-bot-plugin-sdk-1.0.0.tgz
```

推荐克隆 [每日插件](https://github.com/AnnaofArendelle/qq-bot-plugin-daily) 或 [系统插件](https://github.com/AnnaofArendelle/qq-bot-plugin-essentials) 作为模板，然后运行 `npm ci`、`npm run typecheck`、`npm test`。将 `dist/<id>-<version>.zip` 交给用户，通过 WebUI「插件管理」上传，启用并点击「保存并部署」。不要上传 GitHub 自动生成的源代码 ZIP。

```text
my-plugin/
├── plugin.json            # 身份、API 版本、命令、所需能力
├── config.schema.json     # WebUI 自动生成表单
├── src/index.ts           # 默认导出 Plugin 对象
├── tests/                 # 使用 SDK testing 模拟机器人能力
├── package.json
└── dist/my-plugin-1.0.0.zip
    ├── plugin.json        # 包含构建器生成的代码 SHA-256
    ├── config.schema.json
    └── plugin.mjs         # 编译并打包依赖后的独立 ESM
```

`plugin.json`：

```json
{"apiVersion":1,"id":"hello","name":"问候","version":"1.0.0","entry":"plugin.mjs","permissions":["reply.text"],"commands":[{"id":"hello","triggers":["/hello"],"mode":"prefix","description":"发送问候"}]}
```

`config.schema.json`：

```json
{"type":"object","properties":{"greeting":{"type":"string","title":"问候语","default":"你好","maxLength":100}},"required":["greeting"],"additionalProperties":false}
```

`src/index.ts`：

```ts
import { definePlugin } from '@qq-bot/plugin-sdk';
export default definePlugin<{greeting:string}>({
  async onCommand(ctx) {
    await ctx.reply.text(`${ctx.config.greeting} ${ctx.command.args}`);
  }
});
```

在 package.json 添加 `"build":"qq-plugin build"`，运行 `npm run build`。构建器只处理本地开发环境，不在机器人请求过程中编译。所有依赖必须打入单个 ESM；不支持 Node 内置模块、外部 import、dynamic import 或 import.meta。ZIP 根目录严格包含上述 3 个文件。

## 与机器人交互

- `ctx.message`：只读的文字、发送者、群、会话、渠道、QQ 自动 @ 状态和当前请求的节点信息。没有原始 ENV、CF Token、QQ AppSecret 或数据库对象。
- `ctx.command`：命令 ID、匹配触发词、参数。默认 `exact` 精确匹配；`prefix` 按第一个空白前的词匹配。触发词不允许空白；不支持正则扫描。`/clear`、`/proactive` 为核心保留命令，启用插件之间不能重名。
- `ctx.reply.text()` / `.image()`：通过机器人适配器发送回复，图片须为 HTTPS。命令及应答不会进入 AI 上下文。
- `ctx.storage.get/set/delete/putIfDay`：JSON 存储，自动以插件 ID 隔离；`putIfDay(key,{day,...})` 原子保留同一天已存在的值。每值最多 4000 字符，每次处理最多 8 次存储操作。ID 是数据身份，升级不要随意改 ID。
- `ctx.http.json(url,{timeoutMs})`：HTTPS GET，禁止重定向，单响应最多 1 MiB，每次处理最多 4 个请求，超时 1–15 秒。SDK 网络封装是使用约定，不是防恶意代码的网络沙箱。
- `ctx.commands`：当前渠道已启用插件及核心命令目录，供帮助面板使用。
- `beforeModel(ctx)`：需声明 `model.context` 能力，在核心主动/被动判断决定调用 AI 后运行；返回 `{systemAppend:"补充要求"}`。单插件最多 2000 字符，总共最多 4000；此钩子不能调用 SDK 回复接口。不会创建额外模型请求，不支持自行注册模型工具或改变现有 reply 工具协议。
- `ctx.log.info/error()`：核心只记录插件 ID 与事件类别，避免无意记录配置密钥；传入的详细文本不输出。

插件必须 `await` 完成本次处理，不应保留 context、开启后台循环或依赖全局内存保存业务数据。SDK 在处理结束后关闭本次能力对象。异步错误会被核心捕获；插件命令失败不会误转为 AI 对话。同步死循环不能在同一个 Worker 内被可靠抢占。

## 配置、开关与密钥

首版 schema 支持一层字段：`string`、`boolean`、`integer`、`number`，支持 `title`、`description`、`default`、`enum`、`required`、长度及数值范围。暂不支持嵌套对象、数组、自定义浏览器脚本/HTML或远程表单组件。

字符串字段加 `"x-secret":true` 即生成密钥控件。不能在包里设置非空默认密钥。WebUI 只展示是否配置，以保持、替换、删除操作合并。密钥放入 CF secret ENV，仅由运行时注入 `ctx.config`；不会进入生成入口代码、插件 ZIP 或浏览器草稿。CF 管理员和同 Worker 内的可信执行代码不构成隔离安全域。

安装、开关、范围（群聊/私聊）、设置、升级和卸载均需要一次重新部署。插件包和普通设置随部署加密保存，管理 API 验证 CF 编辑权限后恢复。浏览器草稿按后端地址和部署版本保存；密钥草稿只在内存里。卸载默认保留 D1 数据，重装同 ID 可继续使用。代码回滚不等于数据回滚。

## 资源与信任边界

最多 8 个安装插件，单模块 128 KiB，模块合计 512 KiB，单 ZIP 256 KiB。每次命令最多 3 条 SDK 回复。核心在实例初始化时建立命令索引，普通消息不逐个调用插件 match，也不查询配置数据库。

插件文件与核心文件独立，但运行在同一个 Worker isolate，CPU 额度共享。SDK 能力检查不能隔离恶意 JavaScript；只安装可信来源插件。打包和压缩不是源码加密，也不能让交付给管理员的 JavaScript 永远不可逆向。

Cloudflare 免费 Workers 请求 CPU 上限为 10ms（包括 waitUntil 的计算），等待网络不等于 CPU，但 JSON 解析、加密、打包和插件计算会占用 CPU。部署组装放在浏览器中，管理 API 仍有自己的 CPU/请求开销。限制包大小不代表保证任意插件能在免费额度内运行，需通过 CF 指标和真实负载验证；重计算插件应调用外部服务。

## SDK 文件用途

- `src/index.d.ts`：完整类型契约，供 TypeScript 和 AI 阅读。
- `src/index.js`：极小的 definePlugin 帮助函数。
- `src/protocol.js`：离线/管理阶段使用的包、配置、冲突验证；不在聊天热路径验证 ZIP。
- `src/testing.js`：模拟回复、图片、存储和 HTTP 的测试 context。
- `bin/qq-plugin.mjs`：esbuild 编译、依赖打包、导出检查、哈希和 ZIP 输出。
- `AI-PLUGIN-PROMPT.md`：可直接交给 AI 的开发提示。

版本策略：`apiVersion:1` 为稳定的核心交互协议，插件 `version` 使用 SemVer。核心不支持的 API 版本拒绝安装。新 SDK 若有破坏性契约修改应提升 API 版本。
