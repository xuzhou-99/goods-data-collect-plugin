// storage.js

// 商品的链接，标题，店铺名，价格，销量
/*
var goodInfo = {
    // 店铺信息
    mallId: '',
    mallName: '',
    // 商品信息
    goodsName: '',
    goodsID: '',
    sideSalesTip: '',
    shareLink: '',
    goodsLink: "https://mobile.pinduoduo.com/goods.html?goods_id=",
};
*/

const goodsTag = {
    pdd: 'goodsData_pdd'
}

export function saveGoodsData(data) {
    return new Promise((resolve, reject) => {
        console.log("storeGoodsData", data);
        const tag = data.tag;
        const goodsInfo = data.goodsInfo;
        // 存储考勤数据到 chrome storage
        getStoreGoodsData(tag).then((goodsData) => {

            if (!goodsData) {
                goodsData = [];
            }
            var addFlag = true;
            for (var i = 0; i < goodsData.length; i++) {
                if (goodsData[i] && goodsData[i].goodsID == goodsInfo.goodsID) {
                    goodsData[i] = goodsInfo;
                    addFlag = false;
                    break;
                }
            }
            if (addFlag) {
                goodsData.push(goodsInfo);
                console.log("新增商品信息成功，goodId:", goodsInfo.goodsID);
            } else {
                console.log("更新商品信息成功，goodId:", goodsInfo.goodsID);
            }


            if (goodsData && goodsData.length > 0) {
                if (data.tag == 'pdd') {
                    chrome.storage.local.set({ goodsData_pdd: goodsData }, () => {
                        console.log("数据已存储到 localStorage，size:" + goodsData.length);
                        console.info("数据已存储到 localStorage，data:", goodsData);
                        resolve({ success: true });
                    });
                }
            }
        });
    })
}

export function clearGoodsData(tag) {
    return new Promise((resolve, reject) => {
        console.log("clearGoodsData tag:", tag);

        const goodsData = [];
        if (tag == 'pdd') {
            chrome.storage.local.set({ goodsData_pdd: goodsData }, () => {
                console.log("数据已存储到 localStorage，size:" + goodsData.length);
                resolve({ success: true });
            });
        }
    })
}

export function getStoreGoodsData(tag) {
    // 存储考勤数据到 chrome storage
    return new Promise((resolve, reject) => {
        if (tag == 'pdd') {
            chrome.storage.local.get(['goodsData_pdd'], function (result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    var data = result.goodsData_pdd;
                    if (!data) {
                        data = [];
                    }
                    resolve(data);
                }
            });
        }

    })
}