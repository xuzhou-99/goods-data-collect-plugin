// /**
//  * 拦截 Axios 请求
//  */
// const injectAxiosHijack = () => {
//     // 检查是否存在 axios
//     if (window.axios) {
//         // 保存原始的 axios 实例
//         const originalAxios = window.axios;

//         // 添加响应拦截器
//         originalAxios.interceptors.response.use(
//             function (response) {
//                 // 判断是否是目标接口
//                 if (response.config.url.includes("/app/attendance/attstatistics/loadDetailData.do")) {
//                     console.log("拦截到的 Axios 数据：", response);

//                     // 将数据发送给 content.js
//                     window.postMessage({
//                         type: "axios-response",
//                         data: response.data,
//                     }, "*");
//                 }
//                 return response;
//             },
//             function (error) {
//                 return Promise.reject(error);
//             }
//         );
//     } else {
//         console.debug("Axios not found on this page.");
//     }
// }

// /**
//  * 拦截 fetch 请求
//  */
// const injectFetchHijack = () => {
//     const originalFetch = window.fetch;
//     window.fetch = async function (...args) {
//         const response = await originalFetch.apply(this, args);
//         const clonedResponse = response.clone();

//         console.debug("【QinWorkPlugin】拦截到fetch请求：", args);

//         if (args[0].includes("/app/attendance/attstatistics/loadDetailData.do")) {
//             clonedResponse.json().then((responseData) => {
//                 console.log("拦截到的 fetch 数据：", responseData);

//                 if (responseData) {
//                     if (responseData.data) {
//                         // // 存储到 chrome.storage.local 中
//                         // chrome.storage.local.set({ attendanceData: data }, () => {
//                         //     console.log("数据已存储");
//                         // });

//                         // 将数据发送给 content.js
//                         window.postMessage({
//                             type: "axios-response",
//                             data: responseData.data,
//                         }, "*");
//                     }
//                 }
//             });
//         }
//         return response;
//     };
// };

// /**
//  * 拦截 XMLHttpRequest 请求
//  */
// const injectXHRHijack = () => {
//     const originalXHR = XMLHttpRequest.prototype.open;
//     XMLHttpRequest.prototype.open = function (method, url, ...args) {
//         console.debug("【QinWorkPlugin】拦截到xhr请求：", url);
//         if (url.includes("/app/attendance/attstatistics/loadDetailData.do")) {
//             console.log("拦截到的 XHR 请求：", args);
//             this.addEventListener("load", function () {
//                 try {
//                     var userInfo;
//                     if (this.__sentry_xhr_v3__) {
//                         var requestBody = this.__sentry_xhr_v3__.body;
//                         if (requestBody) {
//                             const requestBodyJson = JSON.parse(requestBody);
//                             console.log("拦截到的 XHR 数据：", requestBodyJson);
//                             userInfo = {
//                                 userId: requestBodyJson.userId,
//                                 userName: requestBodyJson.userName
//                             }
//                         }
//                     }
//                     const responseData = JSON.parse(this.responseText);
//                     console.log("拦截到的 XHR 数据：", responseData);

//                     if (responseData) {
//                         if (responseData.data) {
//                             // 将数据发送给 content.js
//                             window.postMessage({
//                                 type: "axios-response",
//                                 data: responseData.data,
//                                 userInfo: userInfo,
//                             }, "*");

//                         }
//                     }

//                 } catch (error) {
//                     console.warn("解析 XHR 数据失败：", error);
//                 }
//             });
//         }
//         return originalXHR.apply(this, [method, url, ...args]);
//     };
// };

// (function () {
//     console.debug("Goods info collect Hijacking Start...");

//     injectFetchHijack();
//     console.debug("Fetch 拦截注入完成");

//     injectXHRHijack();
//     console.debug("XHR 拦截注入完成");

//     injectAxiosHijack();
//     console.debug("Axios 拦截注入完成");

//     console.debug("Hijacking Finish!");
// })();
