# 脚本重新注入机制说明

## 概述

为了解决脚本重新注入后数据提取逻辑失效的问题，我们实现了一套完整的重新注入机制。该机制确保即使页面没有刷新，重新注入的脚本也能正常执行数据提取功能。

## 核心机制

### 1. 重新注入事件系统

当脚本以 `reload` 模式重新注入时，系统会：

1. 移除旧的脚本标签
2. 重置注入状态
3. 注入新的脚本
4. 触发 `__COLLECT_PLUGIN_RELOAD_COMPLETE__` 自定义事件

### 2. 全局状态标记

- `window.__COLLECT_PLUGIN_RELOAD__`: 标记脚本是否处于重新注入状态
- `window.__COLLECT_PLUGIN_LOADED__`: 标记脚本是否已加载完成

## 使用方法

### 在注入脚本中使用

#### 方法1：使用通用机制（推荐）

```javascript
// 在注入脚本中，将原来的数据提取逻辑包装成函数
function extractData() {
    // 你的数据提取逻辑
    console.log("执行数据提取...");
}

// 使用通用机制设置重新注入后的数据提取
if (typeof setupReloadDataExtraction === 'function') {
    setupReloadDataExtraction(extractData, '脚本名称');
} else {
    // 降级处理：使用原来的逻辑
    window.addEventListener('load', () => {
        setTimeout(extractData, 1000);
    });
}
```

#### 方法2：手动监听事件

```javascript
// 手动监听重新注入完成事件
window.addEventListener('__COLLECT_PLUGIN_RELOAD_COMPLETE__', (event) => {
    console.log("脚本重新注入完成，重新执行数据提取", event.detail);
    // 延迟执行数据提取
    setTimeout(extractData, 200);
});

// 检查是否处于重新注入状态
if (window.__COLLECT_PLUGIN_RELOAD__) {
    console.log("检测到脚本重新注入，立即执行数据提取");
    setTimeout(extractData, 500);
}
```

### 在 content.js 中调用

```javascript
// 重新注入脚本
injectScript("reload", (response) => {
    console.log("脚本重新注入完成:", response);
});
```

## 事件详情

### `__COLLECT_PLUGIN_RELOAD_COMPLETE__` 事件

```javascript
{
    type: '__COLLECT_PLUGIN_RELOAD_COMPLETE__',
    detail: {
        scriptFile: "scripts/injects/example.js",
        timestamp: 1234567890
    }
}
```

## 时序图

```
重新注入请求 → 移除旧脚本 → 注入新脚本 → 脚本加载完成 → 触发事件 → 执行数据提取
     ↓              ↓          ↓          ↓          ↓          ↓
   injectScript   remove()   append()   onload    dispatch   extractData
```

## 优势

1. **自动化**: 无需手动管理重新注入后的数据提取
2. **兼容性**: 支持降级处理，确保向后兼容
3. **可靠性**: 多重保障机制，确保数据提取能够执行
4. **调试友好**: 详细的日志输出，便于问题排查

## 注意事项

1. **重要**: `setupReloadDataExtraction` 函数会自动注入到页面的全局作用域中，无需手动定义
2. 数据提取函数应该是纯函数，避免副作用
3. 合理设置延迟时间，确保页面数据已完全加载
4. 在降级处理中保持原有的逻辑不变

## 问题排查

### 如果 setupReloadDataExtraction 函数不可用

如果注入脚本中仍然无法访问 `setupReloadDataExtraction` 函数，可能的原因和解决方案：

1. **执行顺序问题**: 确保 `content.js` 在注入脚本之前执行
2. **作用域隔离**: 函数会自动注入到页面全局作用域，检查 `window.setupReloadDataExtraction`
3. **调试方法**: 在注入脚本中添加以下代码进行调试：

```javascript
console.log("setupReloadDataExtraction 函数状态:", typeof setupReloadDataExtraction);
console.log("window.setupReloadDataExtraction 函数状态:", typeof window.setupReloadDataExtraction);

if (typeof setupReloadDataExtraction === 'function') {
    console.log("✅ 函数可用，使用通用机制");
    // 使用通用机制
} else {
    console.log("❌ 函数不可用，使用降级处理");
    // 降级处理
}
```

### 测试页面

使用 `test_reload_mechanism.html` 页面来测试重新注入机制是否正常工作。

## 示例

参考以下文件中的实现：
- `scripts/content.js` - 核心机制实现
- `scripts/injects/xhs_collect_inject.js` - 小红书注入脚本
- `scripts/injects/pdd_collect_inject.js` - 拼多多注入脚本
- `scripts/injects/douyin_collect_inject.js` - 抖音注入脚本
- `scripts/injects/kuaishou_collect_inject.js` - 快手注入脚本
- `scripts/injects/tmall_collect_inject.js` - 天猫注入脚本
- `scripts/injects/taobao_collect_inject.js` - 淘宝注入脚本
- `scripts/injects/demo_inject.js` - 示例注入脚本
