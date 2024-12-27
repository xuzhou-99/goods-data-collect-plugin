let lastTimestamp = ""; // 上次生成的时间前缀
let sequenceCounter = 0; // 毫秒内的计数器

/**
 * 获取带毫秒的日期前缀 + 计数器
 * 格式：yyyyMMddHHmmssSSS + 自增序列号
 * @returns {string}
 */
export function generateUniqueSequence() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const SSS = String(now.getMilliseconds()).padStart(3, "0");

    // 当前时间前缀（精确到毫秒）
    const currentTimestamp = `${yyyy}${MM}${dd}${HH}${mm}${ss}${SSS}`;

    // 如果是同一毫秒，递增计数器；否则重置计数器
    if (currentTimestamp === lastTimestamp) {
        sequenceCounter += 1;
    } else {
        lastTimestamp = currentTimestamp;
        sequenceCounter = 1;
    }

    // 格式化计数器（例如 0001）
    const sequenceNumber = String(sequenceCounter).padStart(4, "0");

    return `${currentTimestamp}${sequenceNumber}`;
}