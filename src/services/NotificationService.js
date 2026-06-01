/**
 * NotificationService - 浏览器通知服务
 * 简化版，仅提供基础通知功能
 */

import eventBus from '../utils/eventBus.js'

class NotificationService {
  constructor() {
    this.permission = typeof Notification !== 'undefined'
      ? Notification.permission
      : 'denied'
  }

  /**
   * 请求浏览器通知权限
   * @returns {Promise<string>} 权限状态
   */
  async requestPermission() {
    if (typeof Notification === 'undefined') {
      console.warn('浏览器不支持 Notification API')
      return 'denied'
    }
    
    if (this.permission === 'granted') return 'granted'

    const result = await Notification.requestPermission()
    this.permission = result
    return result
  }

  /**
   * 发送浏览器通知
   * @param {string} title - 通知标题
   * @param {string} body - 通知内容
   */
  send(title, body) {
    if (this.permission !== 'granted') return

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction: true
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      // 自动关闭（5 秒）
      setTimeout(() => notification.close(), 5000)
      
      eventBus.emit('notification:sent', { title, body })
    } catch (err) {
      console.warn('发送通知失败:', err)
    }
  }

  /**
   * 获取当前权限状态
   * @returns {string}
   */
  getPermission() {
    return this.permission
  }
}

export default new NotificationService()
