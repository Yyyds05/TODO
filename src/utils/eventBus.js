import mitt from 'mitt'
const eventBus = mitt()
export default eventBus

// 事件名约定：domain:action
// 'weather:changed'       → { state, visualParams, raw }
// 'events:updated'        → { action: 'create'|'update'|'delete', event }
// 'notification:fired'    → { event, type }
// 'audio:weather-changed' → { weather, isPlaying }
// 'shortcut:keydown'      → { key, modifiers }
