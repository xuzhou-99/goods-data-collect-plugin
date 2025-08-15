
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
    console.log("[PluginInject] Start to extract data...");
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


function extractAndSaveGoodData(type, responseData) {
    extractGoodData(responseData, (sendResponse) => {
        if (sendResponse.success) {
            const goodInfo = sendResponse.goodInfo;
            const goodsInfo = {
                tag: type,
                goodsInfo: goodInfo
            }
            console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

            window.postMessage({
                type: 'extract-data-response',
                tag: type,
                goodInfo: goodInfo,
            }, "*");

        } else {
            console.info("[PluginInject] Plugin error:", sendResponse.message);
        }
    });
};





(function () {

    console.log("[PluginInject] [Target Website page] inject js, url:", window.location.href);
    // 如果是 reload 模式，强制重新执行（即使标记存在）
    const isReloadMode = window.__COLLECT_PLUGIN_RELOAD__ === true;

    if (window.__COLLECT_PLUGIN_INJECTED__ && !isReloadMode) {
        console.log("[PluginInject] Plugin already injected, skip this time.");
        return;
    }

    // 标记为已注入（如果是 reload 模式，稍后会被重置）
    window.__COLLECT_PLUGIN_INJECTED__ = true;
    window.__COLLECT_PLUGIN_RELOAD__ = false; // 重置 reload 标记

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
                        console.debug("[PluginInject] Hijack Axios url:" + responseData.config.url + "response:", responseData);

                        // todo: extract data
                        extractAndSaveGoodData('Tag', responseData);

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
                    extractAndSaveGoodData('Tag', responseData);
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
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;


        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            console.debug("[PluginInject] XHR request:", { method, url, args, xhr: this });
            this._demo_url = url; // 保存url到实例
            this._xhs_hijack_method = method;
            return originalOpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function (...args) {
            console.debug("[PluginInject] XHR response:", { url: this._demo_url, args, xhr: this });
            if (isTargetPage(this._demo_url)) {
                console.info("[PluginInject] XHR response: url" + this._demo_url, { url: this._demo_url, args, xhr: this });
                // 兼容 readyState 4
                this.addEventListener("readystatechange", function () {
                    if (this.readyState === 4) {
                        try {
                            console.info("[PluginInject] XHR readyState 4 event fired:", {
                                url: this._demo_url,
                                status: this.status,
                                responseType: this.responseType,
                                responseText: this.responseText,
                                response: this.response
                            });

                            let responseData = null;
                            try {
                                if (this.responseType === "" || this.responseType === "text") {
                                    responseData = JSON.parse(this.responseText);
                                } else if (this.responseType === "json") {
                                    responseData = this.response;
                                }
                                console.info("[PluginInject] Parsed XHR response:", responseData);
                            } catch (e) {
                                console.warn("[PluginInject] response is not valid JSON");
                            }

                            extractAndSaveGoodData('Tag', responseData);

                        } catch (error) {
                            console.warn("[PluginInject] Parse XHR request Failed!:", error);
                        }
                    }
                });
                this.addEventListener("load", function () {
                    try {
                        console.info("[PluginInject] XHR load response:", {
                            url: this._demo_url,
                            status: this.status,
                            responseType: this.responseType,
                            responseText: this.responseText,
                            response: this.response
                        });


                        let responseData = null;
                        try {
                            if (this.responseType === "" || this.responseType === "text") {
                                responseData = JSON.parse(this.responseText);
                            } else if (this.responseType === "json") {
                                responseData = this.response;
                            }
                            // 其它类型可根据实际情况处理
                            console.info("[PluginInject] XHR Parsed response:", responseData);
                        } catch (e) {
                            console.warn("[PluginInject] response is not valid JSON");
                        }


                        extractAndSaveGoodData('Tag', responseData);

                    } catch (error) {
                        console.warn("[PluginInject] Parse XHR request Failed!:", error);
                    }
                });
            }
            return originalSend.apply(this, args);
        };
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
                    console.debug(`[PluginInject] Hijack JSONP ${callbackName}:`, res);

                    if (res && res.api == 'mtop.taobao.pcdetail.data.get') {
                        console.debug("[PluginInject] Hijack JSONP response:", res);

                        extractAndSaveGoodData('Tag', res);
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
        const observer = new MutationObserver((mutationsList) => {
            // 这里可以根据实际页面结构提取你需要的信息
            const html = document.documentElement.innerHTML;
            console.debug("[PluginInject] JSONP MutationObserver HTML:", html);

            for (const key in window) {
                if (callbackPattern.test(key) && !originalCallbacks[key]) {
                    rewriteJSONPCallback(key);
                }
            }
        });

        observer.observe(document, { childList: true, subtree: true });
    };

    /**
     * Hijack web page to extract data
     */
    const injectOtherHijack = () => {
        console.info("[PluginInject] Other Inject");

        // 仅在详情页等 document 请求时尝试提取 window.__INITIAL_STATE__
        function extractFromInitialState() {
            try {
                let state;
                if (window.__INITIAL_STATE__) {
                    state = window.__INITIAL_STATE__;
                } else {
                    const script = document.querySelector('script#__INITIAL_STATE__');
                    if (script) {
                        state = JSON.parse(script.textContent);
                    }
                }
                console.log("[PluginInject] 页面window.__INITIAL_STATE__提取成功", state);
                extractAndSaveGoodData('Tag', state);
            } catch (e) {
                console.warn("[PluginInject] 提取 window.__INITIAL_STATE__ 失败", e);
            }
        }

        console.debug("[PluginInject] Other Url:", window.location.href);
        if (isTargetPage(window.location.href)) {
            console.info("[PluginInject] 当前页面为示例页面，尝试提取 window.__INITIAL_STATE__");
            
            // 使用通用的重新注入数据提取机制
            if (typeof setupReloadDataExtraction === 'function') {
                setupReloadDataExtraction(extractFromInitialState, '示例数据提取');
            } else {
                // 降级处理：如果没有通用机制，使用原来的逻辑
                window.addEventListener('load', () => {
                    setTimeout(extractFromInitialState, 1000);
                });
            }
        }

        console.debug("[PluginInject] Other Inject Finished");
    };

    // ---------------------------- start --------------------------- //

    injectFetchHijack();// Fetch

    injectXHRHijack(); // XHR

    injectAxiosHijack(); // Axios

    injectJSONPHijack(); // JSONP

    injectOtherHijack(); // Other

    console.log("[PluginInject] [Target Website page] inject js finshed!");

})();
