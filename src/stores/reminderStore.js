import { ref, computed } from 'vue'
import { reminderService, settingsService, tagService, pomodoroService } from '../services/db.js'
import eventBus from '../utils/eventBus.js'
import { reminderAlarm } from '../services/reminderAlarm.js'

// ==================== 常量定义 ====================

// 重复选项
export const repeatOptions = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' }
]

// 预设颜色选项
export const presetColors = [
  '#007aff', '#ff9500', '#34c759', '#ff3b30', 
  '#af52de', '#5ac8fa', '#ff6b6b', '#4ecdc4'
]

// 预设图标选项
export const presetIcons = [
  '📚', '💼', '🏠', '❤️', '📌', '🎯', '💡', '⭐',
  '🎨', '🏃', '💪', '🎵', '📖', '✏️', '🔬', '💻'
]

// ==================== 状态定义 ====================

// 提醒列表
export const reminders = ref([])

// 用户自定义标签列表
export const tags = ref([])

// 设置
export const settings = ref({
  soundEnabled: true,
  notificationEnabled: true,
  defaultReminder: 5
})

// 加载状态
export const loading = ref(false)

// 错误状态
export const error = ref(null)

// ==================== 番茄专注状态 ====================

// 专注记录列表
export const pomodoroRecords = ref([])

// 今日专注统计
export const todayPomodoroStats = ref({ count: 0, totalMinutes: 0 })

// ==================== 计算属性 ====================

// 未完成的提醒（按时间排序）
export const upcomingReminders = computed(() => {
  const now = new Date().toISOString()
  return reminders.value
    .filter(r => !r.completed && r.datetime > now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
})

// 今日的提醒
export const todayReminders = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return reminders.value
    .filter(r => {
      const dt = new Date(r.datetime)
      return !r.completed && dt >= today && dt < tomorrow
    })
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
})

// 已完成的提醒
export const completedReminders = computed(() => {
  return reminders.value
    .filter(r => r.completed)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
})

// 提醒数量统计
export const reminderStats = computed(() => {
  const total = reminders.value.length
  const pending = reminders.value.filter(r => !r.completed).length
  const completed = reminders.value.filter(r => r.completed).length
  const today = todayReminders.value.length
  
  return { total, pending, completed, today }
})

// ==================== 方法定义 ====================

/**
 * 加载所有提醒
 */
export async function loadReminders() {
  try {
    loading.value = true
    error.value = null
    const result = await reminderService.getAll()
    reminders.value = result
  } catch (err) {
    error.value = err.message || '加载提醒失败'
    console.error('加载提醒失败:', err)
  } finally {
    loading.value = false
  }
}

/**
 * 加载所有标签
 */
export async function loadTags() {
  try {
    const result = await tagService.getAll()
    tags.value = result
    
    // 如果没有标签，初始化默认标签
    if (tags.value.length === 0) {
      await tagService.initDefaults()
      tags.value = await tagService.getAll()
    }
  } catch (err) {
    console.error('加载标签失败:', err)
  }
}

/**
 * 添加新标签
 * @param {Object} data - 标签数据
 */
export async function addTag(data) {
  try {
    const tag = {
      name: data.name?.trim() || '新标签',
      color: data.color || '#007aff',
      icon: data.icon || '📌'
    }
    
    const id = await tagService.create(tag)
    
    // 重新加载标签列表
    await loadTags()
    
    return { id, ...tag }
  } catch (err) {
    console.error('添加标签失败:', err)
    throw err
  }
}

/**
 * 更新标签
 * @param {number} id - 标签ID
 * @param {Object} changes - 更新的字段
 */
export async function updateTag(id, changes) {
  try {
    await tagService.update(id, changes)
    
    // 更新本地状态
    const index = tags.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tags.value[index] = { ...tags.value[index], ...changes }
    }
    
    return true
  } catch (err) {
    console.error('更新标签失败:', err)
    throw err
  }
}

/**
 * 删除标签
 * @param {number} id - 标签ID
 */
export async function deleteTag(id) {
  try {
    const tag = tags.value.find(t => t.id === id)
    if (!tag) return false
    
    // 检查是否有提醒使用此标签
    const remindersWithTag = reminders.value.filter(r => r.tag === tag.name)
    if (remindersWithTag.length > 0) {
      // 提示用户确认
      const confirmed = confirm(`有 ${remindersWithTag.length} 个提醒使用了此标签，删除后这些提醒的标签将被清空。确定要删除吗？`)
      if (!confirmed) return false
      
      // 清空这些提醒的标签
      for (const reminder of remindersWithTag) {
        await reminderService.update(reminder.id, { tag: '' })
      }
      await loadReminders()
    }
    
    await tagService.delete(id)
    
    // 更新本地状态
    tags.value = tags.value.filter(t => t.id !== id)
    
    return true
  } catch (err) {
    console.error('删除标签失败:', err)
    throw err
  }
}

/**
 * 加载设置
 */
export async function loadSettings() {
  try {
    const result = await settingsService.get('settings')
    if (result) {
      settings.value = { ...settings.value, ...result }
    } else {
      // 初始化默认设置
      await settingsService.initDefaults()
    }
  } catch (err) {
    console.error('加载设置失败:', err)
  }
}

/**
 * 保存设置
 */
export async function saveSettings(newSettings) {
  try {
    settings.value = { ...settings.value, ...newSettings }
    await settingsService.set('settings', settings.value)
  } catch (err) {
    console.error('保存设置失败:', err)
  }
}

/**
 * 创建新提醒
 * @param {Object} data - 提醒数据
 */
export async function addReminder(data) {
  try {
    loading.value = true
    error.value = null
    
    const reminder = {
      title: data.title?.trim() || '无标题',
      datetime: data.datetime || new Date().toISOString(),
      description: data.description?.trim() || '',
      priority: data.priority || 'normal',
      tag: data.tag || '',
      repeat: data.repeat || 'none',
      sound: data.sound !== false,
      notification: data.notification !== false
    }
    
    const id = await reminderService.create(reminder)
    
    // 重新加载列表
    await loadReminders()
    
    // 构建完整的提醒对象（包含 id）
    const fullReminder = { id, ...reminder }
    
    // 广播事件
    eventBus.emit('reminder:added', fullReminder)
    eventBus.emit('toast:show', '添加成功')
    
    return fullReminder
  } catch (err) {
    error.value = err.message || '创建提醒失败'
    console.error('创建提醒失败:', err)
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * 更新提醒
 * @param {number} id - 提醒ID
 * @param {Object} changes - 更新的字段
 */
export async function updateReminder(id, changes) {
  try {
    loading.value = true
    error.value = null
    
    await reminderService.update(id, changes)
    
    // 更新本地状态
    const index = reminders.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reminders.value[index] = { ...reminders.value[index], ...changes }
    }
    
    // 广播事件
    eventBus.emit('reminder:updated', { id, changes })
    eventBus.emit('toast:show', '编辑成功')
    
    return true
  } catch (err) {
    error.value = err.message || '更新提醒失败'
    console.error('更新提醒失败:', err)
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * 删除提醒
 * @param {number} id - 提醒ID
 */
export async function deleteReminder(id) {
  try {
    loading.value = true
    error.value = null
    
    await reminderService.delete(id)
    
    // 更新本地状态
    reminders.value = reminders.value.filter(r => r.id !== id)
    
    // 广播事件
    eventBus.emit('reminder:deleted', { id })
    eventBus.emit('toast:show', '删除成功')
    
    return true
  } catch (err) {
    error.value = err.message || '删除提醒失败'
    console.error('删除提醒失败:', err)
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * 完成提醒
 * @param {number} id - 提醒ID
 */
export async function completeReminder(id) {
  try {
    const reminder = reminders.value.find(r => r.id === id)
    
    // 处理重复提醒：先创建下一次提醒，再标记原提醒为完成
    // 这样确保新提醒出现在列表中，然后原提醒被移到已完成列表
    if (reminder && reminder.repeat && reminder.repeat !== 'none') {
      const nextDatetime = getNextRepeatDate(reminder.datetime, reminder.repeat)
      await addReminder({
        title: reminder.title,
        datetime: nextDatetime,
        description: reminder.description,
        priority: reminder.priority,
        tag: reminder.tag,
        repeat: reminder.repeat,
        sound: reminder.sound,
        notification: reminder.notification
      })
    }
    
    // 标记原提醒为完成
    await reminderService.complete(id)
    
    // 更新本地状态
    const index = reminders.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reminders.value[index].completed = true
      reminders.value[index].updatedAt = new Date().toISOString()
    }
    
    // 广播事件
    eventBus.emit('reminder:completed', { id })
    
    return true
  } catch (err) {
    console.error('完成提醒失败:', err)
    throw err
  }
}

/**
 * 切换提醒完成状态
 * @param {number} id - 提醒ID
 */
export async function toggleComplete(id) {
  const reminder = reminders.value.find(r => r.id === id)
  if (reminder) {
    if (reminder.completed) {
      // 取消完成
      await updateReminder(id, { completed: false })
    } else {
      // 标记完成
      await completeReminder(id)
    }
  }
}

// ==================== 工具函数 ====================

/**
 * 格式化日期时间显示
 * @param {string} datetime - ISO 8601 日期时间字符串
 * @returns {string} 格式化后的字符串
 */
export function formatDateTime(datetime) {
  const date = new Date(datetime)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const dateStr = date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
  
  const timeStr = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // 判断是否是今天或明天
  if (date >= today && date < tomorrow) {
    return `今天 ${timeStr}`
  }
  
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)
  if (date >= tomorrow && date < dayAfterTomorrow) {
    return `明天 ${timeStr}`
  }
  
  return `${dateStr} ${timeStr}`
}

/**
 * 格式化日期为 input[type="datetime-local"] 需要的格式
 * @param {Date} date - 日期对象
 * @returns {string} YYYY-MM-DDTHH:MM 格式
 */
export function formatDateTimeLocal(date = new Date()) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/**
 * 获取优先级标签
 * @param {string} priority - 优先级代码
 * @returns {Object} 标签和颜色
 */
export function getPriorityInfo(priority) {
  const map = {
    high: { label: '高', color: '#ff3b30' },
    normal: { label: '中', color: '#ff9500' },
    low: { label: '低', color: '#34c759' }
  }
  return map[priority] || map.normal
}

/**
 * 获取标签信息
 * @param {string} tagName - 标签名称
 * @returns {Object|null} 标签信息（名称、颜色、图标）
 */
export function getTagInfo(tagName) {
  if (!tagName) return null
  return tags.value.find(t => t.name === tagName) || null
}

/**
 * 获取重复选项标签
 * @param {string} repeat - 重复类型
 * @returns {Object} 重复选项信息
 */
export function getRepeatInfo(repeat) {
  return repeatOptions.find(r => r.value === repeat) || repeatOptions[0]
}

/**
 * 计算下一次重复提醒的日期
 * @param {string} datetime - 当前提醒的 ISO 日期时间字符串
 * @param {string} repeat - 重复类型
 * @returns {string} 下一次提醒的 ISO 日期时间字符串
 */
export function getNextRepeatDate(datetime, repeat) {
  const d = new Date(datetime)
  switch (repeat) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
  }
  return d.toISOString()
}

// ==================== 番茄专注方法 ====================

/**
 * 加载所有专注记录
 */
export async function loadPomodoroRecords() {
  try {
    const result = await pomodoroService.getAll()
    pomodoroRecords.value = result
    
    // 更新今日统计
    await updateTodayStats()
  } catch (err) {
    console.error('加载专注记录失败:', err)
  }
}

/**
 * 更新今日专注统计
 */
async function updateTodayStats() {
  try {
    const todayRecords = await pomodoroService.getToday()
    const focusRecords = todayRecords.filter(r => r.mode === 'focus' && r.completed && !r.skipped)
    
    todayPomodoroStats.value = {
      count: focusRecords.length,
      totalMinutes: Math.floor(
        focusRecords.reduce((sum, r) => sum + (r.duration || 0), 0) / 60
      )
    }
  } catch (err) {
    console.error('更新今日统计失败:', err)
  }
}

/**
 * 添加专注记录
 * @param {Object} record - 专注记录数据
 */
export async function addPomodoroRecord(record) {
  try {
    const id = await pomodoroService.create(record)
    
    // 更新本地状态
    pomodoroRecords.value.unshift({ id, ...record, createdAt: new Date().toISOString() })
    
    // 更新今日统计
    await updateTodayStats()
    
    return id
  } catch (err) {
    console.error('添加专注记录失败:', err)
    throw err
  }
}

/**
 * 获取番茄专注统计数据
 */
export async function getPomodoroStats() {
  try {
    return await pomodoroService.getStats()
  } catch (err) {
    console.error('获取专注统计失败:', err)
    return null
  }
}

// ==================== 数据管理 ====================

/**
 * 导出所有数据
 * @returns {string} JSON 格式的数据
 */
export function exportData() {
  const data = {
    reminders: reminders.value,
    tags: tags.value,
    settings: settings.value,
    pomodoroRecords: pomodoroRecords.value,
    exportDate: new Date().toISOString(),
    version: '2.0'
  }
  return JSON.stringify(data, null, 2)
}

/**
 * 导入数据
 * @param {string} jsonData - JSON 格式的数据
 * @returns {boolean} 是否成功
 */
export async function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData)
    
    // 验证数据格式
    if (!data.reminders || !Array.isArray(data.reminders)) {
      throw new Error('无效的数据格式：缺少 reminders')
    }
    
    // 导入提醒
    for (const reminder of data.reminders) {
      await reminderService.create(reminder)
    }
    
    // 导入标签
    if (data.tags && Array.isArray(data.tags)) {
      for (const tag of data.tags) {
        await tagService.create(tag)
      }
    }
    
    // 导入设置
    if (data.settings) {
      await settingsService.update(data.settings)
    }
    
    // 重新加载数据
    await loadReminders()
    await loadTags()
    await loadSettings()
    
    return true
  } catch (err) {
    console.error('导入数据失败:', err)
    return false
  }
}

/**
 * 清空所有数据
 */
export async function clearAllData() {
  try {
    // 清空提醒
    await reminderService.clearAll()
    reminders.value = []
    
    // 清空标签
    await tagService.clearAll()
    tags.value = []
    
    // 清空专注记录
    await pomodoroService.clearAll()
    pomodoroRecords.value = []
    
    // 重置设置
    settings.value = {
      soundEnabled: true,
      notificationEnabled: true,
      defaultReminder: 5
    }
    await settingsService.update(settings.value)
    
    return true
  } catch (err) {
    console.error('清空数据失败:', err)
    throw err
  }
}

// ==================== 初始化 ====================

// 自动加载数据和设置
loadSettings()
loadTags()
loadReminders()