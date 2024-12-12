// background.js文件  


import { saveGoodsData, getStoreGoodsData, clearGoodsData } from './background/storage.js';


// 全局账号信息，从配置中获取
var _username = "";
var _password = "";


chrome.runtime.onInstalled.addListener(function () {
    console.log("Plugin installed.");
});


// 新增账号 服务
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("接收到消息：", request.action)
    // 添加账号
    if (request.action === "addAccount") {
        getAccountConfig().then((result) => {
            console.log(result)
            _username = result.username;
            _password = result.password;

            // 使用用户名和密码进行进一步的处理
            // ...
        }).catch((error) => {
            console.error("获取账号配置出错：", error)
        });
        sendResponse({ success: true, message: "账号配置已保存" })
        return true;
    }
})

// --------------------------------------- 商品数据采集 插件 --------------------------------------- //

// 脚本功能
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.debug("background：接收到消息：" + request.action, request, sender)

    if (request.action === "extractGoodData") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.error("没有找到当前活动的标签页");
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
                        console.error("注入脚本时出错：", chrome.runtime.lastError.message);
                        sendResponse({ success: false, message: "注入脚本失败" });
                    } else {
                        chrome.tabs.sendMessage(activeTab.id, request, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("发送消息时出错：", chrome.runtime.lastError.message);
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

    if (request.action === "injectContentScript") {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id, frameIds: [request.frameId] },
            files: ["scripts/content.js"],
        });
        sendResponse({ success: true });
    }

    if (request.action === "axiosResponseIntercepted") {
        console.log("[background]axiosResponseIntercepted:", request.data);

        saveGoodsData(request.data);
    }

    if (request.action === "getStoreGoodsData") {
        console.log("[background]getStoreGoodsData:", request);

        getStoreGoodsData(request.tag)
            .then((data) => {
                console.log("查询数据成功：", data)
                sendResponse(data);
            })
            .catch((error) => {
                console.error("查询数据出错：", error)
                sendResponse([]);
            });
        return true; // 表示异步响应
    }

    if (request.action === "saveGoodsInfoData") {
        console.log("[background]saveGoodsInfoData:", request);

        saveGoodsData(request.data)
            .then((data) => {
                console.log("保存数据成功：", data)
                sendResponse(data);
            })
            .catch((error) => {
                console.error("保存数据出错：", error)
                sendResponse([]);
            });
        return true; // 表示异步响应
    }

    if (request.action === "clearGoodsInfoData") {
        console.log("[background]clearGoodsInfoData:", request);

        clearGoodsData(request.tag)
            .then((data) => {
                console.log("清除数据成功：", data)
                sendResponse(data);
            })
            .catch((error) => {
                console.error("清除数据出错：", error)
                sendResponse([]);
            });
        return true; // 表示异步响应
    }
})



// --------------------------------------- 账号配置 --------------------------------------- //


// 获取账号配置
function getAccountConfig() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['QinceSimpleWork_credit'], function (result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.QinceSimpleWork_credit);
            }
        });
    })
}