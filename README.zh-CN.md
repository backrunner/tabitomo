<div align="center">
  <img src="./public/icons/buddy.png" alt="tabitomo" width="120" height="120">
  <h1>tabitomo (旅友)</h1>
  <p><strong>AI 驱动的多语言翻译工具 - 您的旅行伴侣</strong></p>

  [English](./README.md) | [中文](./README.zh-CN.md)

  [![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
  [![Made with React](https://img.shields.io/badge/Made%20with-React-61dafb.svg)](https://reactjs.org/)
  [![Powered by AI](https://img.shields.io/badge/Powered%20by-AI-ff6b6b.svg)](https://github.com/vercel/ai)
</div>

---

## 🌟 特性

- **🎙️ 多输入方式翻译**
  - 文本输入，自动翻译
  - 语音输入，语音识别
  - 图像翻译，OCR 支持
  - 相机拍照，即时翻译

- **🤖 AI 驱动**
  - 支持多种 AI 提供商（OpenAI、自定义端点）
  - 先进的 VLM（视觉语言模型）图像翻译
  - 高质量 OCR，基于坐标的文本覆盖
  - 智能缓存，加速重复翻译

- **🌍 多语言支持**
  - 中文、日语、英语、韩语、法语、西班牙语等
  - 自动检测源语言
  - 日语文本支持假名注音
  - 翻译结果文本转语音

- **📱 渐进式 Web 应用**
  - 可安装到移动设备和桌面
  - 离线可用（Service Worker）
  - 优化的 PWA 资源

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm (通过 corepack 管理)

### 安装

```bash
# 启用 corepack（如果尚未启用）
corepack enable

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

### 环境配置

创建 `.env` 文件或在应用中配置设置：

1. **通用 AI 设置**
   - API 密钥
   - 端点 URL
   - 模型名称

2. **图像 OCR 设置**
   - 提供商（Qwen VL 或自定义）
   - API 密钥和端点
   - 模型名称

3. **音频转录**（可选）
   - SiliconFlow API 增强语音识别

## 🎯 使用方法

### 文本翻译
1. 选择源语言和目标语言
2. 输入或朗读文本
3. 获得即时 AI 翻译
4. 使用 TTS 收听发音

### 图像翻译
1. 切换到相机模式
2. 上传图像或使用相机拍照
3. 选择模式：
   - **OCR 模式**：在图像上覆盖翻译文本
   - **纯文本模式**：使用 VLM 提取并翻译文本

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: UnoCSS (兼容 Tailwind)
- **UI 组件**: shadcn/ui
- **AI SDK**: Vercel AI SDK
- **PWA**: vite-plugin-pwa
- **图标**: Lucide React
- **路由**: React Router
- **OCR/VLM**: OpenAI 兼容 API

## 📦 项目结构

```
tabitomo/
├── public/              # 静态资源
│   ├── icons/          # 应用图标和 PWA 资源
│   └── kuromoji/       # 日语文本处理字典
├── src/
│   ├── components/     # React 组件
│   ├── utils/          # 工具函数
│   │   ├── translation.ts      # 翻译逻辑
│   │   ├── imageOcr.ts         # OCR 和 VLM
│   │   ├── japanese.ts         # 假名注音生成
│   │   └── settings.ts         # 设置管理
│   ├── App.tsx         # 主应用组件
│   └── index.tsx       # 入口文件
├── LICENSE             # Apache 2.0 许可证
├── NOTICE              # 专有资源声明
└── package.json        # 依赖项
```

## 📄 许可证

本项目采用 **Apache License 2.0** 许可证 - 详见 [LICENSE](./LICENSE) 文件。

### 专有资源

"Buddy" 吉祥物图标（`public/icons/buddy.png`、`public/icon.png`）为专有资源，**保留所有权利**。详见 [NOTICE](./NOTICE)。

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

## 💖 致谢

- Buddy 吉祥物设计 - © 2025 tabitomo
- 由 [Vercel AI SDK](https://sdk.vercel.ai/) 提供支持
- UI 组件来自 [shadcn/ui](https://ui.shadcn.com/)
- 使用 [Vite](https://vitejs.dev/) 和 [React](https://react.dev/) 构建

---

<div align="center">
  由 tabitomo 团队用 ❤️ 制作
</div>
