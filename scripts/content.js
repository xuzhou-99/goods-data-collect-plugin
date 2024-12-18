console.log("Content script loaded on:", window.location.href);

// 当前 tab 的序列号
let currentTabOrder = null;

// 监听页面的 postMessage
window.addEventListener("message", (event) => {
    console.log("Window Message:", event);
    if (event.source !== window)
        return;

    if (event.data.type === "axios-response") {
        const goodsInfo = {
            tag: 'pdd',
            goodsInfo: response.goodInfo
        }

        // 如果需要传递给 background.js，可使用 chrome.runtime.sendMessage
        chrome.runtime.sendMessage({ action: "saveGoodsInfoData", data: goodsInfo, });
    }
});

async function getTabOrder() {
    return new Promise((resolve) => {
        if (!currentTabOrder) {
            chrome.runtime.sendMessage({ action: "getTabOrder" }, (response) => {
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
        extractGoodData((response) => {
            if (response.success) {
                const goodsInfo = {
                    tag: 'pdd',
                    goodsInfo: response.goodInfo
                }
                console.log("提取数据成功，发送消息至页面", goodsInfo);

                chrome.runtime.sendMessage({ action: "saveGoodsInfoData", data: goodsInfo }, (response) => {
                    console.log("保存数据：", response);
                    if (response.success) {
                        // alert("数据已保存");
                        console.log("数据已保存");
                    } else {
                        // alert("数据保存失败：" + response.message);
                        console.log("数据保存失败：" + response.message);
                    }

                });
            } else {
                console.error("提取数据失败", response.message);
            }
        });
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

    // 提取数据
    if (request.action === "extractGoodData") {
        extractGoodData(sendResponse);
        return true; // 保持响应异步
    }
})

/**
 * 提取数据
 * @param {*} sendResponse 
 * @returns 
 */
function extractGoodData(sendResponse) {
    console.log("接收到提取商品数据消息，开始提取")

    try {
        // 从页面提取数据逻辑
        let draggableDocument;
        if (isPinduoduoPage()) {
            draggableDocument = document;
        }
        if (!draggableDocument) {
            console.log("未进入到指定页面");
            sendResponse({ success: false, message: "未进入到指定页面", });
            return;
        }

        var goodInfoScripts = [];
        const scripts = draggableDocument.scripts;
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].textContent) {
                var content = scripts[i].textContent;
                if (content && content.indexOf('window.rawData') > 0) {
                    goodInfoScripts.push(scripts[i]);
                }
            }
        }

        if (goodInfoScripts.length == 0) {
            console.log("数据未找到");
            sendResponse({ success: false, message: "数据未找到", });
            return;
        }
        var goodInfoStr = goodInfoScripts[0].textContent.trim();
        goodInfoStr = goodInfoStr.replace('window.rawData=', '');
        if (goodInfoStr.endsWith(";")) {
            goodInfoStr = goodInfoStr.substring(0, goodInfoStr.length - 1);
        }
        // console.log("goodInfoStr：", goodInfoStr);

        const goodInfoJson = JSON.parse(goodInfoStr);
        // const goodInfoJson = window.rawData;
        console.log("goodInfoJson：", goodInfoJson);

        var webUrl = draggableDocument.location.origin + draggableDocument.location.pathname;
        if (!webUrl) {
            webUrl = "https://mobile.pinduoduo.com/goods.html";
        }

        var goodInfo = {
            tabOrder: currentTabOrder, // 附带序列号
        };
        if (goodInfoJson && goodInfoJson.store) {
            // 商品的链接，标题，店铺名，价格，销量
            const store = goodInfoJson.store;
            if (store.initDataObj) {
                const initDataObj = store.initDataObj;
                if (initDataObj) {
                    // 店铺信息
                    const mall = initDataObj.mall;
                    if (mall) {
                        goodInfo.mallId = mall.mallId;
                        goodInfo.mallName = mall.mallName;
                    }

                    // 商品信息
                    const goods = initDataObj.goods;
                    if (goods) {
                        goodInfo.goodsName = goods.goodsName;
                        goodInfo.goodsID = goods.goodsID;
                        goodInfo.goodsSales = goods.sideSalesTip;
                        goodInfo.shareLink = goods.shareLink;
                        goodInfo.goodsLink = webUrl + "?goods_id=" + goodInfo.goodsID;

                        if (goods.ui && goods.ui.new_price_section) {
                            goodInfo.goodsPrice = goods.ui.new_price_section.price;
                        }

                        if (goods.statusExplain) {
                            goodInfo.statusExplain = goods.statusExplain;
                        }
                    }
                }
            }
        }

        console.log("goodInfo:", goodInfo);

        sendResponse({ success: true, goodInfo });

    } catch (error) {
        console.error("提取数据失败：", error);
        sendResponse({ success: false, message: "提取数据失败" });
    }
}

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
(function () {

    if (!isPinduoduoPage()) {
        return;
    }

    console.log("【GoodsCollector】 检测到进入目标页面, 开始注入脚本, url:" + window.location.href);

    injectScriptOnce("scripts/goodscollect_inject.js");

    console.log("【GoodsCollector】 脚本已加载");

})();

