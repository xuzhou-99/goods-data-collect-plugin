# 自动提取开关功能说明

## 功能概述
在 `collect.html` 页面中添加了自动提取开关功能，用户可以通过开关控制是否启用自动提取功能。

## 实现的功能

### 1. UI 组件
- 在按钮区域添加了自动提取开关
- 开关样式采用 on/off 设计，带有切换效果
- on 状态显示绿色，off 状态显示默认灰色

### 2. 配置管理
- 开关状态从 `platformConfig.autoWork` 字段读取
- 支持在页面上启用/停用自动提取功能
- 配置变更会保存到 Chrome 存储中

### 3. 交互体验
- 点击开关可以切换状态
- 状态变更有视觉反馈和提示信息
- 支持平台切换时自动更新开关状态

## 技术实现

### 前端文件修改
- `pages/collects/collect.html`: 添加开关HTML结构
- `pages/collects/collect.css`: 添加开关样式和动画效果
- `pages/collects/collect.js`: 添加开关逻辑和事件处理

### 后端文件修改
- `background.js`: 添加 `updatePlatformConfig` 消息处理
- `background/storage.js`: 添加 `updatePlatformConfig` 函数

### 核心函数
- `initAutoWorkToggle()`: 初始化开关状态
- `toggleAutoWork()`: 切换开关状态
- `saveAutoWorkConfig()`: 保存配置到存储

## 使用方法

1. 打开任意平台的采集页面
2. 在按钮区域找到"自动提取"开关
3. 点击开关可以启用/停用自动提取功能
4. 状态会自动保存，下次打开页面时会恢复

## 样式特性

- 开关尺寸: 50px × 24px
- 滑块尺寸: 20px × 20px
- 颜色: on状态为绿色(#4CAF50)，off状态为灰色(#ccc)
- 动画: 0.3s 平滑过渡效果
- 响应式: 支持移动端显示

## 注意事项

- 开关状态会保存到 Chrome 本地存储
- 每个平台的配置独立保存
- 平台切换时会自动更新开关状态
- 配置变更失败时会自动回滚到原状态
