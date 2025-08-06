console.log("Content script loaded on:", window.location.href);

// 当前 tab 的序列号
var currentTabOrder;
var injectFile;

async function getTabOrder() {
    return new Promise((resolve) => {
        if (!currentTabOrder) {
            chrome.runtime.sendMessage({ app: "Sys", action: "getTabOrder" }, (response) => {
                console.log(response);
                if (response.success) {
                    console.log("Get Tab orderNo success: ", response.order);
                    // 将序列号存储或处理
                    currentTabOrder = response.order;
                    resolve(currentTabOrder);
                } else {
                    console.info("Get Tab orderNo failed: ", response.message);
                    resolve(null);
                }
            });
        }
        resolve(currentTabOrder);
    });
}

// 监听页面的 postMessage
window.addEventListener("message", (event) => {
    if (event.source !== window) {
        return;
    }
    // console.debug("Window Message:", event);
    console.debug("Window Message Data:", event.data);

    if (event.data.type === 'extract-data-response') {
        const dataInfo = {
            tag: event.data.tag,
            dataInfo: event.data.goodInfo || event.data.dataInfo
        }

        // 附带序列号
        if (!dataInfo.dataInfo.tabOrder) {
            dataInfo.dataInfo.tabOrder = currentTabOrder
        }

        // 如果需要传递给 background.js，可使用 chrome.runtime.sendMessage
        chrome.runtime.sendMessage({ app: "GoodsCollect", action: "saveGoodsInfoData", data: dataInfo, });

        // 通知 background 当前页面采集完成
        chrome.runtime.sendMessage({ action: "markCompleted" });

        // ✅ 修改页面标题，加上 ✔ 标志
        markTitle('done');
    }


});


// 监听页面加载完成
window.addEventListener("load", () => {
    console.log("Page load finished!", window.location.href, getTabOrder());

    injectScript((response) => {
        console.log("Auto inject:", response);
    })

});

// 消息监听
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("Background Message:", request);

    // 保存序列号
    if (request.action === "assignTabOrder") {
        currentTabOrder = request.order;
        console.log(`Current Tab orderNo:${currentTabOrder}`);
    }

    // 提取数据
    if (request.action === "extractGoodData") {
        injectScript("reload", sendResponse);
        return true; // 保持响应异步
    }
})

function injectScript(type, sendResponse) {
    if (isPinduoduoPage()) {
        injectFile = "scripts/injects/pdd_collect_inject.js";
        console.log("Pinduoduo page");
    } else if (isTaobaoPage()) {
        injectFile = "scripts/injects/taobao_collect_inject.js";
        console.log("Taobao page");
    } else if (isTianmaoPage()) {
        injectFile = "scripts/injects/tmall_collect_inject.js";
        console.log("Tmall page");
    } else if (isXiaohongshuPage()) {
        injectFile = "scripts/injects/xhs_collect_inject.js";
        console.log("Xhs page");
    } else if (isDouyinPage()) {
        injectFile = "scripts/injects/douyin_collect_inject.js";
        console.log("Douyin page");
    } else if (isKuaishouPage()) {
        injectFile = "scripts/injects/kuaishou_collect_inject.js";
        console.log("Kuaishou page");
    } else {
        // injectFile = "scripts/injects/demo_inject.js";
        console.log("Default page");
    }

    // todo 新增支持抖音、快手 

    if (injectFile) {

        // 设置 badge 标识-开始提取
        chrome.runtime.sendMessage({ action: "markPending" });
        // 🟡 标记标题为正在采集
        markTitle('ing');

        injectScriptOnce(injectFile, type);
        sendResponse({ success: true });
    } else {
        console.log("Not support page");
        sendResponse({ success: false, message: "Not support page" });
    }
}

// 将外部脚本动态插入页面
function injectScriptOnce(file, type) {
    if (!chrome.runtime.getURL(file)) {
        console.log("Inject js not exists:" + file);
    }
    const oldScript = document.querySelector(`script[src="${chrome.runtime.getURL(file)}"]`);
    // 如果是重新加载脚本，则先移除旧的脚本
    if (type === "reload") {
        if (oldScript) {
            console.log("Removing old script:", file);
            oldScript.remove();
        }
    }
    if (!oldScript) {
        console.log("Inject js :" + file);
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL(file); // 获取扩展内的脚本路径
        script.onload = function () {
            this.remove(); // 移除脚本标签，保持页面干净
        };
        document.documentElement.appendChild(script);
    }
}

function markTitle(status) {
    const originalTitle = document.title.replace(/^✅ |^🟡 /, ''); // 去除旧标记

    let newTitle = '';
    if (status === 'ing') {
        newTitle = `🟡 ${originalTitle}`;
    } else if (status === 'done') {
        newTitle = `✅ ${originalTitle}`;
    } else {
        newTitle = originalTitle; // 清除标记
    }

    document.title = newTitle;
}

// 监听 DOM 变化（适用于 SPA 页面）
const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                // 检查是否是弹窗（通过 class="ant-modal-root" 来判断）

                // 插入脚本
                injectScriptOnce(injectFile);
            });
        }
    });
});

// 开始观察 DOM 变化
// observer.observe(document.body, { childList: true, subtree: true });

// ------------------------------ 天猫 ------------------------------ //

// 接收后台脚本发送的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "script-request") {
        console.log("Received script request details:", message);

    }
});

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

/**
 * 拼多多网站
 * @returns true
 */
function isPinduoduoPage(url) {
    if (!url) {
        url = window.location.href;
    }
    return /mobile\.(pinduoduo|yangkeduo)\.com\/(goods|good.*)\.html/.test(url);
}

/**
 * 淘宝
 * @returns true
 */
function isTaobaoPage(url) {
    if (!url) {
        url = window.location.href;
    }
    return /item\.(taobao)\.com\/(item.*)\.htm/.test(url);
}

/**
 * 淘宝
 * @returns true
 */
function isTianmaoPage(url) {
    if (!url) {
        url = window.location.href;
    }
    return /h5api\.m\.tmall\.com/.test(url) || /detail\.(tmall)\.com\/(item.*)\.htm/.test(url);
}

/**
 * 小红书页面或接口
 * @param {*} url 
 * @returns 
 */
function isXiaohongshuPage(url) {
    if (!url) url = window.location.href;
    // 同时匹配主站和接口域名
    return /(?:xiaohongshu\.com|edith\.xiaohongshu\.com)/.test(url);
}


/**
 * 抖音页面或接口
 * @param {*} url 
 * @returns 
 */
function isDouyinPage(url) {
    if (!url) url = window.location.href;
    // 同时匹配主站和接口域名
    return /(?:douyin\.com)/.test(url);
}

/**
 * 快手页面或接口
 * 
 * @param {*} url 
 * @returns 
 */
function isKuaishouPage(url) {
    if (!url) url = window.location.href;
    // 同时匹配主站和接口域名
    return /(?:kuaishou\.com)/.test(url);
}

// --------------------------------------- 商品采集 插件 --------------------------------------- //

(function () {

    injectScript((response) => {
        console.log(response);
    })

})();

