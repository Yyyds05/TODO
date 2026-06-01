import { reminderService, settingsService } from './db.js'

/**
 * 备份服务
 * 支持导出/导入 JSON 文件
 */

/**
 * 导出所有数据为 JSON 文件
 */
export async function exportToJSON() {
  try {
    const data = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      app: 'SkyDesk',
      reminders: await reminderService.getAll(),
      settings: await settingsService.get('settings')
    }
    
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    
    // 生成文件名：skydesk-backup-YYYY-MM-DD.json
    const date = new Date().toISOString().split('T')[0]
    const filename = `skydesk-backup-${date}.json`
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true, filename }
  } catch (err) {
    console.error('导出失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 从 JSON 文件导入数据
 * @param {File} file - JSON 文件
 */
export async function importFromJSON(file) {
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    // 验证数据格式
    if (!validateBackupData(data)) {
      return { 
        success: false, 
        error: '无效的备份文件格式' 
      }
    }
    
    // 统计信息
    let importedReminders = 0
    let importedSettings = 0
    
    // 导入提醒
    if (data.reminders && Array.isArray(data.reminders)) {
      for (const reminder of data.reminders) {
        // 清理 ID，让数据库重新分配
        const { id, ...reminderData } = reminder
        
        // 确保必要字段存在
        const cleanReminder = {
          title: reminderData.title || '无标题',
          datetime: reminderData.datetime || new Date().toISOString(),
          description: reminderData.description || '',
          priority: reminderData.priority || 'normal',
          sound: reminderData.sound !== false,
          notification: reminderData.notification !== false,
          completed: reminderData.completed || false,
          createdAt: reminderData.createdAt || new Date().toISOString(),
          updatedAt: reminderData.updatedAt || new Date().toISOString()
        }
        
        await reminderService.create(cleanReminder)
        importedReminders++
      }
    }
    
    // 导入设置
    if (data.settings) {
      await settingsService.set('settings', {
        soundEnabled: data.settings.soundEnabled !== false,
        notificationEnabled: data.settings.notificationEnabled !== false,
        defaultReminder: data.settings.defaultReminder || 5
      })
      importedSettings++
    }
    
    return {
      success: true,
      importedReminders,
      importedSettings
    }
  } catch (err) {
    console.error('导入失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 验证备份数据格式
 * @param {Object} data - 解析后的 JSON 数据
 * @returns {boolean}
 */
function validateBackupData(data) {
  // 基本结构检查
  if (!data || typeof data !== 'object') {
    return false
  }
  
  // 检查是否是 SkyDesk 备份
  if (data.app !== 'SkyDesk' && !data.reminders) {
    return false
  }
  
  // 检查 reminders 是否为数组
  if (data.reminders && !Array.isArray(data.reminders)) {
    return false
  }
  
  return true
}

/**
 * 生成数据摘要
 * @returns {Object} 数据统计
 */
export async function getDataSummary() {
  try {
    const reminders = await reminderService.getAll()
    const settings = await settingsService.get('settings')
    
    const pending = reminders.filter(r => !r.completed).length
    const completed = reminders.filter(r => r.completed).length
    
    return {
      totalReminders: reminders.length,
      pendingReminders: pending,
      completedReminders: completed,
      hasSettings: !!settings
    }
  } catch (err) {
    console.error('获取数据摘要失败:', err)
    return null
  }
}

/**
 * 清空所有数据
 */
export async function clearAllData() {
  try {
    const reminders = await reminderService.getAll()
    
    // 删除所有提醒
    for (const reminder of reminders) {
      await reminderService.delete(reminder.id)
    }
    
    // 重置设置
    await settingsService.set('settings', {
      soundEnabled: true,
      notificationEnabled: true,
      defaultReminder: 5
    })
    
    return { success: true }
  } catch (err) {
    console.error('清空数据失败:', err)
    return { success: false, error: err.message }
  }
}
