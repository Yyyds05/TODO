import Dexie from 'dexie'

// SkyDesk 数据库 - 极简提醒工具版本
class SkyDeskDB extends Dexie {
  reminders
  settings
  tags
  pomodoroRecords

  constructor() {
    super('SkyDeskDB')
    
    // v5: 添加 pomodoroRecords 表支持番茄专注功能
    this.version(5).stores({
      reminders: '++id, datetime, priority, completed, tag',
      settings: 'id',
      tags: '++id, name',
      pomodoroRecords: '++id, startTime, mode, completed'
    }).upgrade(async tx => {
      // 初始化番茄专注记录表（不需要默认数据）
      console.log('番茄专注功能数据库初始化完成')
    })
    
    // v4: 添加 tags 表支持自定义标签
    this.version(4).stores({
      reminders: '++id, datetime, priority, completed, tag',
      settings: 'id',
      tags: '++id, name'
    }).upgrade(async tx => {
      // 初始化默认标签
      try {
        const existingTags = await tx.table('tags').count()
        if (existingTags === 0) {
          const defaultTags = [
            { name: '学习', color: '#007aff', icon: '📚', createdAt: new Date().toISOString() },
            { name: '工作', color: '#ff9500', icon: '💼', createdAt: new Date().toISOString() },
            { name: '生活', color: '#34c759', icon: '🏠', createdAt: new Date().toISOString() },
            { name: '健康', color: '#ff3b30', icon: '❤️', createdAt: new Date().toISOString() },
            { name: '其他', color: '#86868b', icon: '📌', createdAt: new Date().toISOString() }
          ]
          for (const tag of defaultTags) {
            await tx.table('tags').add(tag)
          }
          console.log('默认标签初始化完成')
        }
      } catch (err) {
        console.log('标签初始化失败', err)
      }
    })
    
    // v3: 极简重构版本 - 只保留 reminders 和 settings
    this.version(3).stores({
      reminders: '++id, datetime, priority, completed',
      settings: 'id'
    }).upgrade(async tx => {
      // 从旧版本迁移数据
      try {
        // 尝试读取旧 events 表
        const oldEvents = await tx.table('events').toArray()
        
        // 将旧事件转换为新提醒格式
        for (const event of oldEvents) {
          if (!event.completed) {
            await tx.table('reminders').add({
              title: event.title || '无标题',
              datetime: event.start || new Date().toISOString(),
              description: event.description || '',
              priority: event.priority === 'P0' ? 'high' : 
                       event.priority === 'P1' ? 'normal' : 'low',
              sound: true,
              notification: true,
              completed: event.completed || false,
              createdAt: event.createdAt || new Date().toISOString(),
              updatedAt: event.updatedAt || new Date().toISOString()
            })
          }
        }
        
        // 清理旧表数据
        await tx.table('events').clear()
        await tx.table('habits').clear()
        
        console.log('数据迁移完成')
      } catch (err) {
        console.log('无旧数据需要迁移', err)
      }
    })
  }
}

export const db = new SkyDeskDB()

// 提醒 CRUD 操作
export const reminderService = {
  async getAll() {
    return await db.reminders.toArray()
  },

  async getById(id) {
    return await db.reminders.get(id)
  },

  async create(reminder) {
    const now = new Date().toISOString()
    const id = await db.reminders.add({
      ...reminder,
      completed: false,
      createdAt: now,
      updatedAt: now
    })
    return id
  },

  async update(id, changes) {
    await db.reminders.update(id, {
      ...changes,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    await db.reminders.delete(id)
  },

  async complete(id) {
    await db.reminders.update(id, {
      completed: true,
      updatedAt: new Date().toISOString()
    })
  },

  // 获取未完成的提醒
  async getPending() {
    return await db.reminders
      .where('completed')
      .equals(false)
      .toArray()
  },

  // 获取未来的提醒（按时间排序）
  async getUpcoming() {
    const now = new Date().toISOString()
    return await db.reminders
      .where('completed')
      .equals(false)
      .filter(r => r.datetime > now)
      .sortBy('datetime')
  },

  // 获取今日的提醒
  async getToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return await db.reminders
      .where('datetime')
      .between(today.toISOString(), tomorrow.toISOString(), true, false)
      .and(r => !r.completed)
      .toArray()
  },

  // 清空所有提醒
  async clearAll() {
    await db.reminders.clear()
  }
}

// 设置操作
export const settingsService = {
  async getAll() {
    return await db.settings.toArray()
  },

  async get(id) {
    return await db.settings.get(id)
  },

  async set(id, data) {
    const existing = await db.settings.get(id)
    if (existing) {
      await db.settings.update(id, data)
    } else {
      await db.settings.add({ id, ...data })
    }
  },

  // 初始化默认设置
  async initDefaults() {
    const settings = await this.get('settings')
    if (!settings) {
      await this.set('settings', {
        soundEnabled: true,
        notificationEnabled: true,
        defaultReminder: 5
      })
    }
  }
}

// 标签 CRUD 操作
export const tagService = {
  async getAll() {
    return await db.tags.toArray()
  },

  async getById(id) {
    return await db.tags.get(id)
  },

  async create(tag) {
    const now = new Date().toISOString()
    const id = await db.tags.add({
      ...tag,
      createdAt: now
    })
    return id
  },

  async update(id, changes) {
    await db.tags.update(id, changes)
  },

  async delete(id) {
    await db.tags.delete(id)
  },

  // 初始化默认标签
  async initDefaults() {
    const count = await db.tags.count()
    if (count === 0) {
      const defaultTags = [
        { name: '学习', color: '#007aff', icon: '📚', createdAt: new Date().toISOString() },
        { name: '工作', color: '#ff9500', icon: '💼', createdAt: new Date().toISOString() },
        { name: '生活', color: '#34c759', icon: '🏠', createdAt: new Date().toISOString() },
        { name: '健康', color: '#ff3b30', icon: '❤️', createdAt: new Date().toISOString() },
        { name: '其他', color: '#86868b', icon: '📌', createdAt: new Date().toISOString() }
      ]
      for (const tag of defaultTags) {
        await db.tags.add(tag)
      }
      console.log('默认标签初始化完成')
    }
  },

  // 清空所有标签
  async clearAll() {
    await db.tags.clear()
  }
}

// 番茄专注记录 CRUD 操作
export const pomodoroService = {
  async getAll() {
    return await db.pomodoroRecords
      .orderBy('startTime')
      .reverse()
      .toArray()
  },

  async getById(id) {
    return await db.pomodoroRecords.get(id)
  },

  async create(record) {
    const now = new Date().toISOString()
    const id = await db.pomodoroRecords.add({
      ...record,
      createdAt: now
    })
    return id
  },

  async update(id, changes) {
    await db.pomodoroRecords.update(id, changes)
  },

  async delete(id) {
    await db.pomodoroRecords.delete(id)
  },

  // 获取今日记录
  async getToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return await db.pomodoroRecords
      .where('startTime')
      .between(today.toISOString(), tomorrow.toISOString(), true, false)
      .toArray()
  },

  // 获取日期范围记录
  async getByDateRange(start, end) {
    return await db.pomodoroRecords
      .where('startTime')
      .between(start.toISOString(), end.toISOString(), true, false)
      .toArray()
  },

  // 获取统计数据：总次数、总时长、连续天数
  async getStats() {
    const allRecords = await db.pomodoroRecords.toArray()

    // 总次数（仅完成的专注）
    const totalCount = allRecords.filter(r => r.mode === 'focus' && r.completed && !r.skipped).length

    // 总时长（分钟，仅完成的专注）
    const totalMinutes = Math.floor(
      allRecords
        .filter(r => r.mode === 'focus' && r.completed && !r.skipped)
        .reduce((sum, r) => sum + (r.duration || 0), 0) / 60
    )

    // 计算连续专注天数
    const streakDays = await this.calculateStreakDays()

    return { totalCount, totalMinutes, streakDays }
  },

  // 计算连续专注天数
  async calculateStreakDays() {
    const allRecords = await db.pomodoroRecords
      .toArray()

    // 获取所有有完成专注记录的日期（去重）
    const focusDates = new Set()
    allRecords
      .filter(r => r.mode === 'focus' && r.completed && !r.skipped)
      .forEach(r => {
        const date = new Date(r.startTime)
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        focusDates.add(dateKey)
      })

    const sortedDates = Array.from(focusDates).sort().reverse()

    if (sortedDates.length === 0) return 0

    // 检查今天是否有记录
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

    let streak = 0
    let checkDate = new Date(today)

    // 如果今天没有记录，从昨天开始计算
    if (!focusDates.has(todayKey)) {
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // 计算连续天数
    while (true) {
      const checkKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`
      if (focusDates.has(checkKey)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  },

  // 清空所有记录
  async clearAll() {
    await db.pomodoroRecords.clear()
  }
}

