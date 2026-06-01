/**
 * 安全的 localStorage 操作工具
 * 所有 localStorage 读写都通过此工具，自动捕获异常
 */

/**
 * 安全读取 localStorage
 * @param {string} key
 * @param {*} defaultValue - 读取失败时的默认值
 * @returns {*}
 */
export function safeGet(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key)
    return value !== null ? value : defaultValue
  } catch (e) {
    console.warn(`[localStorage] 读取失败: ${key}`, e)
    return defaultValue
  }
}

/**
 * 安全写入 localStorage
 * @param {string} key
 * @param {string} value
 * @returns {boolean} 是否成功
 */
export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    console.warn(`[localStorage] 写入失败: ${key}`, e)
    return false
  }
}

/**
 * 安全删除 localStorage
 * @param {string} key
 * @returns {boolean} 是否成功
 */
export function safeRemove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (e) {
    console.warn(`[localStorage] 删除失败: ${key}`, e)
    return false
  }
}

/**
 * 检测 localStorage 是否可用
 * @returns {boolean}
 */
export function isLocalStorageAvailable() {
  try {
    const testKey = '__skydesk_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch (e) {
    return false
  }
}
