
// --------------------  导出 ------------------- //
// 导出数据
export async function exportToExcel(title, headers, rows) {
    console.log("开始导出数据...");

    // 检查参数
    if (!rows || rows.length === 0) {
        showToast("没有可导出的数据！");
        return;
    }

    // headers 和 rows 已经是参数，直接用
    // 创建工作簿和工作表
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // 应用样式
    applyStyles(worksheet, headers.length);

    XLSX.utils.book_append_sheet(workbook, worksheet, title);

    // 导出为文件
    const fileName = `${title}_${new Date().toISOString().replace(/[-:.]|(\..*)|(T)|(Z)/g, '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    console.log("数据导出完成:", fileName);
    showToast(`数据已导出为文件：${fileName}`);
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



// -------------------- 数据 ------------------- //


// 加载平台配置
export function getPlatformConfig(tag) {
    console.log("加载平台配置")
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ app: "GoodsCollect", action: "getPlatformConfig", tag: tag }, (data) => {
            console.debug("消息结果：", data);
            console.log("加载平台配置--完成")
            resolve(data);
        });
    });
}

// 加载分页数据
export function loadGoodsData(tag, page, pageSize) {
    console.log("加载分页数据")
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ app: "GoodsCollect", action: "getStoreGoodsData", tag: tag, page: page, pageSize: pageSize }, (data) => {
            console.debug("消息结果：", data);
            console.log("加载分页数据--完成")
            resolve(data);
        });
    });
}


// 获取全部数据
export function getCachedData(tag) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ app: "GoodsCollect", action: "getStoreGoodsData", tag: tag }, (response) => {
            resolve(response || []);
        });
    });
}

// 清空缓存数据
export async function clearCachedData(tag) {
    if (!confirm("是否清空当前标签页缓存数据？")) {
        console.log("用户取消了清空操作");
        return;
    }

    return new Promise((resolve) => {
        console.log("开始清空缓存数据");
        chrome.runtime.sendMessage({ app: "GoodsCollect", action: "clearGoodsInfoData", tag: tag }, (response) => {
            console.debug("消息结果：", response);
            console.log("清空缓存数据--完成");
            resolve(response);
        });
    });
}




/**
 * 从当前页面提取商品数据
 */
export async function fetchGoodData() {
    try {
        // 用户确认
        const isConfirmed = await new Promise((resolve) => {
            resolve(confirm("是否开始提取页面数据？"));
        });
        if (!isConfirmed) {
            console.log("用户取消了提取操作");
            return;
        }

        console.log("开始从页面提取数据...");

        // 获取当前活动标签页
        const tabs = await new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                resolve(tabs);
            });
        });

        const activeTab = tabs[0];
        if (!activeTab?.url?.startsWith("http")) {
            console.warn("当前标签页不是 HTTP(S) 页面，无法提取数据");
            alert("请打开商品页面后再试！");
            return;
        }

        // 向内容脚本发送消息
        chrome.tabs.sendMessage(
            activeTab.id,
            { app: "GoodsCollect", action: "reExtractGoodData" },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("发送消息失败:", chrome.runtime.lastError);
                    alert("数据提取失败，请检查控制台日志！");
                    return;
                }
                console.log("数据提取请求已发送，响应:", response);
                alert("数据提取已触发，请稍后刷新列表！");
            }
        );
    } catch (error) {
        console.error("提取数据时发生错误:", error);
        alert("发生错误，请检查控制台日志！");
    }
}



// --------------------  工具 ------------------- //

/**
 * 显示提示消息
 * @param {String} msg 
 * @param {Number} duration 
 */
export function showToast(msg, duration = 2000) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.style = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 9999;
      user-select: none;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.style.opacity = '0';
    }, duration);
}


// 获取 URL 参数
export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}