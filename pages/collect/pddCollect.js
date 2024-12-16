
const totalInfo = document.getElementById("totalInfo");
const tableBody = document.getElementById("result");

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
        chrome.runtime.sendMessage({ action: "injectContentScript", frameId: iframe.id });
    });
    console.log("检测并注入脚本 完成")
}

// 加载数据
function loadGoodsData() {
    console.log("加载缓存数据")

    chrome.runtime.sendMessage({ action: "getStoreGoodsData", tag: 'pdd', page: 1, pageSize: 100 }, (data) => {
        console.debug("消息结果：", data);
        renderTable(data);
    })

    console.log("加载缓存数据--完成")
}

// 清空数据
function clearGoodsData() {
    console.log("删除缓存数据")

    chrome.runtime.sendMessage({ action: "clearGoodsInfoData", tag: 'pdd' }, (response) => {
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
        if (!isPinduoduoPage(activeTab.url)) {
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
                    chrome.tabs.sendMessage(activeTab.id, { action: "extractGoodData" }, (response) => {
                        console.log("数据：", response)
                        if (response && response.success) {

                            const goodsInfo = {
                                tag: 'pdd',
                                goodsInfo: response.goodInfo
                            }

                            chrome.runtime.sendMessage({ action: "saveGoodsInfoData", data: goodsInfo }, (response) => {
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
            <td colspan="6">无数据</td>
        </tr>`;
        totalInfo.innerHTML = `<p style="font-weight: bold;">总计信息将显示在此处。</p>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement("tr");

        // 创建单元格
        const cells = [
            item.goodsLink,
            item.goodsName,
            item.mallName,
            item.goodsPrice,
            item.goodsSales,
            item.statusExplain,
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
    const data = await getCachedData();
    if (!data || data.length === 0) {
        alert("没有可导出的数据！");
        return;
    }

    // 准备 Excel 数据：表头和内容
    const headers = ["商品链接", "商品名称", "店铺名称", "商品价格", "销量", "备注"];
    const rows = data.map((item) => [
        item.goodsLink || "无",
        item.goodsName || "无",
        item.mallName || "无",
        item.goodsPrice || "无",
        item.goodsSales || "无",
        item.statusExplain || "无",
    ]);

    // 创建工作簿和工作表
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // 应用样式
    applyStyles(worksheet, headers.length);

    XLSX.utils.book_append_sheet(workbook, worksheet, "商品信息");

    // 导出为文件
    const fileName = `商品信息_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    console.log("数据导出完成:", fileName);
    alert(`数据已导出为文件：${fileName}`);

}

// 应用样式到工作表
function applyStyles(worksheet, columnCount) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    // 表头样式
    for (let C = range.s.c; C < range.e.c + 1; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        const cell = worksheet[cellAddress] || {};
        cell.s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F81BD" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: getAllBorders(),
        };
        worksheet[cellAddress] = cell;
    }

    // 数据单元格样式
    for (let R = range.s.r + 1; R < range.e.r + 1; R++) {
        for (let C = range.s.c; C < range.e.c + 1; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cellAddress] || {};
            cell.s = {
                font: { color: { rgb: "000000" } },
                alignment: { horizontal: "left", vertical: "center" },
                border: getAllBorders(),
            };
            worksheet[cellAddress] = cell;
        }
    }

    // 调整列宽
    worksheet["!cols"] = Array(columnCount).fill({ wpx: 150 }); // 每列宽度 150px
}

// 获取所有边框样式
function getAllBorders() {
    return {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
    };
}

// 获取全部数据
function getCachedData() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getStoreGoodsData", tag: "pdd" }, (response) => {
            resolve(response || []);
        });
    });
}



/**
 * 拼多多网站
 * @returns 拼多多网站
 */
function isPinduoduoPage(url) {
    if (!url) {
        url = window.location.href;
    }
    return /mobile\.(pinduoduo|yangkeduo)\.com\/(goods|good.*)\.html/.test(url);
}