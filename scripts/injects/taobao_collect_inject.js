
(function () {

    console.log("[PluginInject] [Taobao] inject js, url:", window.location.href);


    function isTargetPage(url) {
        if (!url) {
            return false;
        }

        const check = url.includes("mtop.taobao.pcdetail.data.get");
        console.log("[PluginInject] isTargetPage:", check);
        return check;
    }


    function extractGoodData(dataSource, sendResponse) {
        console.log("[PluginInject]Start to extract goods data...");
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


    const injectXHRHijack = () => {
        console.info("[PluginInject] XHR Inject");
        const originalXHR = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            console.debug("[PluginInject] Hijack XHR url:", url);
            if (isTargetPage(url)) {
                // console.debug("[PluginInject] Hijack XHR url:", url);
                this.addEventListener("load", function () {
                    try {
                        const responseData = JSON.parse(this.responseText);
                        console.debug("[PluginInject] Hijack XHR response:", responseData);

                        // if (responseData && responseData.data) {
                        //     // send message to content.js
                        //     window.postMessage({
                        //         type: 'extract-data-response',
                        //         data: responseData.data,
                        //         userInfo: userInfo,
                        //     }, "*");
                        // }

                        extractGoodData(responseData, (sendResponse) => {
                            if (sendResponse.success) {
                                const goodInfo = sendResponse.goodInfo;
                                goodInfo.pSource = 'taobao';
                                const goodsInfo = {
                                    tag: 'taobao',
                                    goodsInfo: goodInfo
                                }
                                console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

                                // send message to content.js
                                window.postMessage({
                                    type: 'extract-data-response',
                                    tag: 'taobao',
                                    goodInfo: goodInfo,
                                }, "*");

                            } else {
                                console.info("[PluginInject] Plugin error:", sendResponse.message);
                            }
                        });

                    } catch (error) {
                        console.warn("[PluginInject] Parse XHR request Failed!:", error);
                    }
                });
            }
            return originalXHR.apply(this, [method, url, ...args]);
        };
    };


    // ---------------------------- start --------------------------- //

    injectXHRHijack(); // XHR


    console.log("[PluginInject] [Taobao] inject js finshed!");

})();
