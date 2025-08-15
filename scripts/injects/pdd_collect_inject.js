function isTargetPage(url) {
    if (!url) {
        url = window.location.href;
    }

    // todo: targetPage_url regex
    const check = /mobile\.(pinduoduo|yangkeduo)\.com\/(goods|good.*)\.html/.test(url);
    console.debug("[PluginInject] isTargetPage:", check);
    return check;
}

function extractGoodData(dataSource, sendResponse) {
    console.log("[PluginInject] Start to extract goods data...");
    // console.debug("[PluginInject] Sourcedata:", dataSource);

    try {

        const targetData = dataSource;
        console.log("[PluginInject] targetData:", targetData);
        if (!targetData) {
            sendResponse({ success: false, message: "Not Found target data!", });
            return;
        }

        var success = false;
        // 存放提取的商品数据
        var goodInfo = {
            // tabOrder: currentTabOrder, // 附带序列号
        };
        var webUrl = document.location.origin + document.location.pathname;
        if (!webUrl) {
            webUrl = "https://mobile.pinduoduo.com/goods.html";
        }
        if (targetData && targetData.store && targetData.store.initDataObj) {
            // 商品的链接，标题，店铺名，价格，销量
            const store = targetData.store;
            const initDataObj = store.initDataObj;
            // 店铺信息
            const mall = initDataObj.mall;
            if (mall) {
                goodInfo.mallId = mall.mallId;
                goodInfo.mallName = mall.mallName;
            }

            // 商品信息
            const goods = initDataObj.goods;
            if (goods) {
                goodInfo.id = goods.goodsId;
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

            success = true;
        }

        if (success == true) {
            sendResponse({ success: true, goodInfo });
        } else {
            sendResponse({ success: false, message: "Empty Data!" });
        }
    } catch (error) {
        sendResponse({ success: false, message: "Extract data failed" });
    }
}

function extractAndSaveGoodData(type, responseData) {
    extractGoodData(responseData, (sendResponse) => {
        if (sendResponse.success) {
            const goodInfo = sendResponse.goodInfo;
            const goodsInfo = {
                tag: type,
                goodsInfo: goodInfo
            }
            console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

            window.postMessage({
                type: 'extract-data-response',
                tag: type,
                goodInfo: goodInfo,
            }, "*");

        } else {
            console.info("[PluginInject] Plugin error:", sendResponse.message);
        }
    })
};

(function () {

    console.log("[PluginInject] [Target Website page] inject js, url:", window.location.href);
    // // 如果是 reload 模式，强制重新执行（即使标记存在）
    // const isReloadMode = window.__COLLECT_PLUGIN_RELOAD__ === true;

    // if (window.__COLLECT_PLUGIN_INJECTED__ && !isReloadMode) {
    //     console.log("[PluginInject] Plugin already injected, skip this time.");
    //     return;
    // }

    // // 标记为已注入（如果是 reload 模式，稍后会被重置）
    // window.__COLLECT_PLUGIN_INJECTED__ = true;
    // window.__COLLECT_PLUGIN_RELOAD__ = false; // 重置 reload 标记

    const injectOtherHijack = () => {
        console.info("[PluginInject] Other Inject");

        // 仅在详情页等 document 请求时尝试提取 window.__INITIAL_STATE__
        function extractFromInitialState() {
            try {
                // 从页面提取数据逻辑
                let targetDoc;
                if (isTargetPage()) {
                    targetDoc = document;
                }
                if (!targetDoc) {
                    console.info("[PluginInject] Not jump into target page!");
                    return;
                }

                const targetData = window.rawData;
                if (!targetData) {
                    var goodInfoScripts = [];
                    const scripts = targetDoc.scripts;
                    for (var i = 0; i < scripts.length; i++) {
                        if (scripts[i].textContent) {
                            var content = scripts[i].textContent;
                            if (content && content.indexOf('window.rawData') > 0) {
                                goodInfoScripts.push(scripts[i]);
                            }
                        }
                    }

                    if (goodInfoScripts.length == 0) {
                        console.info("[PluginInject] Not Found target data!");
                        return;
                    }
                    var goodInfoStr = goodInfoScripts[0].textContent.trim();
                    goodInfoStr = goodInfoStr.replace('window.rawData=', '');
                    if (goodInfoStr.endsWith(";")) {
                        goodInfoStr = goodInfoStr.substring(0, goodInfoStr.length - 1);
                    }
                    // console.log("goodInfoStr: ", goodInfoStr);

                    targetData = JSON.parse(goodInfoStr);
                }
                extractAndSaveGoodData('pdd', targetData);
            } catch (e) {
                console.warn("[PluginInject] 提取 window.__INITIAL_STATE__ 失败", e);
            }
        }

        // 使用通用的重新注入数据提取机制
        console.log("[PluginInject] 检查 setupReloadDataExtraction 函数:", typeof setupReloadDataExtraction);
        console.log("[PluginInject] window.setupReloadDataExtraction:", typeof window.setupReloadDataExtraction);

        if (typeof setupReloadDataExtraction === 'function') {
            console.log("[PluginInject] 使用通用重新注入机制");
            setupReloadDataExtraction(() => {
                if (isTargetPage(window.location.href)) {
                    extractFromInitialState();
                }
            }, '拼多多数据提取');
        } else {
            console.log("[PluginInject] 使用降级处理机制");
            // 降级处理：如果没有通用机制，使用原来的逻辑
            if (isTargetPage(window.location.href)) {
                // 页面加载后延迟提取，确保数据已注入
                window.addEventListener('load', () => {
                    setTimeout(extractFromInitialState, 1000);
                });
            }
        }

        console.debug("[PluginInject] Other Inject Finished");
    };

    injectOtherHijack();

})();
