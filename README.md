# OCR 前端应用

基于 Vue 3 + TypeScript 的纯前端 OCR 应用，直接调用 Google Cloud Vision API 进行文字识别。

## 🚀 功能特性

- **纯前端实现**: 无需后端服务器，直接在浏览器中调用 Google Cloud Vision API
- **API Key 管理**: 首次使用时配置 API Key，安全存储在浏览器 localStorage 中
- **图片文字识别**: 支持多种图片格式（包括 HEIC 转换）
- **PDF 处理**: 使用 pdfjs-dist 将 PDF 转换为图片进行 OCR
- **图片编辑**: 集成 Fabric.js 进行图片预处理
- **多语言支持**: 可配置语言提示优化识别效果
- **实时预览**: Canvas 预览和文本输出管理
- **响应式设计**: 使用 DaisyUI 组件库的现代化界面

## 📦 技术栈

- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **UI 组件**: DaisyUI + TailwindCSS
- **图片处理**: Fabric.js
- **PDF 处理**: pdfjs-dist
- **HEIC 转换**: heic2any

## 🛠 安装步骤

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 3. 配置 API Key

首次访问应用时，会弹出 API Key 配置对话框。

#### 如何获取 Google Cloud Vision API Key：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建或选择一个项目
3. 启用 Cloud Vision API
4. 在"凭据"页面创建 API 密钥
5. 将 API 密钥复制并粘贴到应用的配置对话框中

## 📖 使用说明

1. **配置 API Key**: 首次使用时输入 Google Cloud Vision API Key
2. **上传图片**: 选择或拖拽图片文件到上传区域
3. **选择语言**: （可选）选择识别语言以提高准确度
4. **开始识别**: 点击"开始识别"按钮
5. **查看结果**: 在右侧文本输出区域查看识别结果
6. **图片编辑**: 使用图片编辑工具进行裁剪、旋转等操作

## ⚙️ 重新配置 API Key

点击右上角的"设置"按钮可以重新配置 API Key。

## 🏗 构建生产版本

```bash
npm run build
```

构建后的文件将在 `dist` 目录中。

## 📝 注意事项

- API Key 存储在浏览器的 localStorage 中，请妥善保管
- 清除浏览器数据会删除已保存的 API Key
- 确保 API Key 有足够的配额用于 Vision API 调用
- 建议为 API Key 设置使用限制和 HTTP referrer 限制以提高安全性

## 🔒 安全建议

1. 在 Google Cloud Console 中为 API Key 设置 HTTP referrer 限制
2. 设置每日配额限制，避免意外超额使用
3. 定期轮换 API Key
4. 不要在公共场合分享您的 API Key

## 📄 许可证

MIT

