// background.js文件 

// 使用 storage.saveGoodsData(request.data) 的方式调用模块化方法
import * as storage from './background/storage.js';
import * as utils from './background/utils.js';


chrome.runtime.onInstalled.addListener(function () {
    console.log("Plugin installed.");
});


// --------------------------------------- 通用 插件(app=Sys) --------------------------------------- //
// 存储每个 tab 的序列号
let tabOrderMap = {};

// 标签页创建时，分配序列号
chrome.tabs.onCreated.addListener((tab) => {
    const tabId = tab.id;
    const sequenceNumber = utils.generateUniqueSequence(); // 生成唯一序列号
    tabOrderMap[tab.id] = sequenceNumber;
    console.log(`Tab ${tab.id} 分配序列号：${sequenceNumber}`);
});

// 标签页更新完成时，发送消息
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log(`Tab ${tabId} 更新状态：${changeInfo.status}`, changeInfo);
    if (changeInfo.status === 'complete' && tabOrderMap[tabId]) {
        const message = { action: "assignTabOrder", tabId: tabId, order: tabOrderMap[tabId] };
        chrome.tabs.sendMessage(tabId, message);
    }
});

// 监听 tab 的关闭事件，清理序列号
chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabOrderMap[tabId];
    console.log(`Tab ${tabId} 已关闭，序列号已移除`);
});

// 消息监听-通用
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.app !== "Sys") {
        return;
    }
    console.debug("Sys receive message:", request, sender)

    // 监听消息以返回序列号
    if (request.action === "getTabOrder") {
        const order = tabOrderMap[sender.tab.id];
        if (order) {
            sendResponse({ success: true, tabId: sender.tab.id, order: order });
        } else {
            sendResponse({ success: false, message: "序列号不存在" });
        }
        return true; // 异步响应
    }
});



// --------------------------------------- 商品数据采集 插件 --------------------------------------- //

// 消息监听-商品数据采集
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.app !== "GoodsCollect") {
        return;
    }
    console.debug("GoodsCollect receive message:", request, sender)


    // 注入脚本
    if (request.action === "injectContentScript") {
        console.log("[background] injectContentScript:", request);
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id, frameIds: [request.frameId] },
            files: ["scripts/content.js"],
        });
        sendResponse({ success: true });
    }

    // 提取商品数据
    if (request.action === "extractGoodData") {
        console.log("[background] extractGoodData:", request);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.info("没有找到当前活动的标签页");
                sendResponse({ success: false, message: "未找到活动标签页" });
                return;
            }

            const activeTab = tabs[0];
            console.log("当前活动页面：", activeTab);

            chrome.scripting.executeScript(
                {
                    target: { tabId: activeTab.id },
                    files: ['scripts/content.js'], // 确保路径正确
                },
                () => {
                    if (chrome.runtime.lastError) {
                        console.info("注入脚本时出错：", chrome.runtime.lastError.message);
                        sendResponse({ success: false, message: "注入脚本失败" });
                    } else {
                        chrome.tabs.sendMessage(activeTab.id, request, (response) => {
                            if (chrome.runtime.lastError) {
                                console.info("发送消息时出错：", chrome.runtime.lastError.message);
                                sendResponse({ success: false, message: "发送消息失败" });
                            } else {
                                sendResponse(response);
                            }
                        });
                    }
                }
            );
        });

        return true; // 表示异步响应
    }


    // 获取商品数据
    if (request.action === "getStoreGoodsData") {
        console.log("[background] getStoreGoodsData:", request);

        storage.getStoreGoodsData(request.tag)
            .then((data) => {
                console.log("查询数据成功：", data)
                sendResponse(data);
            })
            .catch((error) => {
                console.info("查询数据出错：", error)
                sendResponse([]);
            });
        return true; // 表示异步响应
    }


    // 保存商品信息
    if (request.action === "saveGoodsInfoData") {
        console.log("[background] saveGoodsInfoData:", request);

        storage.saveGoodsData(request.data)
            .then((data) => {
                console.log("保存数据成功：", data)
                sendResponse(data);
            })
            .catch((error) => {
                console.info("保存数据出错：", error)
                sendResponse(error);
            });
        return true; // 表示异步响应
    }

    // 清除商品信息
    if (request.action === "clearGoodsInfoData") {
        console.log("[background] clearGoodsInfoData:", request);

        storage.clearGoodsData(request.tag)
            .then((data) => {
                console.log("清除数据成功：", data)
                sendResponse(data);
            })
            .catch((error) => {
                console.info("清除数据出错：", error)
                sendResponse(error);
            });
        return true; // 表示异步响应
    }
})

// 存储请求和响应数据
const requestDetailsMap = new Map();

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        console.log("Script request detected:", details);
        if (details && details.url) {
            if (details.url.includes("mtop.taobao.pcdetail.data.get")) {
                // 存储请求详情
                requestDetailsMap.set(details.requestId, details);
            }
        }

    },
    { urls: ["*://h5api.m.tmall.com/*"], types: ["script"] }
);


// 监听 script 响应
chrome.webRequest.onCompleted.addListener(
    function (details) {
        console.log("Script response completed:", details);
        if (requestDetailsMap.has(details.requestId)) {
            // 获取请求详情
            const requestDetails = requestDetailsMap.get(details.requestId);
            requestDetailsMap.delete(details.requestId);

            // 使用 declarativeNetRequest 获取响应内容
            chrome.declarativeNetRequest.getMatchedRules({ requestId: details.requestId }, (matchedRules) => {
                if (matchedRules.rulesMatchedInfo.length > 0) {
                    const responseBody = matchedRules.rulesMatchedInfo[0].rule.condition.urlFilter;
                    console.log("Script response body:", responseBody);

                    // 将请求和响应详情发送给内容脚本
                    chrome.tabs.sendMessage(details.tabId, {
                        type: "script-response",
                        requestDetails: requestDetails,
                        responseBody: responseBody
                    });
                }
            });
        }
    },
    { urls: ["*://h5api.m.tmall.com/*"], types: ["script"] }
);


// --------------------------------------- 账号 插件 --------------------------------------- //


// --------------------------------------- 账号配置 --------------------------------------- //



// --------------------------------------- 通用工具 --------------------------------------- //

let lastTimestamp = ""; // 上次生成的时间前缀
let sequenceCounter = 0; // 毫秒内的计数器

/**
 * 获取带毫秒的日期前缀 + 计数器
 * 格式：yyyyMMddHHmmssSSS + 自增序列号
 * @returns {string}
 */
function generateUniqueSequence() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const SSS = String(now.getMilliseconds()).padStart(3, "0");

    // 当前时间前缀（精确到毫秒）
    const currentTimestamp = `${yyyy}${MM}${dd}${HH}${mm}${ss}${SSS}`;

    // 如果是同一毫秒，递增计数器；否则重置计数器
    if (currentTimestamp === lastTimestamp) {
        sequenceCounter += 1;
    } else {
        lastTimestamp = currentTimestamp;
        sequenceCounter = 1;
    }

    // 格式化计数器（例如 0001）
    const sequenceNumber = String(sequenceCounter).padStart(4, "0");

    return `${currentTimestamp}${sequenceNumber}`;
}