/**
 * 自然语言日期时间解析器
 * 支持中文自然语言输入，自动识别日期和时间
 */

// 数字中文映射
const numberMap = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '两': 2
}

/**
 * 将中文数字转换为阿拉伯数字
 * @param {string} chineseNum - 中文数字，如"三"、"十二"
 * @returns {number} - 阿拉伯数字
 */
function chineseToNumber(chineseNum) {
  if (!chineseNum) return NaN
  
  // 如果是纯阿拉伯数字，直接返回
  if (/^\d+$/.test(chineseNum)) {
    return parseInt(chineseNum)
  }
  
  // 直接匹配
  if (numberMap[chineseNum] !== undefined) {
    return numberMap[chineseNum]
  }
  
  // 处理"十"开头的数字，如"十三"
  if (chineseNum.startsWith('十')) {
    const remainder = chineseNum.slice(1)
    if (remainder === '') return 10
    return 10 + (numberMap[remainder] || 0)
  }
  
  // 处理"十"结尾的数字，如"二十"
  if (chineseNum.endsWith('十')) {
    const prefix = chineseNum.slice(0, -1)
    return (numberMap[prefix] || 0) * 10
  }
  
  // 处理中间的"十"，如"二十三"
  const parts = chineseNum.split('十')
  if (parts.length === 2) {
    const ten = numberMap[parts[0]] || 0
    const one = numberMap[parts[1]] || 0
    return ten * 10 + one
  }
  
  return NaN
}

// 星期映射
const weekDayMap = {
  '周一': 1, '星期一': 1, '周二': 2, '星期二': 2,
  '周三': 3, '星期三': 3, '周四': 4, '星期四': 4,
  '周五': 5, '星期五': 5, '周六': 6, '星期六': 6,
  '周日': 0, '星期天': 0, '星期日': 0
}

/**
 * 解析自然语言输入
 * @param {string} text - 用户输入的文本
 * @returns {object} - 解析结果 { title: string, datetime: Date|null, repeat: string|null, matchedText: string|null }
 */
export function parseNaturalLanguage(text) {
  if (!text || !text.trim()) {
    return { title: text, datetime: null, repeat: null, matchedText: null }
  }

  const now = new Date()
  let datetime = null
  let repeat = null
  let matchedText = null

  // 复制原文本用于处理
  let remainingText = text.trim()

  // 1. 尝试匹配完整日期时间模式
  const dateTimeResult = parseDateTimePatterns(remainingText, now)
  if (dateTimeResult.datetime) {
    datetime = dateTimeResult.datetime
    repeat = dateTimeResult.repeat
    matchedText = dateTimeResult.matchedText
    remainingText = dateTimeResult.remainingText
  }

  // 清理标题中的多余空格
  const title = remainingText.trim().replace(/\s+/g, ' ')

  return {
    title,
    datetime,
    repeat,
    matchedText
  }
}

/**
 * 解析日期时间模式
 */
function parseDateTimePatterns(text, now) {
  let datetime = null
  let repeat = null
  let matchedText = null
  let remainingText = text

  // 模式1: 明天/今天/后天 + 可选时间
  // 先尝试匹配带具体时间的：明天下午三点、明天下午3点、明天3点
  // 支持阿拉伯数字和中文数字
  const dayTimePattern = /(明天|今天|后天|大后天)(早上|上午|中午|下午|晚上)?([\d一二三四五六七八九十]{1,2})[:点](\d{1,2})?分?/g
  let dayMatch = dayTimePattern.exec(text)
  
  // 如果没有匹配到带时间的，再匹配只有时间段或只有日期的
  if (!dayMatch) {
    const dayPeriodPattern = /(明天|今天|后天|大后天)(早上|上午|中午|下午|晚上)/g
    dayMatch = dayPeriodPattern.exec(text)
  }
  
  // 如果还没有匹配到，只匹配日期
  if (!dayMatch) {
    const dayOnlyPattern = /(明天|今天|后天|大后天)/g
    dayMatch = dayOnlyPattern.exec(text)
  }
  
  if (dayMatch) {
    const dayStr = dayMatch[1]
    const period = dayMatch[2] || ''
    // 使用 chineseToNumber 支持中文数字
    let hour = chineseToNumber(dayMatch[3])
    const minute = parseInt(dayMatch[4]) || 0

    // 如果没有指定小时，根据时间段使用默认时间
    if (isNaN(hour)) {
      hour = getDefaultHour(period)
    } else {
      // 根据时间段调整小时数
      if (period === '下午' || period === '晚上') {
        if (hour < 12) hour += 12
      } else if (period === '中午') {
        if (hour < 12) hour = 12
      }
    }

    datetime = new Date(now)
    if (dayStr === '明天') datetime.setDate(datetime.getDate() + 1)
    else if (dayStr === '后天') datetime.setDate(datetime.getDate() + 2)
    else if (dayStr === '大后天') datetime.setDate(datetime.getDate() + 3)

    datetime.setHours(hour, minute, 0, 0)
    matchedText = dayMatch[0]
    remainingText = text.replace(dayMatch[0], '').trim()
    return { datetime, repeat, matchedText, remainingText }
  }

  // 模式2: 周几 + 可选时间
  const weekPattern = /(周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期天|星期日)(?:早上|上午|中午|下午|晚上)?(\d{1,2})?(?::|点)?(\d{1,2})?分?/g
  const weekMatch = weekPattern.exec(text)
  if (weekMatch) {
    const weekDay = weekDayMap[weekMatch[1]]
    const hour = parseInt(weekMatch[2]) || getDefaultHour(weekMatch[0])
    const minute = parseInt(weekMatch[3]) || 0

    datetime = getNextWeekDay(now, weekDay)
    datetime.setHours(hour, minute, 0, 0)
    matchedText = weekMatch[0]
    remainingText = text.replace(weekMatch[0], '').trim()

    // 检查是否有"每周"关键词
    if (text.includes('每周') || text.includes('每个')) {
      repeat = 'weekly'
    }
    return { datetime, repeat, matchedText, remainingText }
  }

  // 模式3: X月X日 + 可选时间
  const datePattern = /(\d{1,2})月(\d{1,2})日?(?:早上|上午|中午|下午|晚上)?(\d{1,2})?(?::|点)?(\d{1,2})?分?/g
  const dateMatch = datePattern.exec(text)
  if (dateMatch) {
    const month = parseInt(dateMatch[1]) - 1
    const day = parseInt(dateMatch[2])
    const hour = parseInt(dateMatch[3]) || getDefaultHour(dateMatch[0])
    const minute = parseInt(dateMatch[4]) || 0

    datetime = new Date(now.getFullYear(), month, day, hour, minute, 0)
    // 如果日期已过，设为明年
    if (datetime < now) {
      datetime.setFullYear(datetime.getFullYear() + 1)
    }
    matchedText = dateMatch[0]
    remainingText = text.replace(dateMatch[0], '').trim()
    return { datetime, repeat, matchedText, remainingText }
  }

  // 模式4: 下周五/下周二 + 可选时间
  const nextWeekPattern = /下(周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期天|星期日)(?:早上|上午|中午|下午|晚上)?(\d{1,2})?(?::|点)?(\d{1,2})?分?/g
  const nextWeekMatch = nextWeekPattern.exec(text)
  if (nextWeekMatch) {
    const weekDay = weekDayMap[nextWeekMatch[1]]
    const hour = parseInt(nextWeekMatch[2]) || getDefaultHour(nextWeekMatch[0])
    const minute = parseInt(nextWeekMatch[3]) || 0

    datetime = getNextWeekDay(now, weekDay, true) // true 表示下周
    datetime.setHours(hour, minute, 0, 0)
    matchedText = nextWeekMatch[0]
    remainingText = text.replace(nextWeekMatch[0], '').trim()
    return { datetime, repeat, matchedText, remainingText }
  }

  // 模式5: 纯时间（今天）
  const timePattern = /(早上|上午|中午|下午|晚上)?(\d{1,2})(?::|点)(\d{1,2})?分?/g
  const timeMatch = timePattern.exec(text)
  if (timeMatch && !datetime) {
    let hour = parseInt(timeMatch[2])
    const minute = parseInt(timeMatch[3]) || 0
    const period = timeMatch[1]

    // 根据时间段调整小时
    if (period === '下午' || period === '晚上') {
      if (hour < 12) hour += 12
    } else if (period === '中午') {
      if (hour < 12) hour = 12
    }

    datetime = new Date(now)
    datetime.setHours(hour, minute, 0, 0)

    // 如果时间已过，设为明天
    if (datetime <= now) {
      datetime.setDate(datetime.getDate() + 1)
    }
    matchedText = timeMatch[0]
    remainingText = text.replace(timeMatch[0], '').trim()
    return { datetime, repeat, matchedText, remainingText }
  }

  return { datetime, repeat, matchedText, remainingText }
}

/**
 * 获取默认小时数
 */
function getDefaultHour(text) {
  if (text.includes('早上') || text.includes('上午')) return 9
  if (text.includes('中午')) return 12
  if (text.includes('下午')) return 15
  if (text.includes('晚上')) return 19
  return 9 // 默认早上9点
}

/**
 * 获取下一个指定星期几的日期
 * @param {Date} now - 当前日期
 * @param {number} targetDay - 目标星期几 (0-6)
 * @param {boolean} nextWeek - 是否强制下周
 */
function getNextWeekDay(now, targetDay, nextWeek = false) {
  const date = new Date(now)
  const currentDay = date.getDay()

  if (nextWeek) {
    // 强制下周
    const daysUntilNextWeek = 7 - currentDay + targetDay
    date.setDate(date.getDate() + daysUntilNextWeek)
  } else {
    // 本周或下周
    let daysUntilTarget = targetDay - currentDay
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7
    }
    date.setDate(date.getDate() + daysUntilTarget)
  }

  return date
}

/**
 * 格式化日期时间为本地格式
 */
export function formatDateTimeLocal(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
