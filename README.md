# AetherCanvas (以太画报) 🎨

AetherCanvas 是一款 AI 原生的“全知交互中枢”。它打破了传统对话框的限制，将 AI 的海量搜索与逻辑推理过程，转化为极具美学的、具备像素级证据支撑的动态视觉画报。

![AetherCanvas Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop)

## ✨ 核心特性

- **Swiss Design 美学**：基于包豪斯与瑞士排版风格的 Masonry (瀑布流) 画报布局。
- **非对称审计 (Asymmetric Auditing)**：AI 生成的每一个结论都带有像素级的证据引用，点击即可通过 GSAP 动态连线定位到原始网页截图。
- **Nexus-Browser 抓取**：高性能端侧浏览器引擎，自动提取色彩指纹 (Palette)、主视觉图及视频关键帧。
- **长期记忆 (Mem0)**：系统会自动学习用户的调研偏好与风格，实现“越用越懂你”的自进化。
- **Superpowers Bar**：支持原子化指令（如 `/v` 视频模式、`/p` 视觉模式、`/m` 记忆模式）。
- **流式语音交互**：集成 Web Speech API，支持大屏幕实时流式字幕与语音录入。

## 🛠 技术栈

- **Frontend**: Next.js 16 (App Router), Three.js (粒子云), Tailwind CSS, GSAP (动态连线), Framer Motion.
- **Backend**: FastAPI, Playwright (Nexus-Browser), LiteLLM (多模型调度), Mem0 (长期记忆).
- **Design**: Swiss Grid System, Bauhaus Typography.

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/Wjzhong123/aether-canvas.git
cd aether-canvas
```

### 2. 后端配置 (Server)
```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # 配置您的 API Key (OpenAI, DeepSeek)
python3 main.py
```

### 3. 前端配置 (Client)
```bash
cd client
npm install
npm run dev
```
访问 `http://localhost:3000` 即可开启调研。

## 📱 多端适配
- **Desktop**: 全景画报模式，支持复杂连线审计。
- **Mobile**: 流体卡片模式，优化了语音输入与字幕显示。

---
Produced by **Antigravity** for **AetherCanvas Intelligence Platform**.
