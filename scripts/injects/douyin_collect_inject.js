
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
    const check = url.includes("douyin.com") || /(^\/aweme\/v1\/web\/tab\/feed)|douyin\.com\/aweme\/v1\/web\/tab\/feed/.test(url);;
    console.debug("[PluginInject] isTargetPage:", check);
    return check;
}


/**
 * is target page
 * 直接打开的小红书帖子页面
 * 
 * www.douyin.com/aweme/v1/web/aweme/post
 * 
 * @param {www.xiaohongshu.com/explore} url 
 * @returns 
 */
function isTargetPage2(url) {
    if (!url) {
        return false;
    }
    // 只匹配抖音 feed 接口，支持绝对路径和完整域名
    return /(^https:\/\/www\.douyin\.com\/aweme\/v1\/web\/tab\/feed)/.test(url)
        || /(\/aweme\/v1\/web\/tab\/feed)|(\/aweme\/v1\/web\/aweme\/detail)/.test(url)
        || /(\/aweme\/v1\/web\/aweme\/post)/.test(url);
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
        var success = false;
        // 存放提取的商品数据

        var pageUrl = window.location.href;
        if (pageUrl.endsWith('https://www.douyin.com/')) {
            // 如果是首页，直接返回
            pageUrl = aweme.share_url;
        }

        // 针对抖音 aweme_list 数据结构提取
        let aweme = null;

        if (dataSource && dataSource.aweme_list && Array.isArray(dataSource.aweme_list) && dataSource.aweme_list.length > 0) {
            aweme = dataSource.aweme_list[0];
        } else if (dataSource && dataSource.aweme_detail) {
            aweme = dataSource.aweme_detail;
        }

        if (pageUrl.startsWith("https://www.douyin.com/note/")) {
            // 图片链接

        }

        if (!aweme) {
            sendResponse({ success: false, message: "Not Found target data!" });
            return;
        }

        // 提取核心信息
        const goodInfo = {
            id: aweme.aweme_id,
            aweme_id: aweme.aweme_id,
            title: aweme.item_title || aweme.desc,
            desc: aweme.desc,
            author: {
                nickname: aweme.author?.nickname,
                avatar: aweme.author?.avatar_thumb?.url_list?.[0],
                uid: aweme.author?.uid,
                sec_uid: aweme.author?.sec_uid,
                user_id: aweme.author?.uid,
                unique_id: aweme.author?.unique_id,
            },
            cover: aweme.video?.cover?.url_list?.[0],
            video_urls: aweme.video?.play_addr?.url_list || [],
            duration: aweme.video?.duration,
            statistics: aweme.statistics,
            share_url: aweme.share_url,
            tags: aweme.text_extra?.map(t => t.hashtag_name) || [],
            url: pageUrl,
            raw: aweme,
        };
        success = true

        if (success == true) {
            sendResponse({ success: true, goodInfo });
        } else {
            sendResponse({ success: false, message: "Extracted goodInfo empty!" });
        }
    } catch (error) {
        sendResponse({ success: false, message: "Extract data failed" });
    }
}


function extractAndSaveGoodData(responseData) {
    extractGoodData(responseData, (sendResponse) => {
        if (sendResponse.success) {
            const goodInfo = sendResponse.goodInfo;
            const goodsInfo = {
                tag: 'douyin',
                goodsInfo: goodInfo
            }
            console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

            window.postMessage({
                type: 'extract-data-response',
                tag: 'douyin',
                goodInfo: goodInfo,
            }, "*");

        } else {
            console.info("[PluginInject] Plugin error:", sendResponse.message);
        }
    });
};





(function () {

    console.log("[PluginInject] [Target Website page] inject js, url:", window.location.href);
    if (window.__COLLECT_PLUGIN_INJECTED__) {
        // 已经注入过，直接返回
        return;
    }
    window.__COLLECT_PLUGIN_INJECTED__ = true;


    /**
     * Hijack XMLHttpRequest Request
     */
    const injectXHRHijack = () => {
        console.info("[PluginInject] XHR Inject - Start");
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            this._hijack_url = url;
            this._hijack_method = method;
            this._hijack_args = args;
            this._hijack_startTime = Date.now();

            console.log("[PluginInject] XHR.open:" + url, {
                method,
                url,
                args,
                // xhr: this
            });

            if (isTargetPage2(url)) {
                console.info("[PluginInject] XHR response: url" + this._hijack_url, { url, args, xhr: this });
                // 兼容 readyState 4
                this.addEventListener("readystatechange", function () {
                    console.log("[Hijack] readyState:", this.readyState, "status:", this.status);
                    if (this.readyState === 4) {
                        try {
                            console.info("[PluginInject] XHR readyState 4 event fired:", {
                                url: this._hijack_url,
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

                            extractAndSaveGoodData(responseData);

                        } catch (error) {
                            console.warn("[PluginInject] Parse XHR request Failed!:", error);
                        }
                    }
                });
                // 兼容 readyState 4
                this.onreadystatechange = function () {
                    console.log("[Hijack] readyState:", this.readyState, "status:", this.status);
                    if (this.readyState === 4) {
                        try {
                            console.info("[PluginInject] XHR readyState 4 event fired:", {
                                url: this._hijack_url,
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

                            extractAndSaveGoodData(responseData);

                        } catch (error) {
                            console.warn("[PluginInject] Parse XHR request Failed!:", error);
                        }
                    }
                };
                this.addEventListener("load", function () {
                    try {
                        console.info("[PluginInject] XHR load response:", {
                            url: this._hijack_url,
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


                        extractAndSaveGoodData(responseData);

                    } catch (error) {
                        console.warn("[PluginInject] Parse XHR request Failed!:", error);
                    }
                });
            }
            return originalOpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function (...args) {
            const url = this._hijack_url;
            const method = this._hijack_method;

            console.log("[PluginInject] XHR.send:", {
                url,
                method,
                args,
                // xhr: this
            });

            return originalSend.apply(this, args);
        };

        console.info("[PluginInject] XHR Inject - Done");
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
                extractAndSaveGoodData(state);
            } catch (e) {
                console.warn("[PluginInject] 提取 window.__INITIAL_STATE__ 失败", e);
            }
        }

        console.debug("[PluginInject] Other Url:", window.location.href);
        if (isTargetPage(window.location.href)) {
            console.info("[PluginInject] 当前页面为小红书详情页，尝试提取 window.__INITIAL_STATE__");
            // 页面加载后延迟提取，确保数据已注入
            window.addEventListener('load', () => {
                setTimeout(extractFromInitialState, 1000);
            });
        }

        console.debug("[PluginInject] Other Inject Finished");
    };

    // ---------------------------- start --------------------------- //

    injectXHRHijack(); // XHR

    injectOtherHijack(); // Other

    console.log("[PluginInject] [Target Website page] inject js finshed!");

})();
