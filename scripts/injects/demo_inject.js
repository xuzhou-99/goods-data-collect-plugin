
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
    const check = url.includes("targetPage_url");
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
    // console.debug("[PluginInject] Sourcedata:", dataSource);

    try {

        // todo: extract data

        var success = false;
        const targetData = '';
        console.log("[PluginInject] targetData:", targetData);
        if (!targetData) {
            sendResponse({ success: false, message: "Not Found target data!", });
            return;
        }

        var goodInfo = {

        };

        if (success == true) {
            sendResponse({ success: true, goodInfo });
        } else {
            sendResponse({ success: false, message: "Empty Data!" });
        }


    } catch (error) {
        sendResponse({ success: false, message: "Extract data failed" });
    }
}



/**
 * Hijack Axios Request
 */
const injectAxiosHijack = () => {
    console.info("[PluginInject] Axios Inject");
    // check axios exist
    if (window.axios) {
        // backip axios
        const originalAxios = window.axios;
        console.debug("[PluginInject] Hijack Axios:", originalAxios);

        // add interceptors
        originalAxios.interceptors.response.use(
            function (responseData) {
                if (isTargetPage(responseData.config.url)) {
                    console.debug("[PluginInject] Hijack Axios response:", responseData);

                    // todo: extract data

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
                            const goodsInfo = {
                                tag: 'Tag',
                                goodsInfo: goodInfo
                            }
                            console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

                            window.postMessage({
                                type: 'extract-data-response',
                                tag: 'Tag',
                                goodInfo: goodInfo,
                            }, "*");

                        } else {
                            console.info("[PluginInject] Extract error:", sendResponse.message);
                        }
                    });

                }
                return responseData;
            },
            function (error) {
                return Promise.reject(error);
            }
        );
    }
}

/**
 * Hijack Fetch Request
 */
const injectFetchHijack = () => {
    console.info("[PluginInject] Fetch Inject");
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        console.debug("[PluginInject] Hijack Fetch Request: ", args);
        const response = await originalFetch.apply(this, args);
        const clonedResponse = response.clone();

        if (isTargetPage(args[0])) {
            clonedResponse.json().then((responseData) => {
                console.debug("[PluginInject] Hijack Fetch response:", responseData);

                // todo: extract data

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
                        const goodsInfo = {
                            tag: 'Tag',
                            goodsInfo: goodInfo
                        }
                        console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

                        window.postMessage({
                            type: 'extract-data-response',
                            tag: 'Tag',
                            goodInfo: goodInfo,
                        }, "*");

                    } else {
                        console.info("[PluginInject] Plugin error:", sendResponse.message);
                    }
                });
            });
        }
        return response;
    };
};


/**
 * Hijack XMLHttpRequest Request
 */
const injectXHRHijack = () => {
    console.info("[PluginInject] XHR Inject");
    const originalXHR = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        // console.debug("[PluginInject] Hijack XHR url:", url);
        if (isTargetPage(url)) {
            // console.debug("[PluginInject] Hijack XHR url:", url);
            this.addEventListener("load", function () {
                try {
                    var userInfo;
                    if (this.__sentry_xhr_v3__) {
                        var requestBody = this.__sentry_xhr_v3__.body;
                        if (requestBody) {
                            const requestBodyJson = JSON.parse(requestBody);
                            console.debug("[PluginInject] Hijack XHR request:", requestBodyJson);

                        }
                    }
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
                            const goodsInfo = {
                                tag: 'Tag',
                                goodsInfo: goodInfo
                            }
                            console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

                            window.postMessage({
                                type: 'extract-data-response',
                                tag: 'Tag',
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

/**
 * Hijack web page to extract data
 */
const injectOtherHijack = () => {
    console.info("[PluginInject] Other Inject");

    extractGoodData('', (sendResponse) => {
        if (sendResponse.success) {
            const goodInfo = sendResponse.goodInfo;
            const goodsInfo = {
                tag: 'tag',
                goodsInfo: goodInfo
            }
            console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

            window.postMessage({
                type: 'extract-data-response',
                tag: 'Tag',
                goodInfo: goodInfo,
            }, "*");

        } else {
            console.info("[PluginInject] Plugin error:", sendResponse.message);
        }
    });

    console.debug("[PluginInject] Other Inject Finished");
};

(function () {

    console.log("[PluginInject] [Target Website page] inject js, url:", window.location.href);

    injectFetchHijack();// Fetch

    injectXHRHijack(); // XHR

    injectAxiosHijack(); // Axios

    injectOtherHijack(); // Other

    console.log("[PluginInject] [Target Website page] inject js finshed!");

})();
