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
 * distinct flag
 * @type {boolean}
 * @default false
 * @description save data distinct
 */
const distinctFlag = false;

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


// 平台配置 - 定义各平台的列头和数据字段映射
const platformConfigs = {
    douyin: {
        name: "抖音",
        columns: ["标题", "链接", "用户名", "用户ID", "抖音号", "备注"],
        fields: ["title", "url", "author.nickname", "author.sec_uid", "author.unique_id", "statusExplain"],
        description: "采集抖音帖子信息，包括链接、标题、用户名、用户ID等"
    },
    kuaishou: {
        name: "快手",
        columns: ["标题", "链接", "用户名", "用户ID", "备注"],
        fields: ["title", "url", "author.nickname", "author.user_id", "statusExplain"],
        description: "采集快手帖子信息，包括链接、标题、用户名、用户ID、备注等"
    },
    pdd: {
        name: "拼多多",
        columns: ["链接", "商品名称", "店铺名称", "商品价格", "销量", "备注"],
        fields: ["goodsLink", "goodsName", "mallName", "goodsPrice", "goodsSales", "statusExplain"],
        description: "采集拼多多商品信息，商品的链接，标题，店铺名，价格，销量"
    },
    taobao: {
        name: "淘宝",
        columns: ["链接", "商品名称", "店铺名称", "商品价格", "销量", "备注"],
        fields: ["shareLink", "goodsName", "mallName", "goodsPrice", "goodsSales", "statusExplain"],
        description: "采集淘宝商品信息，包括链接、名称、店铺、价格、销量等"
    },
    tmall: {
        name: "天猫",
        columns: ["链接", "商品名称", "店铺名称", "商品价格", "销量", "备注"],
        fields: ["shareLink", "goodsName", "mallName", "goodsPrice", "goodsSales", "statusExplain"],
        description: "采集天猫商品信息，包括链接、名称、店铺、价格、销量等"
    },
    xhs: {
        name: "小红书",
        columns: ["标题", "链接", "用户名", "用户ID", "备注", "状态"],
        fields: ["title", "url", "author.nickname", "author.user_id", "note", "statusExplain"],
        description: "采集小红书帖子信息，包括标题、链接、作者信息等"
    }
};

export function getPlatformConfig(tag) {
    return new Promise((resolve) => {
        resolve(platformConfigs[tag] || null);
    });
}


/**
 * save goods data
 * @param {goodsInfo} data 
 * @returns 
 */
export function saveGoodsData(data) {
    return new Promise((resolve, reject) => {
        console.log("storeData", data);
        const tag = data.tag;
        const goodsInfo = data.goodsInfo || data.dataInfo;
        if (!goodsInfo) {
            reject({ success: false, message: "DataInfo is null" });
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
            if (distinctFlag || tag === 'douyin' || tag === 'xhs' || tag === 'kuaishou') {
                for (var i = 0; i < goodsData.length; i++) {
                    if (goodsData[i] && goodsData[i].goodsID && goodsInfo.goodsID && goodsData[i].goodsID == goodsInfo.goodsID) {
                        goodsData[i] = goodsInfo;
                        addFlag = false;
                        break;
                    }
                    // id may not exist, use id to distinct
                    if (goodsData[i] && goodsData[i].id && goodsInfo.id && goodsData[i].id == goodsInfo.id) {
                        goodsData[i] = goodsInfo;
                        addFlag = false;
                        break;
                    }
                }
            }

            if (addFlag) {
                goodsData.push(goodsInfo);
                console.log("DataInfo add, id:", goodsInfo.id || goodsInfo.goodsID);
            } else {
                console.log("DataInfo update, id:", goodsInfo.id || goodsInfo.goodsID);
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
        console.log("clearData tag:", tag);
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