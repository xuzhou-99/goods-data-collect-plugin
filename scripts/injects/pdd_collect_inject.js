

(function () {
    console.log("【GoodsCollector】Target Website page, inject js, url:", window.location.href);

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

            // 从页面提取数据逻辑
            let targetDoc;
            if (isTargetPage()) {
                targetDoc = document;
            }
            if (!targetDoc) {
                sendResponse({ success: false, message: "Not jump into target page!", });
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
                    sendResponse({ success: false, message: "Not Found target data!", });
                    return;
                }
                var goodInfoStr = goodInfoScripts[0].textContent.trim();
                goodInfoStr = goodInfoStr.replace('window.rawData=', '');
                if (goodInfoStr.endsWith(";")) {
                    goodInfoStr = goodInfoStr.substring(0, goodInfoStr.length - 1);
                }
                // console.log("goodInfoStr：", goodInfoStr);

                targetData = JSON.parse(goodInfoStr);
            }

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
            var webUrl = targetDoc.location.origin + targetDoc.location.pathname;
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

    const injectOtherHijack = () => {
        console.info("[PluginInject] Other Inject");

        extractGoodData('', (sendResponse) => {
            if (sendResponse.success) {
                const goodInfo = sendResponse.goodInfo;
                const goodsInfo = {
                    tag: 'pdd',
                    goodsInfo: goodInfo
                }
                console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

                window.postMessage({
                    type: 'extract-data-response',
                    tag: 'pdd',
                    goodInfo: goodInfo,
                }, "*");

            } else {
                console.info("[PluginInject] Plugin error:", sendResponse.message);
            }
        });

        console.debug("[PluginInject] Other Inject Finished");
    };

    injectOtherHijack();

})();
