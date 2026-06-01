import eventBus from '../utils/eventBus.js'
import { playNotificationSound } from './sound.js'

/**
 * 提醒调度器
 * 负责调度所有提醒并在设定时间触发
 */
class ReminderAlarm {
  constructor() {
    this.timers = new Map() // id -> timeoutId
    this.isInitialized = false
  }

  /**
   * 初始化调度器
   * @param {Array} reminders - 提醒列表
   */
  init(reminders) {
    if (this.isInitialized) return
    
    // 清除所有现有定时器
    this.clearAll()
    
    // 为每个未完成的未来提醒设置定时器
    const now = new Date()
    reminders.forEach(reminder => {
      if (!reminder.completed) {
        const reminderTime = new Date(reminder.datetime)
        if (reminderTime > now) {
          this.schedule(reminder)
        }
      }
    })
    
    this.isInitialized = true
    console.log('提醒调度器已初始化')
  }

  /**
   * 调度单个提醒
   * @param {Object} reminder - 提醒对象
   */
  schedule(reminder) {
    // 先取消已有的定时器
    this.cancel(reminder.id)
    
    const reminderTime = new Date(reminder.datetime)
    const now = new Date()
    const delay = reminderTime - now
    
    if (delay <= 0) return
    
    const timerId = setTimeout(() => {
      this.trigger(reminder)
    }, delay)
    
    this.timers.set(reminder.id, timerId)
    console.log(`已调度提醒: ${reminder.title} 将在 ${new Date(reminderTime).toLocaleString()} 触发`)
  }

  /**
   * 取消单个提醒的定时器
   * @param {number} id - 提醒ID
   */
  cancel(id) {
    const timerId = this.timers.get(id)
    if (timerId) {
      clearTimeout(timerId)
      this.timers.delete(id)
    }
  }

  /**
   * 清除所有定时器
   */
  clearAll() {
    this.timers.forEach(timerId => clearTimeout(timerId))
    this.timers.clear()
  }

  /**
   * 触发提醒
   * @param {Object} reminder - 提醒对象
   */
  trigger(reminder) {
    console.log('触发提醒:', reminder.title)
    
    // 1. 浏览器通知
    if (reminder.notification !== false) {
      this.sendBrowserNotification(reminder)
    }
    
    // 2. 页面内横幅
    this.showBanner(reminder)
    
    // 3. 声音提醒
    if (reminder.sound !== false) {
      playNotificationSound()
    }
    
    // 从调度器中移除
    this.timers.delete(reminder.id)
    
    // 广播事件
    eventBus.emit('reminder:triggered', reminder)
    
    // 4. 处理重复提醒：如果设置了重复，自动调度下一次提醒
    if (reminder.repeat && reminder.repeat !== 'none') {
      const nextDatetime = this.getNextRepeatDate(reminder.datetime, reminder.repeat)
      const nextReminder = {
        ...reminder,
        datetime: nextDatetime
      }
      this.schedule(nextReminder)
      // 广播重复提醒创建事件
      eventBus.emit('reminder:repeat', nextReminder)
    }
  }

  /**
   * 计算下一次重复提醒的日期
   * @param {string} datetime - 当前提醒的 ISO 日期时间字符串
   * @param {string} repeat - 重复类型
   * @returns {string} 下一次提醒的 ISO 日期时间字符串
   */
  getNextRepeatDate(datetime, repeat) {
    const d = new Date(datetime)
    switch (repeat) {
      case 'daily': d.setDate(d.getDate() + 1); break
      case 'weekly': d.setDate(d.getDate() + 7); break
      case 'monthly': d.setMonth(d.getMonth() + 1); break
    }
    return d.toISOString()
  }

  /**
   * 发送浏览器通知
   * @param {Object} reminder - 提醒对象
   */
  sendBrowserNotification(reminder) {
    if (!('Notification' in window)) {
      console.log('浏览器不支持通知功能')
      return
    }
    
    if (Notification.permission === 'granted') {
      new Notification('SkyDesk 提醒', {
        body: reminder.title,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `reminder-${reminder.id}`,
        requireInteraction: true
      })
    } else {
      console.log('通知权限未授予')
    }
  }

  /**
   * 显示页面内横幅
   * @param {Object} reminder - 提醒对象
   */
  showBanner(reminder) {
    eventBus.emit('banner:show', {
      title: reminder.title,
      description: reminder.description || '您设置的提醒时间到了',
      priority: reminder.priority
    })
  }

  /**
   * 请求通知权限
   * @returns {Promise<boolean>}
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false
    }
    
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  /**
   * 获取通知权限状态
   * @returns {string}
   */
  getNotificationPermission() {
    if (!('Notification' in window)) {
      return 'unsupported'
    }
    return Notification.permission
  }
}

// 导出单例
export const reminderAlarm = new ReminderAlarm()

// 导出请求权限函数（方便组件使用）
export async function requestNotificationPermission() {
  return await reminderAlarm.requestNotificationPermission()
}

export function getNotificationPermission() {
  return reminderAlarm.getNotificationPermission()
}
