
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
    const check = url.includes("kuaishou.com");
    console.debug("[PluginInject] isTargetPage:", check);
    return check;
}


/**
 * is target url
 * 
 * @param {www.xiaohongshu.com/explore} url 
 * @returns 
 */
function isTargetUrl(url) {
    if (!url) {
        return false;
    }
    // 只匹配 short-video 接口，支持绝对路径和完整域名
    // https://www.kuaishou.com/short-video/
    return url && (
        url.includes('/graphql') ||
        url.includes('/api/') ||
        url.includes('/rest/') ||
        url.includes('/short-video/')
    );
}

/**
* extract data-taobao
* @param {*} dataSource 
* @param {*} sendResponse 
* @returns 
*/
function extractGoodData(dataSource, sendResponse) {
    console.log("[PluginInject] Start to extract data...");
    // console.debug("[PluginInject] Sourcedata:", dataSource);

    try {

        var success = false;
        // 存放提取的商品数据
        var goodInfo = {
            // tabOrder: currentTabOrder, // 附带序列号
        };

        // // 针对快手 aweme_list 数据结构提取
        // let videoData = null;
        // // 情况1：直接包含aweme_detail
        // if (responseData?.data?.aweme_detail) {
        //     videoData = responseData.data.aweme_detail;
        // }
        // // 情况2：包含aweme_list
        // else if (responseData?.aweme_list?.[0]) {
        //     videoData = responseData.aweme_list[0];
        // }
        // // 情况3：GraphQL响应结构
        // else if (responseData?.data?.visionVideoDetail?.videoInfo) {
        //     videoData = responseData.data.visionVideoDetail.videoInfo;
        // }

        // if (!videoData) {
        //     sendResponse({ success: false, message: "Not Found target data!" });
        //     return;
        // }
        // const pageUrl = window.location.href;

        // // 提取核心信息
        // const dataInfo = {
        //     id: videoData.aweme_id || videoData.photoId,
        //     desc: videoData.desc || videoData.caption,
        //     createTime: videoData.createTime,
        //     author: {
        //         userId: videoData.author?.uid || videoData.author?.userId,
        //         nickname: videoData.author?.nickname,
        //         avatar: videoData.author?.avatarThumb?.urls?.[0]
        //     },
        //     stats: {
        //         likeCount: videoData.statistics?.likeCount || videoData.likeCount,
        //         commentCount: videoData.statistics?.commentCount,
        //         shareCount: videoData.statistics?.shareCount
        //     },
        //     video: {
        //         duration: videoData.video?.duration,
        //         coverUrl: videoData.video?.coverUrl || videoData.video?.cover?.urls?.[0],
        //         playUrl: videoData.video?.playUrl || videoData.video?.playAddr?.urls?.[0],
        //         bitRateList: videoData.video?.bitRateList
        //     },
        //     rawData: videoData
        // };



        // F1：直接从 Apollo State 提取数据
        var result = extractKsDataFromApolloState(dataSource, (dataInfo) => {
            return dataInfo;
        });
        if (result) {
            success = true;
        }

        // F2：如果 F1 没有提取到数据，则尝试从其他方式提取

        var dataInfo = result;

        if (success == true) {
            sendResponse({ success: true, goodInfo: dataInfo });
        } else {
            sendResponse({ success: false, message: "Extracted goodInfo empty!" });
        }
    } catch (error) {
        sendResponse({ success: false, message: "Extract data failed" });
    }
}


function extractAndSaveGoodData(type, responseData) {
    extractGoodData(responseData, (sendResponse) => {
        if (sendResponse.success) {
            const dataInfo = sendResponse.goodInfo;
            const goodsInfo = {
                tag: type,
                goodsInfo: dataInfo
            }
            console.log("[PluginInject] Plugin success, send to window, dataInfo: ", goodsInfo);

            window.postMessage({
                type: 'extract-data-response',
                tag: type,
                goodInfo: dataInfo,
            }, "*");

        } else {
            console.info("[PluginInject] Plugin error:", sendResponse.message);
        }
    });
};

/**
 * 从页面脚本中提取快手视频数据
 */
function extractKsDataFromApolloState(initialState) {
    try {
        // 1. 尝试从 __APOLLO_STATE__ 提取
        if (initialState) {
            const apolloState = initialState;
            const rootQuery = apolloState.defaultClient?.ROOT_QUERY;
            if (!rootQuery) {
                console.warn('[快手数据提取] 未找到ROOT_QUERY');
                return null;
            }

            // 查找视频详情查询结果
            const videoDetailKey = Object.keys(rootQuery).find(key =>
                key.startsWith('visionVideoDetail({"page":"detail"')
            );

            if (videoDetailKey) {
                const videoDetailId = rootQuery[videoDetailKey].id;
                const videoDetail = apolloState.defaultClient[videoDetailId];

                if (videoDetail) {
                    // 提取作者信息
                    const authorId = videoDetail.author.id;
                    const author = apolloState.defaultClient[authorId];

                    // 提取视频信息
                    const photoId = videoDetail.photo.id;
                    const photo = apolloState.defaultClient[photoId];

                    // 提取标签信息
                    const tags = videoDetail.tags.map(tag => {
                        const tagId = tag.id;
                        return apolloState.defaultClient[tagId];
                    });

                    // 提取视频资源信息
                    const videoResource = photo.videoResource?.json;
                    const pageUrl = window.location.href;


                    // 构建结构化数据
                    const result = {
                        id: photo.id,
                        photoId: photo.id,
                        title: photo.caption,
                        desc: photo.caption,
                        cover: photo.coverUrl,
                        tags: tags.map(tag => tag.name) || [],
                        duration: photo.duration,
                        url: pageUrl,
                        author: {
                            user_id: author.id,
                            userId: author.id,
                            nickname: author.name,
                            headerUrl: author.headerUrl,
                            following: author.following
                        },
                        videoInfo: {
                            id: photo.id,
                            photoId: photo.id,
                            caption: photo.caption,
                            duration: photo.duration,
                            createTime: photo.timestamp,
                            likeCount: photo.realLikeCount || parseInt(photo.likeCount) || 0,
                            viewCount: parseInt(photo.viewCount) || 0,
                            coverUrl: photo.coverUrl,
                            videoUrl: photo.photoUrl,
                            videoRatio: photo.videoRatio,
                            manifest: photo.manifestH265?.json,
                            tags: tags.map(tag => tag.name),
                            riskTag: photo.riskTagContent,
                            shareUrl: window.location.href.split('?')[0]
                        },
                        videoResources: {
                            h264: videoResource?.h264,
                            h265: videoResource?.hevc,
                            bestQualityUrl: getBestQualityUrl(videoResource)
                        },
                        rawData: videoDetail
                    };

                    console.log('[快手数据提取] 从APOLLO_STATE提取成功', result);
                    return result;
                }
            }
        }

        // 2. 如果APOLLO_STATE没有，尝试其他方式
        console.warn('[快手数据提取] 未找到APOLLO_STATE数据，尝试其他方式');
        return null;
    } catch (error) {
        console.error('[快手数据提取] 提取数据出错:', error);
        return null;
    }
}

/**
 * 获取最佳画质的视频URL
 */
function getBestQualityUrl(videoResource) {
    if (!videoResource) return null;

    // 优先尝试HEVC(H265)
    if (videoResource.hevc) {
        const hevcReps = videoResource.hevc.adaptationSet[0]?.representation;
        if (hevcReps?.length) {
            // 按码率排序获取最高质量
            const sorted = [...hevcReps].sort((a, b) => b.avgBitrate - a.avgBitrate);
            return sorted[0].url;
        }
    }

    // 回退到H264
    if (videoResource.h264) {
        const h264Reps = videoResource.h264.adaptationSet[0]?.representation;
        if (h264Reps?.length) {
            const sorted = [...h264Reps].sort((a, b) => b.avgBitrate - a.avgBitrate);
            return sorted[0].url;
        }
    }

    return null;
}



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
    * Hijack Axios Request
    */
    const injectAxiosHijack = () => {
        console.info("[PluginInject] Axios Inject");
        // check axios exist
        if (window.axios) {
            // backip axios
            const originalAxios = window.axios;
            console.info("[PluginInject] Hijack Axios:", originalAxios);

            // add interceptors
            originalAxios.interceptors.response.use(
                function (responseData) {
                    if (isTargetUrl(responseData.config.url)) {
                        console.info("[PluginInject] Hijack Axios url:" + responseData.config.url + "response:", responseData);

                        // todo: extract data
                        extractAndSaveGoodData('kuaishou', responseData);

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
            console.info("[PluginInject] Hijack Fetch Request: url:{}", args[0], args);
            const [input, init] = args;
            const url = typeof input === 'string' ? input : input.url;
            const response = await originalFetch.apply(this, args);

            if (isTargetUrl(url)) {
                const clonedResponse = response.clone();
                clonedResponse.json().then((data) => {
                    console.info("[PluginInject] Hijack Fetch response:", { url, data });

                    // todo: extract data
                    extractAndSaveGoodData('kuaishou', data);
                });
            }
            return response;
        };
    };


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

            console.log("[PluginInject] XHR.open:" + url, { method, url, args, xhr: this });

            if (isTargetUrl(url)) {
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

                            extractAndSaveGoodData('kuaishou', responseData);

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

                            extractAndSaveGoodData('kuaishou', responseData);

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


                        extractAndSaveGoodData('kuaishou', responseData);

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

            console.log("[PluginInject] XHR.send:", { url, method, args, xhr: this });

            return originalSend.apply(this, args);
        };

        console.info("[PluginInject] XHR Inject - Done");
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

                        extractAndSaveGoodData('kuaishou', res);
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

        if (isTargetPage(window.location.href)) {
            // add JSONP observer
            const observer = new MutationObserver((mutationsList) => {
                // 这里可以根据实际页面结构提取你需要的信息
                const html = document.documentElement.innerHTML;
                console.debug("[PluginInject] JSONP MutationObserver HTML:", { html });

                for (const key in window) {
                    if (callbackPattern.test(key) && !originalCallbacks[key]) {
                        rewriteJSONPCallback(key);
                    }
                }
            });

            observer.observe(document, { childList: true, subtree: true });

        }

    };

    /**
     * Hijack web page to extract data
     */
    const injectOtherHijack = () => {
        console.info("[PluginInject] Other Inject");

        // 仅在详情页等 document 请求时尝试提取 window.__APOLLO_STATE__
        function extractFromInitialState() {
            console.info("[PluginInject] 当前页面为快手详情页，尝试提取 window.__APOLLO_STATE__");
            try {
                let state;
                if (window.__APOLLO_STATE__) {
                    state = window.__APOLLO_STATE__;
                } else {
                    const script = document.querySelector('script#__APOLLO_STATE__');
                    if (script) {
                        state = JSON.parse(script.textContent);
                    }
                }
                console.log("[PluginInject] 页面 window.__APOLLO_STATE__ 提取成功", state);
                extractAndSaveGoodData('kuaishou', state);
            } catch (e) {
                console.warn("[PluginInject] 页面 window.__APOLLO_STATE__ 提取失败", e);
            }
        }

        console.debug("[PluginInject] Other Url:", window.location.href);
        if (isTargetPage(window.location.href)) {

            // 使用通用的重新注入数据提取机制
            if (typeof setupReloadDataExtraction === 'function') {
                setupReloadDataExtraction(extractFromInitialState, '快手数据提取');
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
