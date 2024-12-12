
const totalInfo = document.getElementById("totalInfo");
const tableBody = document.getElementById("result");

// 返回功能集合页面
document.getElementById("back").addEventListener("click", () => { window.location.href = "/popup/popup.html"; });

// 查询
document.getElementById("filterBtn").addEventListener("click", filterData);
// 当前周期
document.getElementById("filterCurrentBtn").addEventListener("click", filterCurrentBtn);
// 上一周期
document.getElementById("filterBeforeBtn").addEventListener("click", filterBeforeBtn);
// 报表数据
document.getElementById("extractInfo").addEventListener("click", fetchGoodData);
// 报表数据
document.getElementById("clearAll").addEventListener("click", clearGoodData);
// 报表数据
document.getElementById("exportAll").addEventListener("click", exportToExcel);

const goodsList = [];

// 初始化表格
filterData();

// 初次加载
initAttendance();


function initAttendance() {
    console.log("开始 检测并注入脚本")
    // 检测并注入到所有 iframe
    document.querySelectorAll("iframe").forEach((iframe) => {
        chrome.runtime.sendMessage({ action: "injectContentScript", frameId: iframe.id });
    });
    console.log("检测并注入脚本完成")
}

// 过滤数据逻辑
function filterData() {

    console.log("开始从缓存中提取考勤数据")

    chrome.runtime.sendMessage({ action: "getStoreGoodsData", tag: 'pdd', page: 1, pageSize: 100 }, (data) => {
        console.debug("缓存中提取考勤数据：", data);
        if (!data || data.length === 0) {
            totalInfo.innerHTML = `<p style="font-weight: bold;">总计信息将显示在此处。</p>`;

            tableBody.innerHTML = "<tr><td colspan='5'>目标范围数据为空，请确保目标页面已加载</td></tr>";
            console.log("缓存中 目标范围考勤数据为空");
            return;
        }

        renderTable(data);

    })

    console.log("开始从缓存中提取考勤数据--完成")
}

function filterCurrentBtn() {
    filterData();
}

function filterBeforeBtn() {
    filterData();
}

// 开始从页面提取考勤数据
function fetchGoodData() {
    console.log("开始从页面提取考勤数据");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            alert("请打开目标考勤页面！");
            return;
        }

        const activeTab = tabs[0];
        console.log("插件进入页面：", activeTab);
        var shotAttendance = activeTab.url.includes("mobile.pinduoduo.com/goods.html") || activeTab.url.includes("mobile.yangkeduo.com/goods.html");
        if (!shotAttendance) {
            console.log("当前页面不支持插件");
            tableBody.innerHTML = "<tr><td colspan='5'>未能获取数据</td></tr>";
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
                    chrome.tabs.sendMessage(
                        activeTab.id,
                        { action: "extractGoodData" },
                        (response) => {
                            console.log("考勤数据：", response)
                            if (response) {
                                if (response.success) {

                                    const goodsInfo = {
                                        tag: 'pdd',
                                        goodsInfo: response.goodInfo
                                    }

                                    chrome.runtime.sendMessage({ action: "saveGoodsInfoData", data: goodsInfo }, (response) => {
                                        console.log("保存数据：", response);
                                        if (response.success) {
                                            // alert("考勤数据已保存");
                                            console.log("考勤数据已保存");
                                        } else {
                                            // alert("考勤数据保存失败：" + response.message);
                                            console.log("考勤数据保存失败：" + response.message);
                                        }
                                        filterData()

                                    });

                                } else {
                                    tableBody.innerHTML = "<tr><td colspan='5'>未能获取数据</td></tr>";
                                    // alert("拉取数据失败：" + response.message);
                                    console.log("拉取数据失败：" + response.message);
                                }
                            } else {
                                tableBody.innerHTML = "<tr><td colspan='5'>当前页面不支持考勤插件</td></tr>";
                                // alert("拉取数据失败：" + response.message);
                                console.log("当前页面不支持考勤插件");
                            }
                        }
                    );
                }
            }
        );
    });

    console.log("开始从页面提取考勤数据--完成");
};

// 开始从缓存中提取考勤数据
function getAttendanceData() {
    console.log("开始从缓存中提取考勤数据")

    chrome.runtime.sendMessage({ action: "getStoreGoodsData", tag: 'pdd', page: 1, pageSize: 100 }, (data) => {
        console.debug("缓存中提取考勤数据：", data);
        if (!data || data.length === 0) {
            totalInfo.innerHTML = `<p style="font-weight: bold;">总计信息将显示在此处。</p>`;

            tableBody.innerHTML = "<tr><td colspan='5'>目标范围数据为空，请确保目标页面已加载</td></tr>";
            console.log("缓存中 目标范围考勤数据为空");
            return;
        }

        renderTable(data);

    })

    console.log("开始从缓存中提取考勤数据--完成")
};

// 开始从缓存中提取考勤数据
function clearGoodData() {
    console.log("开始从缓存中提取考勤数据")
    chrome.runtime.sendMessage({ action: "clearGoodsInfoData", tag: 'pdd' }, (response) => {
        console.debug("缓存中提取考勤数据：", response);
        if (response.success) {
            fetchGoodData();
        }
    })

    console.log("开始从缓存中提取考勤数据--完成")
};

// 加载表格
function renderTable(data) {
    tableBody.innerHTML = ""; // 清空表格
    if (data.length === 0) {
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
            item.sideSalesTip,
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

async function exportToExcel() {
    console.log("开始导出数据...");

    // 模拟从缓存中获取数据
    const data = await getCachedData();
    if (!data || data.length === 0) {
        alert("没有可导出的数据！");
        return;
    }

    // 准备 Excel 数据：表头和内容
    const headers = ["商品链接", "商品名称", "店铺名称", "商品价格", "销量提示"];
    const rows = data.map((item) => [
        item.goodsLink || "无",
        item.goodsName || "无",
        item.mallName || "无",
        item.goodsPrice || "无",
        item.sideSalesTip || "无",
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

// 考勤脚本功能
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("Attendance: 接收到消息：" + request.action, request, sender)

    if (request.action === "axiosResponseIntercepted") {
        console.log("Intercepted Axios Response in Background Script:", request.data);

        filterData();
    }
})
