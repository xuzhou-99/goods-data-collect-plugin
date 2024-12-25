/**
 * 数据获取
 */
const injectGoodsCollectHijack = () => {

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

    /**
     * 提取数据-PDD
     * @param {*} sendResponse 
     * @returns 
     */
    function extractPddGoodData(sendResponse) {
        console.log("接收到提取商品数据消息，开始提取")

        try {
            // 从页面提取数据逻辑
            let targetDoc;
            if (isPinduoduoPage()) {
                targetDoc = document;
            }
            if (!targetDoc) {
                sendResponse({ success: false, message: "未进入到指定页面", });
                return;
            }

            const goodInfoJson = window.rawData;
            if (!goodInfoJson) {
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

                goodInfoJson = JSON.parse(goodInfoStr);
            }

            console.log("goodInfoJson：", goodInfoJson);
            if (!goodInfoJson) {
                sendResponse({ success: false, message: "数据未找到", });
                return;
            }

            var webUrl = targetDoc.location.origin + targetDoc.location.pathname;
            if (!webUrl) {
                webUrl = "https://mobile.pinduoduo.com/goods.html";
            }

            // 存放提取的商品数据
            var goodInfo = {
                // tabOrder: currentTabOrder, // 附带序列号
            };
            if (goodInfoJson && goodInfoJson.store && goodInfoJson.store.initDataObj) {
                // 商品的链接，标题，店铺名，价格，销量
                const store = goodInfoJson.store;
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
            }

            sendResponse({ success: true, goodInfo });
        } catch (error) {
            sendResponse({ success: false, message: "提取数据失败" });
        }
    }

    console.log("【GoodsCollector】 Extracting data from Pinduoduo page");

    // 提取数据
    extractPddGoodData((response) => {
        if (response.success) {
            const goodInfo = response.goodInfo;
            const goodsInfo = {
                tag: 'pdd',
                goodsInfo: goodInfo
            }
            console.log("提取数据成功，发送消息至页面", goodsInfo);

            // chrome.runtime.sendMessage({ action: "saveGoodsInfoData", data: goodsInfo }, (response) => {
            //     console.log("保存数据：", response);
            //     if (response.success) {
            //         // alert("数据已保存");
            //         console.log("数据已保存");
            //     } else {
            //         // alert("数据保存失败：" + response.message);
            //         console.log("数据保存失败：" + response.message);
            //     }

            // });


            // 将数据发送给 content.js
            window.postMessage({
                type: "extract-data-response",
                tag: "pdd",
                goodInfo: goodInfo,
            }, "*");

        } else {
            console.error("提取数据失败", response.message);
        }
    });

    console.log("【GoodsCollector】 Extracting data Finished");


};

(function () {
    console.log("【GoodsCollector】 检测到进入目标页面, 开始注入脚本, url:" + window.location.href);

    injectGoodsCollectHijack("scripts/goodscollect_inject.js");

})();
