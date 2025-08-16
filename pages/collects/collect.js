
import * as utils from './utils.js';

// DOM 元素缓存
const elements = {
    totalInfo: document.getElementById("totalInfo"),
    tableBody: document.getElementById("result"),
    websiteSelect: document.getElementById('websiteSelect'),
    tableHeader: document.getElementById('tableHeader'),
    filterBtn: document.getElementById("filterBtn"),
    extractInfo: document.getElementById("extractInfo"),
    clearAll: document.getElementById("clearAll"),
    exportAll: document.getElementById("exportAll"),
    back: document.getElementById("back"),
    platformDesc: document.getElementById("platform-desc"),
    // autoWorkToggle: document.getElementById("autoWorkToggle")
};

let platformConfig = {};
let currentPlatform = '';


async function init() {
    // 1. 获取平台参数
    currentPlatform = utils.getQueryParam('platform');
    if (!currentPlatform) {
        console.error('Platform parameter missing');
        return;
    }

    // 2. 加载平台配置
    try {
        platformConfig = await utils.getPlatformConfig(currentPlatform) || {};
        if (!platformConfig.name) throw new Error("无效的平台配置");
    } catch (error) {
        showPlatformError("加载平台配置失败");
        console.error(error);
        return;
    }

    // 3. 初始化UI
    initUI();

    // 4. 绑定事件
    bindEvents();

    // 5. 初始加载数据
    loadGoodsData();
}


// 初始化UI
function initUI() {
    // 设置平台描述
    updatePlatformDescription();

    initPlatformOptions();

    // 初始化自动提取开关
    initAutoWorkToggle();

    // 渲染表头
    renderTableHeader();
}

// 绑定事件
function bindEvents() {
    // 返回功能集合页面
    elements.back.addEventListener("click", back2Home);
    // 查询
    elements.filterBtn.addEventListener("click", loadGoodsData);
    // 提取数据
    elements.extractInfo.addEventListener("click", fetchGoodData);
    // 清除数据
    elements.clearAll.addEventListener("click", clearGoodsData);
    // 导出数据
    elements.exportAll.addEventListener("click", exportToExcel);
    // 平台变更处理
    elements.websiteSelect.addEventListener('change', handlePlatformChange);


    // const isLocked = platformConfig.editAutoWork === "0";
    // if (!isLocked) {
    //     // 自动提取开关
    //     elements.autoWorkToggle.addEventListener("click", toggleAutoWork);
    // }

}


// 返回功能集合页面
function back2Home() {
    window.location.href = "/popup/popup.html";
}

function getTag() {
    return elements.websiteSelect.value;
}


// 平台变更处理
async function handlePlatformChange() {
    currentPlatform = getTag();
    platformConfig = await utils.getPlatformConfig(currentPlatform).then((config) => {
        return config || {};
    });

    updatePlatformDescription();
    initAutoWorkToggle(); // 更新自动提取开关状态
    renderTableHeader();
    loadGoodsData();
}

// 更新平台描述
function updatePlatformDescription() {
    elements.platformDesc.textContent = platformConfig.description ||
        `${platformConfig.name}数据采集功能`;
}

// 初始化平台选项
function initPlatformOptions() {
    // 初始化下拉框（单平台模式）
    elements.websiteSelect.innerHTML = '';
    const option = document.createElement('option');
    option.value = currentPlatform;
    option.textContent = platformConfig.name;
    elements.websiteSelect.appendChild(option);
    elements.websiteSelect.disabled = true; // 单平台模式下禁用选择

    // 如果需要可以多选其他平台
    // for (const [key, value] of Object.entries(platformMap)) {
    //     const opt = document.createElement('option');
    //     opt.value = key;
    //     opt.textContent = value;
    //     if (key === platform) opt.selected = true;
    //     platformSelect.appendChild(opt);
    // }
}

// 初始化自动提取开关
function initAutoWorkToggle() {
    // const autoWork = platformConfig.autoWork === "1";
    // const isLocked = platformConfig.editAutoWork === "0";
    // if (autoWork) {
    //     elements.autoWorkToggle.classList.add('active');
    // } else {
    //     elements.autoWorkToggle.classList.remove('active');
    // }
    // if (isLocked) {
    //     elements.autoWorkToggle.classList.add('disabled');
    //     elements.autoWorkToggle.setAttribute('title', '管理员已锁定自动提取功能'); // 悬停提示
    // }
}

// 切换自动提取状态
async function toggleAutoWork() {
    try {
        const currentState = elements.autoWorkToggle.classList.contains('active');
        const newState = !currentState;

        // 更新UI状态
        if (newState) {
            elements.autoWorkToggle.classList.add('active');
        } else {
            elements.autoWorkToggle.classList.remove('active');
        }

        // 更新平台配置
        platformConfig.autoWork = newState ? "1" : "0";

        // 保存到存储
        await saveAutoWorkConfig();

        // 显示提示
        const status = newState ? "启用" : "停用";
        utils.showToast(`自动提取已${status}`);

    } catch (error) {
        console.error("切换自动提取状态失败:", error);
        utils.showToast("切换失败，请重试");

        // 恢复原状态
        const originalState = platformConfig.autoWork === "1";
        if (originalState) {
            elements.autoWorkToggle.classList.add('active');
        } else {
            elements.autoWorkToggle.classList.remove('active');
        }
    }
}

// 保存自动提取配置
async function saveAutoWorkConfig() {
    return new Promise(async (resolve, reject) => {
        utils.saveAutoWorkConfig(currentPlatform, { autoWork: platformConfig.autoWork })
            .then((response) => {
                if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error("保存配置失败"));
                }
            });
    });
}

// 渲染表头
function renderTableHeader() {
    elements.tableHeader.innerHTML = '';

    if (!platformConfig) {
        const th = document.createElement('th');
        th.colSpan = 6;
        th.textContent = "平台配置不完整";
        elements.tableHeader.appendChild(th);
        return;
    }

    platformConfig.columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        elements.tableHeader.appendChild(th);
    });
}


// 加载数据
async function loadGoodsData() {
    if (!currentPlatform) {
        showEmptyTable("请选择采集平台");
        return;
    }

    try {
        const data = await utils.loadGoodsData(currentPlatform, 1, 100);
        renderTable(data);
    } catch (error) {
        console.error("加载数据失败:", error);
        showEmptyTable("数据加载失败");
    }
}

// 显示空表格
function showEmptyTable(message) {
    const colspan = platformConfig.columns ? platformConfig.columns.length : 6;
    elements.tableBody.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
    elements.totalInfo.innerHTML = `<p style="font-weight: bold;">无数据</p>`;
}

// 清空数据
async function clearGoodsData() {
    if (!currentPlatform) return;

    try {
        const response = await utils.clearCachedData(currentPlatform);
        if (response.success) {
            loadGoodsData();
            utils.showToast("数据已清空");
        }
    } catch (error) {
        console.error("清空数据失败:", error);
        utils.showToast("清空数据失败");
    }
};

// 开始从页面提取数据
async function fetchGoodData() {
    try {
        utils.showToast("数据提取中...");
        const response = await utils.fetchGoodData();
        const noteDetail = `总计: ${response?.count || 0}页面，成功通知：${response?.success || 0}`;
        utils.showToast(noteDetail);
        setTimeout(loadGoodsData, 1000); // 延迟加载等待数据写入
    } catch (error) {
        console.error("提取数据失败:", error);
        utils.showToast("提取数据失败");
        loadGoodsData();
    }
};

// 加载表格
function renderTable(data) {
    elements.tableBody.innerHTML = ""; // 清空表格

    if (!data || data.length === 0) {
        showEmptyTable("无数据");
        return;
    }

    data.forEach(item => {
        const row = document.createElement("tr");

        platformConfig.fields.forEach(field => {
            const cell = document.createElement("td");
            const cellData = getNestedFieldValue(item, field);

            // 插入带截断和悬浮提示的元素 class = 'truncated-text'
            const truncatedDiv = createTruncatedCell(cellData || "无", 100);
            cell.appendChild(truncatedDiv);
            row.appendChild(cell);
        });

        elements.tableBody.appendChild(row);
    });

    // 更新统计信息
    elements.totalInfo.innerHTML = `
        <p style="font-weight: bold;">总计: ${data.length} 条数据</p>
    `;
};

// 导出数据
async function exportToExcel() {
    console.log("开始导出数据...");

    if (!currentPlatform) {
        utils.showToast("请先选择平台！");
        return;
    }

    try {
        // 模拟从缓存中获取数据
        const data = await utils.getCachedData(currentPlatform);
        if (!data || data.length === 0) {
            utils.showToast("没有可导出的数据！");
            return;
        }

        // 准备 Excel 数据：表头和内容
        const headers = platformConfig.columns;
        const rows = data.map(item => {
            return platformConfig.fields.map(field => {
                return getNestedFieldValue(item, field) || "无";
            });
        });


        utils.exportToExcel(`${platformConfig.name}数据`, headers, rows);
    } catch (error) {
        console.error("导出失败:", error);
        utils.showToast("导出失败");
    }
}

// 获取嵌套字段值（支持类似"author.nickname"的路径）
function getNestedFieldValue(obj, path) {
    return path.split('.').reduce((o, p) => (o || {})[p], obj);
}

function createTruncatedCell(text, maxLength = 100) {
    if (!text) {
        text = ""
    }
    const displayText = text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
    const div = document.createElement('div');
    div.className = 'truncated-text';
    div.textContent = displayText;
    div.title = text;  // 鼠标悬浮显示完整内容
    return div;
}


// 工具函数：显示平台错误
function showPlatformError(message) {
    elements.platformDesc.textContent = message;
    elements.platformDesc.style.color = "red";
    showEmptyTable("平台初始化失败");
}

// 初始化表格
init();