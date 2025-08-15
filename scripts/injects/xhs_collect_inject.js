

(function () {

    console.log("[PluginInject] [Target Website page] inject js, url:", window.location.href);
    // // 如果是 reload 模式，强制重新执行（即使标记存在）
    // const isReloadMode = window.__COLLECT_PLUGIN_RELOAD__ === true;

    // if (window.__COLLECT_PLUGIN_INJECTED__ && !isReloadMode) {
    //     console.log("[PluginInject] Plugin already injected, skip this time.");
    //     return;
    // }

    // // 标记为已注入（如果是 reload 模式，稍后会被重置）
    // window.__COLLECT_PLUGIN_INJECTED__ = true;
    // window.__COLLECT_PLUGIN_RELOAD__ = false; // 重置 reload 标记

    /**
     * is target page
     * 小红书主页或者接口页面
     * 
     * @param {*} url 
     * @returns 
     */
    function isTargetPageRequest(url) {
        if (!url) {
            return false;
        }
        const check = url.includes("api/sns/web/v1/feed");
        console.debug("[PluginInject] isTargetPage:", check);
        return check;
    }

    /**
     * is target page
     * 直接打开的小红书帖子页面
     * 
     * @param {www.xiaohongshu.com/explore} url 
     * @returns 
     */
    function isTargetPageUrl(url) {
        if (!url) {
            return false;
        }
        const check = url.includes("www.xiaohongshu.com/explore");
        console.debug("[PluginInject] isTargetPage:", check);
        return check;
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


    /**
    * extract data-taobao
    * @param {*} sendResponse 
    * @returns 
    */
    function extractGoodData(dataSource, sendResponse) {
        console.log("[PluginInject] Start to extract goods data...");
        console.debug("[PluginInject] Sourcedata:", dataSource);

        try {
            const pageUrl = window.location.href;
            let itemObj;
            var success = false;

            // 1. 判断是否为接口格式
            if (dataSource && dataSource.data && Array.isArray(dataSource.data.items)) {
                // 接口返回格式
                const items = dataSource.data.items.map(item => {
                    const card = item.note_card || item; // 兼容 note_card 或直接 note
                    return {
                        id: card.note_id || card.noteId || card.id,
                        note_id: card.note_id || card.noteId || card.id,
                        title: card.title,
                        desc: card.desc,
                        author: card.user ? {
                            user_id: card.user.user_id || card.user.userId,
                            nickname: card.user.nickname,
                            avatar: card.user.avatar
                        } : {},
                        images: (card.image_list || card.imageList || []).map(img => img.url_default || img.urlDefault || img.url_pre || img.urlPre || img.url),
                        tags: (card.tag_list || card.tagList || []).map(tag => tag.name),
                        liked_count: card.interact_info?.liked_count || card.interactInfo?.likedCount,
                        comment_count: card.interact_info?.comment_count || card.interactInfo?.commentCount,
                        share_count: card.interact_info?.share_count || card.interactInfo?.shareCount,
                        time: card.time,
                        url: pageUrl,
                        raw: item
                    };
                });
                itemObj = items[0];
                success = true;
            }
            // 2. 判断是否为 __INITIAL_STATE__ 格式
            else if (
                dataSource &&
                dataSource.note &&
                dataSource.note.noteDetailMap &&
                typeof dataSource.note.noteDetailMap === "object"
            ) {
                const noteIds = Object.keys(dataSource.note.noteDetailMap);
                if (noteIds.length === 0) {
                    sendResponse({ success: false, message: "Not Found noteDetailMap!" });
                    return;
                }
                const noteDetail = dataSource.note.noteDetailMap[noteIds[0]];
                const note = noteDetail.note;
                itemObj = {
                    id: note.noteId || note.id,
                    note_id: note.noteId || note.id,
                    title: note.title,
                    desc: note.desc,
                    author: note.user ? {
                        user_id: note.user.userId,
                        nickname: note.user.nickname,
                        avatar: note.user.avatar
                    } : {},
                    images: (note.imageList || []).map(img => img.urlDefault || img.urlPre || img.url),
                    tags: (note.tagList || []).map(tag => tag.name),
                    liked_count: note.interactInfo?.likedCount,
                    comment_count: note.interactInfo?.commentCount,
                    share_count: note.interactInfo?.shareCount,
                    time: note.time,
                    url: pageUrl,
                    raw: note
                };
                success = true;
            }

            if (success == true) {
                const goodInfo = itemObj;
                sendResponse({ success: true, goodInfo });
            } else {
                sendResponse({ success: false, message: "Empty Data!" });
            }

        } catch (error) {
            sendResponse({ success: false, message: "Extract data failed" });
        }
    }


    /**
     * Hijack XMLHttpRequest Request
     */
    const injectXHRHijack = () => {
        console.info("[PluginInject] XHR Inject");
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;


        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            // console.debug("[PluginInject] XHR request:", { method, url, args, xhr: this });
            this._xhs_hijack_url = url; // 保存url到实例
            this._xhs_hijack_method = method;
            return originalOpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function (...args) {
            // console.debug("[PluginInject] XHR response:", { url: this._xhs_hijack_url, args, xhr: this });
            if (isTargetPageRequest(this._xhs_hijack_url)) {
                console.info("[PluginInject] XHR response: url" + this._xhs_hijack_url, { url: this._xhs_hijack_url, args, xhr: this });
                // 兼容 readyState 4
                this.addEventListener("readystatechange", function () {
                    if (this.readyState === 4) {
                        try {
                            console.info("[PluginInject] XHR readyState 4 event fired:", {
                                url: this._xhs_hijack_url,
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

                            extractAndSaveGoodData('xhs', responseData);

                        } catch (error) {
                            console.warn("[PluginInject] Parse XHR request Failed!:", error);
                        }
                    }
                });
                this.addEventListener("load", function () {
                    try {
                        console.info("[PluginInject] XHR load response:", {
                            url: this._xhs_hijack_url,
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


                        extractAndSaveGoodData('xhs', responseData);

                    } catch (error) {
                        console.warn("[PluginInject] Parse XHR request Failed!:", error);
                    }
                });
            }
            return originalSend.apply(this, args);
        };
    };



    /**
     * Hijack web page to extract data
     */
    const injectOtherHijack = () => {
        console.info("[PluginInject] Other Inject");

        // 仅在详情页等 document 请求时尝试提取 window.__INITIAL_STATE__
        function extractFromInitialState() {
            console.info("[PluginInject] 当前页面为小红书详情页，尝试提取 window.__INITIAL_STATE__");
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
                extractAndSaveGoodData('xhs', state);
            } catch (e) {
                console.warn("[PluginInject] 提取 window.__INITIAL_STATE__ 失败", e);
            }
        }

        // 使用通用的重新注入数据提取机制
        console.log("[PluginInject] 检查 setupReloadDataExtraction 函数:", typeof setupReloadDataExtraction);
        console.log("[PluginInject] window.setupReloadDataExtraction:", typeof window.setupReloadDataExtraction);


        if (isTargetPageUrl(window.location.href)) {
            if (typeof setupReloadDataExtraction === 'function') {
                console.log("[PluginInject] 使用通用重新注入机制");
                setupReloadDataExtraction(() => {
                    extractFromInitialState();
                }, '小红书数据提取');
            } else {
                console.log("[PluginInject] 使用降级处理机制");
                // 降级处理：如果没有通用机制，使用原来的逻辑
                // 页面加载后延迟提取，确保数据已注入
                window.addEventListener('load', () => {
                    setTimeout(extractFromInitialState, 1000);
                });
            }
        }

        console.info("[PluginInject] Other Inject Finished");
    };

    // ---------------------------- start --------------------------- //


    injectXHRHijack(); // XHR

    injectOtherHijack(); // Other

    console.log("[PluginInject] [Target Website page] inject js finshed!");

})();




