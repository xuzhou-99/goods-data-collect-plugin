
console.log("Content script loaded on:", window.location.href);

// 监听页面的 postMessage
window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data.type === "axios-response") {
        console.log("Received Axios Response in Content Script:", event.data);

        // 如果需要传递给 background.js，可使用 chrome.runtime.sendMessage
        chrome.runtime.sendMessage({
            action: "saveGoodsInfoData",
            tag: '',
            goodsInfo: event.data.userInfo,
        });
    }
});

// 监听页面加载完成
window.addEventListener("load", () => {
    console.log("页面加载完成，准备自动提取数据");

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
                        // alert("考勤数据已保存");
                        console.log("考勤数据已保存");
                    } else {
                        // alert("考勤数据保存失败：" + response.message);
                        console.log("考勤数据保存失败：" + response.message);
                    }

                });
            } else {
                console.error("提取数据失败", response.message);
            }
        });

    } else {
        console.log("当前页面非目标页面，跳过数据提取");
    }
});

// 消息监听
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    // 提取考勤数据
    if (request.action === "extractGoodData") {
        console.log("接收到的提取数据请求：", request);
        extractGoodData(sendResponse);
        return true; // 保持响应异步
    }
})

/**
 * 添加账号
 */
function simulateLogin() {
    // 获取用户名和密码的输入框元素，并填充数据
    const usernameInput = document.querySelector('input[name="account"]');
    const passwordInput = document.querySelector('input[name="password"]');
    usernameInput.value = _username;
    passwordInput.value = _password;

    // 找到登录按钮并模拟点击
    const loginButton = document.querySelector('button[type="submit"]');
    loginButton.click();
}


/**
 * 提取考勤数据
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
        console.log("goodInfoJson：", goodInfoJson);

        var goodInfo = {};
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
                        goodInfo.sideSalesTip = goods.sideSalesTip;

                        goodInfo.shareLink = goods.shareLink;
                        goodInfo.goodsLink = "https://mobile.pinduoduo.com/goods.html?goods_id=" + goodInfo.goodsID;

                        if (goods.ui && goods.ui.new_price_section) {
                            goodInfo.goodsPrice = goods.ui.new_price_section.price;
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

function injectScriptOnce(file) {
    if (!document.querySelector(`script[src="${chrome.runtime.getURL(file)}"]`)) {
        injectScript(file);
    }
}

// 将外部脚本动态插入页面
function injectScript(file) {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(file); // 获取扩展内的脚本路径
    script.onload = function () {
        this.remove(); // 移除脚本标签，保持页面干净
    };
    document.documentElement.appendChild(script);
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
function isPinduoduoPage() {
    return /mobile\.(pinduoduo|yangkeduo)\.com\/goods\.html/.test(window.location.href);
}


// --------------------------------------- 商品采集 插件 --------------------------------------- //
(function () {

    if (!isPinduoduoPage()) {
        return;
    }

    console.log("【GoodsCollector】检测到进入目标页面" + " url:" + window.location.href);
    console.log("【GoodsCollector】开始注入脚本");

    // 插入 goodscollect_inject.js 脚本
    injectScriptOnce("scripts/goodscollect_inject.js");
    console.log("插入 goodscollect_inject.js 脚本完成");

    console.log('【GoodsCollector】脚本已加载');
})();

