/**
 * 声音服务
 * 使用 Web Audio API 生成提示音，无需外部音频文件
 */

let audioContext = null

/**
 * 获取或创建 AudioContext
 * @returns {AudioContext}
 */
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

/**
 * 播放通知提示音
 * 清脆的上升音调，类似 Apple 的通知声
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    
    // 创建振荡器
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // 设置音调：从 800Hz 上升到 1200Hz
    oscillator.frequency.setValueAtTime(800, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
    
    // 设置音量包络
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    
    // 播放
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
    
  } catch (err) {
    console.error('播放声音失败:', err)
  }
}

/**
 * 播放完成提示音
 * 愉悦的下降音调
 */
export function playCompleteSound() {
  try {
    const ctx = getAudioContext()
    
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // 设置音调：从 600Hz 下降到 400Hz
    oscillator.frequency.setValueAtTime(600, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2)
    
    // 设置音量包络
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.03)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
    
    // 播放
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.25)
    
  } catch (err) {
    console.error('播放声音失败:', err)
  }
}

/**
 * 播放错误提示音
 * 低沉的警告音
 */
export function playErrorSound() {
  try {
    const ctx = getAudioContext()
    
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // 设置音调：200Hz 短音
    oscillator.frequency.setValueAtTime(200, ctx.currentTime)
    
    // 设置音量包络
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    
    // 播放
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
    
  } catch (err) {
    console.error('播放声音失败:', err)
  }
}

/**
 * 测试声音
 * 依次播放三种声音
 */
export async function testSounds() {
  playNotificationSound()
  await sleep(300)
  playCompleteSound()
  await sleep(300)
  playErrorSound()
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 检查浏览器是否支持 Web Audio API
 * @returns {boolean}
 */
export function isAudioSupported() {
  return !!(window.AudioContext || window.webkitAudioContext)
}

/**
 * 声音服务对象
 * 统一的声音服务接口
 */
export const soundService = {
  play(type) {
    switch (type) {
      case 'notification':
        playNotificationSound()
        break
      case 'complete':
        playCompleteSound()
        break
      case 'error':
        playErrorSound()
        break
      default:
        playNotificationSound()
    }
  },
  test() {
    testSounds()
  },
  isSupported() {
    return isAudioSupported()
  }
}
