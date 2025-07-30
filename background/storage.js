// storage.js

// 商品的链接，标题，店铺名，价格，销量
/*
var goodInfo = {
    // 排序
    tabOrder: '',
    // 店铺信息
    mallId: '',
    mallName: '',
    // 商品信息
    goodsName: '',
    goodsID: '',
    goodsSales: '',
    shareLink: '',
    goodsLink: '',
};
*/

/**
 * Goods data tag enum
 */
const goodsTag = {
    pdd: 'goodsData_pdd',// 拼多多
    xhs: 'goodsData_xhs', // 小红书
    taobao: 'goodsData_taobao',// 淘宝
    douyin: 'goodsData_douyin', // 抖音
    kuaishou: 'goodsData_kuaishou', // 快手
}


/**
 * distinct flag
 * @type {boolean}
 * @default false
 * @description save data distinct
 */
const distinctFlag = false;

/**
 * save goods data
 * @param {goodsInfo} data 
 * @returns 
 */
export function saveGoodsData(data) {
    return new Promise((resolve, reject) => {
        console.log("storeGoodsData", data);
        const tag = data.tag;
        const goodsInfo = data.goodsInfo || data.dataInfo;
        if (!goodsInfo) {
            reject({ success: false, message: "goodsInfo is null" });
            return;
        }
        if (!goodsTag[tag]) {
            reject({ success: false, message: "Tag not exist" });
            return;
        }
        // chrome storage
        getStoreGoodsData(tag).then((goodsData) => {

            if (!goodsData) {
                goodsData = [];
            }
            var addFlag = true;
            if (distinctFlag) {
                for (var i = 0; i < goodsData.length; i++) {
                    if (goodsData[i] && goodsData[i].goodsID && goodsInfo.goodsID && goodsData[i].goodsID == goodsInfo.goodsID) {
                        goodsData[i] = goodsInfo;
                        addFlag = false;
                        break;
                    }
                    // // id may not exist, use id to distinct
                    // if (goodsData[i] && goodsData[i].id && goodsInfo.id && goodsData[i].id == goodsInfo.id) {
                    //     goodsData[i] = goodsInfo;
                    //     addFlag = false;
                    //     break;
                    // }
                }
            }

            if (addFlag) {
                goodsData.push(goodsInfo);
                console.log("GoodInfo add，goodId:", goodsInfo.goodsID);
            } else {
                console.log("GoodInfo update，goodId:", goodsInfo.goodsID);
            }


            if (goodsData && goodsData.length > 0) {
                goodsData.sort(function (a, b) {
                    return a.tabOrder - b.tabOrder;
                });

                if (goodsTag[tag]) {
                    chrome.storage.local.set({ [goodsTag[tag]]: goodsData }, () => {
                        console.info("localStorage save success，tag:%s, database: %s, size:%s", tag, goodsTag[tag], goodsData.length);
                        console.info("localStorage, database: " + goodsTag[tag] + "data: ", goodsData);
                        resolve({ success: true });
                    });
                } else {
                    reject({ success: false, message: "Tag not exist" });
                }
            }
        });
    })
}

/**
 * clear goods data
 * @param {goods tag} tag 
 * @returns 
 */
export function clearGoodsData(tag) {
    return new Promise((resolve, reject) => {
        console.log("clearGoodsData tag:", tag);
        if (goodsTag[tag]) {
            chrome.storage.local.set({ [goodsTag[tag]]: [] }, () => {
                console.info("localStorage clear success，tag:%s, database: %s", tag, goodsTag[tag]);
                resolve({ success: true });
            });
        } else {
            resolve({ success: true });
        }
    })
}

/**
 * get goods data
 * @param {goods tag} tag 
 * @returns 
 */
export function getStoreGoodsData(tag) {
    // chrome storage
    return new Promise((resolve, reject) => {
        if (goodsTag[tag]) {
            chrome.storage.local.get([goodsTag[tag]], function (result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    var data = result[goodsTag[tag]];
                    if (!data) {
                        data = [];
                    } else {
                        data.sort(function (a, b) {
                            return a.tabOrder - b.tabOrder;
                        });
                    }
                    resolve(data);
                }
            });
        } else {
            resolve([]);
        }
    })
}