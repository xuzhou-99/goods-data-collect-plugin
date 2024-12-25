console.log("Content script loaded on:", window.location.href);

// 当前 tab 的序列号
let currentTabOrder = null;

// 监听页面的 postMessage
window.addEventListener("message", (event) => {
    console.log("Window Message:", event);
    if (event.source !== window)
        return;

    if (event.data.type === "extract-data-response") {
        const goodsData = {
            tag: event.data.tag,
            goodsInfo: event.data.goodInfo
        }

        // 附带序列号
        if (!goodsData.goodsInfo.tabOrder) {
            goodsData.goodsInfo.tabOrder = currentTabOrder
        }

        // 如果需要传递给 background.js，可使用 chrome.runtime.sendMessage
        chrome.runtime.sendMessage({ action: "saveGoodsInfoData", data: goodsData, });
    }
});

async function getTabOrder() {
    return new Promise((resolve) => {
        if (!currentTabOrder) {
            chrome.runtime.sendMessage({ action: "getTabOrder" }, (response) => {
                console.log(response);
                if (response.success) {
                    console.log("当前标签页序列号：", response.order);
                    // 将序列号存储或处理
                    currentTabOrder = response.order;
                    resolve(currentTabOrder);
                } else {
                    console.error("获取序列号失败：", response.message);
                    resolve(null);
                }
            });
        }
        resolve(currentTabOrder);
    });
}


// 监听页面加载完成
window.addEventListener("load", () => {
    console.log("页面加载完成", window.location.href, getTabOrder());

    if (isPinduoduoPage()) {
        console.log("检测到目标页面，开始提取数据");
        injectScriptOnce("scripts/goodscollect_inject.js");
    }

});

// 消息监听
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("Background Message:", request);

    // 保存序列号
    if (request.action === "assignTabOrder") {
        currentTabOrder = request.order;
        console.log(`当前 Tab 分配的序列号：${currentTabOrder}`);
    }

    // // 提取数据
    // if (request.action === "extractGoodData") {
    //     extractPddGoodData(sendResponse);
    //     return true; // 保持响应异步
    // }
})



// 将外部脚本动态插入页面
function injectScriptOnce(file) {
    if (!document.querySelector(`script[src="${chrome.runtime.getURL(file)}"]`)) {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL(file); // 获取扩展内的脚本路径
        script.onload = function () {
            this.remove(); // 移除脚本标签，保持页面干净
        };
        document.documentElement.appendChild(script);
    }
}

// 监听 DOM 变化（适用于 SPA 页面）
const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                // 检查是否是弹窗（通过 class="ant-modal-root" 来判断）
                if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('ant-modal-root')) {
                    console.log("检测到弹窗打开，开始注入逻辑");

                    // 插入 goodscollect_inject.js 脚本
                    injectScriptOnce("scripts/goodscollect_inject.js");
                }
            });
        }
    });
});

/**
 * 拼多多网站
 * @returns 拼多多网站
 */
function isPinduoduoPage(url) {
    if (!url) {
        url = window.location.href;
    }
    return /mobile\.(pinduoduo|yangkeduo)\.com\/(goods|good.*)\.html/.test(url);
}

// --------------------------------------- 商品采集 插件 --------------------------------------- //
// (function () {

//     if (!isPinduoduoPage()) {
//         return;
//     }

//     console.log("【GoodsCollector】 检测到进入目标页面, 开始注入脚本, url:" + window.location.href);

//     injectScriptOnce("scripts/goodscollect_inject.js");

//     console.log("【GoodsCollector】 脚本已加载");

// })();

