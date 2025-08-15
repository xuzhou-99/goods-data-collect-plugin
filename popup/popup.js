// popup.js


// 跳转到登录助手页面
document.getElementById("pdd-collect-button").addEventListener("click", () => {
    // window.location.href = "/pages/collects/pdd/collect.html";
    window.location.href = "/pages/collects/collect.html?platform=pdd";
})

document.getElementById("xhs-collect-button").addEventListener("click", () => {
    // window.location.href = "/pages/collects/xhs/collect.html";
    window.location.href = "/pages/collects/collect.html?platform=xhs";
})

document.getElementById("douyin-collect-button").addEventListener("click", () => {
    // window.location.href = "/pages/collects/douyin/collect.html";
    window.location.href = "/pages/collects/collect.html?platform=douyin";
})

document.getElementById("kuaishou-collect-button").addEventListener("click", () => {
    // window.location.href = "/pages/collects/kuaishou/collect.html";
    window.location.href = "/pages/collects/collect.html?platform=kuaishou";
})
