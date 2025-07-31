
(function () {

    console.log("[PluginInject] [Tmall] inject js, url:", window.location.href);


    /**
     * is target page
     * 
     * @param {*} url 
     * @returns 
     */
    function isTargetPage(url) {
        if (!url) {
            return false;
        }

        // todo: targetPage_url regex
        const check = url.includes("mtop.taobao.pcdetail.data.get");
        console.debug("[PluginInject] isTargetPage:", check);
        return check;
    }

    /**
    * extract data-taobao
    * @param {*} sendResponse 
    * @returns 
    */
    function extractGoodData(dataSource, sendResponse) {
        console.log("[PluginInject] Start to extract goods data...");
        console.debug("[PluginInject] Sourcedata:", dataSource);

        try {

            // todo: extract data

            var success = false;
            const targetData = dataSource;
            console.log("[PluginInject] targetData:", targetData);
            if (!targetData) {
                sendResponse({ success: false, message: "Not Found target data!", });
                return;
            }

            // 存放提取的商品数据
            var goodInfo = {
                // tabOrder: currentTabOrder, // 附带序列号
                goodsName: "", // 商品名称
                goodsID: "", // 商品ID
                goodsLink: "", // 商品链接
                goodsPrice: "", // 商品价格
                goodsSales: "", // 商品销量
                shareLink: "", // 分享链接
                statusExplain: "", // 状态说明

                mallId: "", // 店铺ID
                mallName: "", // 店铺名称
            };
            if (targetData && targetData.data) {
                // 商品的链接，标题，店铺名，价格，销量
                const initDataObj = targetData.data;
                // 店铺信息
                const seller = initDataObj.seller;
                if (seller) {
                    goodInfo.mallId = seller.mallId;
                    goodInfo.mallName = seller.shopName;
                }

                // 商品信息
                const item = initDataObj.item;
                if (item) {
                    goodInfo.id = item.itemId;
                    goodInfo.goodsName = item.title;
                    goodInfo.goodsID = item.itemId;
                    goodInfo.goodsLink = item.qrCode;
                    goodInfo.shareLink = item.qrCode;
                }

                const componentsVO = initDataObj.componentsVO;
                if (componentsVO && componentsVO.priceVO && componentsVO.priceVO.price) {
                    goodInfo.goodsPrice = componentsVO.priceVO.price.priceText;
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

    function extractAndSaveGoodData(responseData) {
        extractGoodData(responseData, (sendResponse) => {
            if (sendResponse.success) {
                const goodInfo = sendResponse.goodInfo;
                goodInfo.pSource = 'Tmall';
                const goodsInfo = {
                    tag: 'taobao',
                    goodsInfo: goodInfo
                }
                console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

                window.postMessage({
                    type: 'extract-data-response',
                    tag: 'taobao',
                    goodInfo: goodInfo,
                }, "*");

            } else {
                console.info("[PluginInject] Plugin error:", sendResponse.message);
            }
        });
    };

    /**
    * Hijack JSONP Request
    */
    const injectJSONPHijack = () => {
        console.info("[PluginInject] JSONP Inject");

        const originalCallbacks = {};

        // rewrite JSONP callback
        const rewriteJSONPCallback = (callbackName) => {
            if (window[callbackName] && typeof window[callbackName] === 'function') {
                originalCallbacks[callbackName] = window[callbackName];
                window[callbackName] = function (res) {
                    // console.debug(`[PluginInject] Hijack JSONP ${callbackName}:`, res);

                    if (res && isTargetPage(res.api)) {
                        console.debug("[PluginInject] Hijack JSONP response:", res);

                        extractAndSaveGoodData(res);
                    }

                    // call original callback
                    originalCallbacks[callbackName](res);
                };
            }
        };

        // all JSONP callback function
        const callbackPattern = /^mtopjsonppcdetail\d+$/;
        for (const key in window) {
            if (callbackPattern.test(key)) {
                rewriteJSONPCallback(key);
            }
        }

        // add JSONP observer
        const observer = new MutationObserver(() => {
            for (const key in window) {
                if (callbackPattern.test(key) && !originalCallbacks[key]) {
                    rewriteJSONPCallback(key);
                }
            }
        });

        observer.observe(document, { childList: true, subtree: true });
    };


    // ---------------------------- start --------------------------- //

    injectJSONPHijack(); // JSONP

    console.log("[PluginInject] [Tmall] inject js finshed!");

})();
