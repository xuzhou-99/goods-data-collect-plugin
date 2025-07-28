
const totalInfo = document.getElementById("totalInfo");
const tableBody = document.getElementById("result");
const websiteSelect = document.getElementById('websiteSelect');

// 返回功能集合页面
document.getElementById("back").addEventListener("click", () => { window.location.href = "/popup/popup.html"; });

// 查询
document.getElementById("filterBtn").addEventListener("click", loadGoodsData);
// 提取数据
document.getElementById("extractInfo").addEventListener("click", fetchGoodData);
// 报表数据
document.getElementById("clearAll").addEventListener("click", clearGoodsData);
// 报表数据
document.getElementById("exportAll").addEventListener("click", exportToExcel);

const goodsList = [];

// 初始化表格
loadGoodsData();

// 初次加载
init();


function init() {
    console.log("检测并注入脚本 开始...")
    // 检测并注入到所有 iframe
    document.querySelectorAll("iframe").forEach((iframe) => {
        chrome.runtime.sendMessage({ app: "GoodsCollect", action: "injectContentScript", frameId: iframe.id });
    });
    console.log("检测并注入脚本 完成")
}

function getTag() {
    return websiteSelect.value;
}


// 监听 websiteSelect 的 change 事件
websiteSelect.addEventListener('change', function () {
    loadGoodsData();
});

// 加载数据
function loadGoodsData() {
    console.log("加载缓存数据")

    chrome.runtime.sendMessage({ app: "GoodsCollect", action: "getStoreGoodsData", tag: getTag(), page: 1, pageSize: 100 }, (data) => {
        console.debug("消息结果：", data);
        renderTable(data);
    })

    console.log("加载缓存数据--完成")
}

// 清空数据
function clearGoodsData() {
    console.log("删除缓存数据")

    chrome.runtime.sendMessage({ app: "GoodsCollect", action: "clearGoodsInfoData", tag: getTag() }, (response) => {
        console.debug("消息结果：", response);
        if (response.success) {
            loadGoodsData();
        }
    })

    console.log("删除缓存数据--完成")
};

// 开始从页面提取数据
function fetchGoodData() {
    console.log("开始从页面提取数据");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            alert("请打开目标页面！");
            return;
        }

        const activeTab = tabs[0];
        console.log("插件进入页面：", activeTab);
        if (!isTargetPage(activeTab.url)) {
            console.log("当前页面不支持插件");
            tableBody.innerHTML = "<tr><td colspan='6'>未能获取数据</td></tr>";
            return;
        }

        chrome.scripting.executeScript(
            {
                target: { tabId: activeTab.id },
                files: ["/scripts/content.js"], // 内容脚本路径
            },
            () => {
                if (chrome.runtime.lastError) {
                    alert("注入脚本失败：" + chrome.runtime.lastError.message);
                } else {
                    chrome.tabs.sendMessage(activeTab.id, { app: "GoodsCollect", action: "extractGoodData" }, (response) => {
                        console.log("数据：", response)
                        if (response && response.success) {

                            const goodsInfo = {
                                tag: getTag(),
                                goodsInfo: response.goodInfo
                            }

                            chrome.runtime.sendMessage({ app: "GoodsCollect", action: "saveGoodsInfoData", data: goodsInfo }, (response) => {
                                console.log("保存数据：", response);
                                if (response.success) {
                                    // alert("数据已保存");
                                    console.log("数据已保存");
                                    loadGoodsData();
                                } else {
                                    // alert("数据保存失败：" + response.message);
                                    console.log("数据保存失败：" + response.message);
                                }
                            });

                        } else {
                            tableBody.innerHTML = "<tr><td colspan='6'>未能获取数据</td></tr>";
                            // alert("拉取数据失败：" + response.message);
                            console.log("拉取数据失败", response ? response.message : '');
                        }
                    });
                }
            }
        );
    });

    console.log("开始从页面提取数据--完成");
};

// 加载表格
function renderTable(data) {
    tableBody.innerHTML = ""; // 清空表格
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
        <tr>
            <td colspan="5">无数据</td>
        </tr>`;
        totalInfo.innerHTML = `<p style="font-weight: bold;">总计信息将显示在此处。</p>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement("tr");

        // 创建单元格
        const cells = [
            item.title || "无",
            item.url || "无",
            item.author?.nickname || "无",
            item.author?.user_id || "无",
            item.statusExplain || "无",
        ];
        cells.forEach(cellData => {
            const cell = document.createElement("td");
            cell.textContent = cellData;
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });


    totalInfo.innerHTML = "";// 清空统计信息
    // 总时长
    const countElement = document.createElement("p");
    countElement.style = "font-weight: bold;"
    countElement.textContent = "Total: " + data.length + " 条商品信息";

    totalInfo.appendChild(countElement);
};

// 导出数据
async function exportToExcel() {
    console.log("开始导出数据...");

    // 模拟从缓存中获取数据
    const data = await utils.getCachedData(getTag());
    if (!data || data.length === 0) {
        alert("没有可导出的数据！");
        return;
    }


    // 准备 Excel 数据：表头和内容
    const headers = ["标题", "链接", "用户名", "用户id", "备注"];
    const rows = data.map((item) => [
        item.title || "无",
        item.url || "无",
        item.author?.nickname || "无",
        item.author?.user_id || "无",
        item.statusExplain || "无",
    ]);


    utils.exportToExcel("快手数据", headers, rows)

}



/**
 * 目标网站
 * @returns 目标网站
 */
function isTargetPage(url) {
    if (!url) {
        url = window.location.href;
    }
    return url.includes("kuaishou.com");
}
