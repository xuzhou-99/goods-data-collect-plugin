// 导出数据
async function exportToExcel(title, headers, rows) {
    console.log("开始导出数据...");

    // 检查参数
    if (!rows || rows.length === 0) {
        alert("没有可导出的数据！");
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
    const fileName = title + `_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
function getCachedData(tag) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ app: "GoodsCollect", action: "getStoreGoodsData", tag: tag }, (response) => {
            resolve(response || []);
        });
    });
}

window.utils = {
    exportToExcel,
    getCachedData,
    // ...其它工具函数
};