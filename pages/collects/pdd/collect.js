
const totalInfo = document.getElementById("totalInfo");
const tableBody = document.getElementById("result");
const websiteSelect = document.getElementById('websiteSelect');

// 返回功能集合页面
document.getElementById("back").addEventListener("click", utils.back2Home);
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
    console.log("手动触发数据提取");
    utils.fetchGoodData();
    loadGoodsData();
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
    countElement.textContent = "Total: " + data.length + " 条数据";

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
    const headers = ["商品链接", "商品名称", "店铺名称", "商品价格", "销量", "备注"];
    const rows = data.map((item) => [
        item.goodsLink || "无",
        item.goodsName || "无",
        item.mallName || "无",
        item.goodsPrice || "无",
        item.goodsSales || "无",
        item.statusExplain || "无",
    ]);

    utils.exportToExcel('拼多多商品信息', headers, rows)

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
