console.log("Content script loaded on:", window.location.href);

// 当前 tab 的序列号
let currentTabOrder;
let injectFile;
let isScriptInjected = false;


async function getTabOrder() {
    if (currentTabOrder !== undefined) return currentTabOrder;

    try {
        const response = await new Promise(resolve => {
            chrome.runtime.sendMessage({ app: "Sys", action: "getTabOrder" }, resolve);
        });

        if (response?.success) {
            console.log("Get Tab orderNo success: ", response.order);
            currentTabOrder = response.order;
            return currentTabOrder;
        }
        console.warn("Get Tab orderNo failed:", response?.message);
        return;
    } catch (error) {
        console.error("getTabOrder error:", error);
        return;
    }
}

// 监听页面的 postMessage
window.addEventListener("message", (event) => {
    console.log("Web Message:", event);
    if (event.source !== window) {
        return;
    }
    // 确保消息来自当前页面
    console.debug("Window Message Data:", event.data);

    // 提取数据保存
    if (event.data.type === 'extract-data-response') {
        const dataInfo = {
            tag: event.data.tag,
            dataInfo: event.data.goodInfo || event.data.dataInfo
        }

        // 附带序列号
        dataInfo.dataInfo.tabOrder = dataInfo.dataInfo.tabOrder || currentTabOrder

        // 如果需要传递给 background.js，可使用 chrome.runtime.sendMessage
        chrome.runtime.sendMessage({ app: "GoodsCollect", action: "saveGoodsInfoData", data: dataInfo, });

        // 通知 background 当前页面采集完成
        chrome.runtime.sendMessage({ app: "Sys", action: "markProcess", status: "completed" });

        // ✅ 修改页面标题，加上 ✔ 标志
        markTitle('done');
    }

});


// 监听页面加载完成
window.addEventListener("load", async () => {
    console.log("Page load finished!", window.location.href);

    // 然后注入业务脚本
    injectScript('load', (response) => {
        console.log("Page load finished inject:", response);
    })

});

// 消息监听
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("Background Message:", request);

    // 提取数据
    if (request.action === "reExtractGoodData") {
        // 如果是重新加载模式，触发重新执行数据提取
        console.log("Triggering data extraction after script reload");
        // 延迟一点时间确保脚本完全初始化
        setTimeout(() => {

            // 设置 badge 标识-开始提取
            chrome.runtime.sendMessage({ app: "Sys", action: "markProcess", status: "pending" });
            // 🟡 标记标题为正在采集
            markTitle('ing');

            // 触发自定义事件，通知注入脚本重新执行数据提取
            window.dispatchEvent(new CustomEvent('__COLLECT_PLUGIN_RELOAD_COMPLETE__', {
                detail: {
                    scriptFile: injectFile,
                    timestamp: Date.now()
                }
            }));
        }, 500);
        sendResponse({ success: true, message: "Data extraction triggered" });
        return true; // 保持响应异步
    }

    // 接收后台脚本发送的消息
    if (message.type === "script-request") {
        console.log("Received script request details:", message);
    }
})




// 监听 DOM 变化（适用于 SPA 页面）
const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                // 检查是否是弹窗（通过 class="ant-modal-root" 来判断）

                // 插入脚本
                injectScript('load', (response) => {
                    console.log("Load inject:", response);
                });
            });
        }
    });
});

// 开始观察 DOM 变化
// observer.observe(document.body, { childList: true, subtree: true });




// --------------------------------------- 工具 --------------------------------------- //

// 工具函数
function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}


/**
 * 更新页面采集状态
 * 
 * @param {'ing'|'done'} status 
 */
function markTitle(status) {
    const markers = {
        ing: '🟡',
        done: '✅'
    };
    const originalTitle = document.title.replace(/^(?:✅|🟡)\s*/, '');
    document.title = `${markers[status] || ''} ${originalTitle}`.trim();
}

/**
 * 从 URL 中提取指定参数的值
 * @param {string} url - 要解析的 URL
 * @param {string} param - 要提取的参数名
 * @returns {string|null} - 参数的值，如果未找到则返回 null
 */
function getQueryParam(url, param) {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get(param);
}

// --------------------------------------- 商品采集 插件 --------------------------------------- //


// 集中管理平台配置
const PLATFORM_CONFIG = {
    pinduoduo: {
        // 拼多多网站
        test: url => /mobile\.(pinduoduo|yangkeduo)\.com\/(goods|good.*|goods.*)\.html/.test(url),
        script: "scripts/injects/pdd_collect_inject.js"
    },
    taobao: {
        // 淘宝
        test: url => /item\.(taobao)\.com\/(item.*)\.htm/.test(url),
        script: "scripts/injects/taobao_collect_inject.js"
    },
    tmall: {
        // 天猫
        test: url => /h5api\.m\.tmall\.com/.test(url) || /detail\.(tmall)\.com\/(item.*)\.htm/.test(url),
        script: "scripts/injects/tmall_collect_inject.js"
    },
    xiaohongshu: {
        // 小红书页面或接口
        test: url => /(?:xiaohongshu\.com|edith\.xiaohongshu\.com)/.test(url),
        script: "scripts/injects/xhs_collect_inject.js"
    },
    douyin: {
        // 抖音页面或接口
        test: url => /(?:douyin\.com)/.test(url),
        script: "scripts/injects/douyin_collect_inject.js"
    },
    kuaishou: {
        // 快手页面或接口
        test: url => /(?:kuaishou\.com)/.test(url),
        script: "scripts/injects/kuaishou_collect_inject.js"
    }
};

function getInjectFile(url = window.location.href) {
    if (injectFile) {
        return injectFile; // 如果已经设置了 injectFile，直接返回 
    }
    for (const [_, config] of Object.entries(PLATFORM_CONFIG)) {
        if (config.test(url)) return config.script;
    }
    return null;
}

async function injectScript(type, sendResponse) {
    injectFile = getInjectFile();
    if (!injectFile) {
        sendResponse({ success: false, message: "Not support page" });
        return;
    }

    const result = await injectScriptOnce(injectFile, type);
    sendResponse({ success: result });
}


/**
 * 动态注入 Chrome 扩展脚本到页面（避免重复注入，支持重新加载）
 * @param {string} file - 扩展内的脚本路径（如 "js/content.js"）
 * @param {"load"|"reload"} [type="load"] - 注入模式："load"（默认）或 "reload"（强制重新加载）
 */
async function injectScriptOnce(file, type = "load") {
    if (!file) return false;

    await getTabOrder();

    // 保证 reload_helper 先加载完成
    const ensureReloadHelperReady = (onReady) => {
        const helperUrl = chrome.runtime.getURL('scripts/injects/reload_helper.js');
        // 已经声明就绪标记则直接执行
        if (window.__COLLECT_RELOAD_HELPER_READY__) {
            return onReady();
        }

        // 如果标签已存在，但未就绪，则轮询等待就绪标记
        const existing = document.querySelector(`script[src="${helperUrl}"]`);
        if (existing) {
            let tries = 0;
            const maxTries = 20; // 最长等待 ~1s（20*50ms）
            const tick = () => {
                if (window.__COLLECT_RELOAD_HELPER_READY__) {
                    return onReady();
                }
                tries += 1;
                if (tries >= maxTries) {
                    console.warn('[Content] 等待 reload_helper 就绪超时，继续注入业务脚本');
                    return onReady();
                }
                setTimeout(tick, 50);
            };
            return tick();
        }

        try {
            const helper = document.createElement('script');
            helper.src = helperUrl;
            helper.async = false; // 保持与后续脚本的顺序
            helper.onload = function () {
                console.log('[Content] reload_helper.js 加载完成');
                if (window.__COLLECT_RELOAD_HELPER_READY__) {
                    onReady();
                } else {
                    // 保险等待一次
                    setTimeout(onReady, 0);
                }
            };
            helper.onerror = function (e) {
                console.warn('[Content] reload_helper.js 加载失败，继续注入业务脚本', e);
                onReady();
            };
            document.documentElement.appendChild(helper);
            console.log('[Content] 注入 reload_helper.js 中');
        } catch (e) {
            console.warn('[Content] 注入 reload_helper.js 失败，继续注入业务脚本', e);
            onReady();
        }
    };

    // 获取脚本的完整 URL
    const scriptUrl = chrome.runtime.getURL(file);

    // 重新检查脚本是否已存在（避免重复注入）
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (!existingScript && !isScriptInjected) {
        console.log("Try Injecting script:", file);

        ensureReloadHelperReady(() => {
            console.log("Injecting script:", file);

            // 设置 badge 标识-开始提取
            chrome.runtime.sendMessage({ app: "Sys", action: "markProcess", status: "pending" });
            // 🟡 标记标题为正在采集
            markTitle('ing');

            const script = document.createElement("script");
            script.src = scriptUrl;
            script.async = false; // 同步加载（确保执行顺序）

            // 脚本加载完成后的处理
            script.onload = function () {
                console.log("Script loaded successfully:", file);
                isScriptInjected = true;
            };

            script.onerror = function () {
                console.error("Failed to load script:", file);
                isScriptInjected = false;
            };

            // 将脚本添加到页面
            document.documentElement.appendChild(script);
        });
        return true;
    }

    // 如果脚本已存在或正在注入中，返回 false
    if (existingScript) {
        console.log("Script already exists:", file);
    } else if (isScriptInjected) {
        console.log("Script injection in progress:", file);
    }

    return false;
}


// --------------------------------------- 商品采集 插件 --------------------------------------- //

(async function () {
    await getTabOrder();

    injectFile = getInjectFile();

    injectScript('load', (response) => {
        console.log('Init load inject:', response);
    })

})();

