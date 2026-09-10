# dsh-aemeath

爱弥斯主题皮肤 + 像素桌宠 + 推理强度滑块, 用于 DeepSeek Harness Web GUI

> 参考项目:
>
> - [`hachimi-ai/dsh-aemeath`](https://github.com/hachimi-ai/dsh-aemeath)
> - [`magiczerowxy/dsh-modef`](https://github.com/magiczerowxy/dsh-modef)
>
> 整合并适配到 `>=dsh v0.1.2`

## 安装

```bash
git clone https://github.com/fontlos/dsh-aemeath
cd dsh-aemeath
pnpm install
pnpm build
dsh plugin --profile web add link:/path/to/dsh-aemeath
```

## 路由

| 路径 | 用途 |
|------|------|
| `/dsh-aemeath/wallpaper.jpg` | 皮肤背景壁纸 |
| `/dsh-aemeath/spritesheet.webp` | 桌宠精灵表 |
| `/dsh-aemeath/skin.css` | 皮肤样式（外置，`<link>` 注入） |
| `/dsh-aemeath/pet.css` | 桌宠样式（外置，`<link>` 注入） |
| `/dsh-aemeath/effort.css` | 设置行 + 滑块/特效样式（外置，`<link>` 注入） |
| `/dsh-aemeath/status` | 桌宠状态（JSON：animation / bubble / core） |

## 桌宠状态联动

| 事件 | 动画 | 气泡 |
|------|------|------|
| 收到消息 | chatting | 正在组织回复... |
| 读取文件 / 搜索代码 / 查找文件 | running | 正在读取文件... / 正在搜索代码... / 正在查找文件... |
| 写入 / 编辑 | building | 正在构建... / 正在修改文件... |
| 执行命令 | running | 正在执行命令... |
| 分析 / 编排 | analyzing | 正在分析... / 正在编排任务... |
| 获取 / 搜索网页 | fetching / searching | 正在获取网络内容... / 正在搜索网络... |
| 等待用户回答 | waving | 等待你的指示... |
| 整理任务清单 | waiting | 整理任务清单... |
| 读取技能 | review | 学习中... |
| 全部完成 | celebrating | 太棒了! |

## 授权

- 壁纸与精灵表素材来自第三方, 仅供个人学习交流使用, 版权归原权利人所有
- 插件代码 MIT License
