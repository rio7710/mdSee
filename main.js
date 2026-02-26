const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

let mainWindow
let currentWatcher = null
let currentFilePath = null
const undoHistoryByFile = new Map()
let updateInitialized = false
const defaultUiSettings = {
  configVersion: 1,
  readMode: false,
  advancedMenu: false,
  readHideLabels: false,
  readAutoCopy: false,
  readAutoBlockSelect: true,
  readHtmlClip: false
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function sanitizeSettings(input) {
  const src = input && typeof input === 'object' ? input : {}
  const rawVersion = Number(src.configVersion)
  const configVersion = Number.isInteger(rawVersion) && rawVersion > 0 ? rawVersion : 1
  return {
    configVersion,
    readMode: !!src.readMode,
    advancedMenu: !!src.advancedMenu,
    readHideLabels: !!src.readHideLabels,
    readAutoCopy: !!src.readAutoCopy,
    readAutoBlockSelect: src.readAutoBlockSelect !== false,
    readHtmlClip: !!src.readHtmlClip
  }
}

function readUiSettings() {
  try {
    const p = getSettingsPath()
    if (!fs.existsSync(p)) return { ...defaultUiSettings }
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    return { ...defaultUiSettings, ...sanitizeSettings(parsed) }
  } catch (_) {
    return { ...defaultUiSettings }
  }
}

function writeUiSettings(next) {
  const safe = { ...defaultUiSettings, ...sanitizeSettings(next) }
  const p = getSettingsPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(safe, null, 2), 'utf-8')
  return safe
}

function pushUndoSnapshot(filePath, content) {
  const stack = undoHistoryByFile.get(filePath) || []
  stack.push(content)
  while (stack.length > 2) stack.shift()
  undoHistoryByFile.set(filePath, stack)
}

function parseHeadingLine(line) {
  const m = line.match(/^(\s{0,3})(#{1,6})([ \t]+)(.*)$/)
  if (!m) return null
  return { indent: m[1], level: m[2].length, gap: m[3], text: m[4] }
}

function parseListLine(line) {
  let m = line.match(/^(\s*)([-+*])([ \t]+)(.*)$/)
  if (m) {
    return { indent: m[1].length, marker: m[2], gap: m[3], text: m[4], kind: 'bullet' }
  }
  m = line.match(/^(\s*)(\d+[.)])([ \t]+)(.*)$/)
  if (m) {
    return { indent: m[1].length, marker: m[2], gap: m[3], text: m[4], kind: 'numbered' }
  }
  return null
}

function normalizeCompareText(text) {
  return String(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^(\[[^\]]+\]\s*)+/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_`~>#-]/g, ' ')
    .replace(/[•●◦▪▫■□]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[:;,.!?]/g, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function countLeadingSpaces(line) {
  const m = line.match(/^(\s*)/)
  return m ? m[1].length : 0
}

function getFenceMask(lines) {
  const mask = Array(lines.length).fill(false)
  let inFence = false
  let fenceChar = ''
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/^\s*(```+|~~~+)/)
    if (m) {
      const ch = m[1][0]
      if (!inFence) {
        inFence = true
        fenceChar = ch
      } else if (ch === fenceChar) {
        inFence = false
        fenceChar = ''
      }
      mask[i] = true
      continue
    }
    if (inFence) mask[i] = true
  }
  return mask
}

function getHeadingLineIndexByTocIndex(lines, tocIndex, fenceMask) {
  const headingLineIndexes = []
  for (let i = 0; i < lines.length; i++) {
    if (fenceMask[i]) continue
    const h = parseHeadingLine(lines[i])
    if (h && h.level >= 1 && h.level <= 4) headingLineIndexes.push(i)
  }
  if (tocIndex < 0 || tocIndex >= headingLineIndexes.length) return -1
  return headingLineIndexes[tocIndex]
}

function getListLineIndexByListIndex(lines, listIndex, fenceMask) {
  const listLineIndexes = []
  for (let i = 0; i < lines.length; i++) {
    if (fenceMask[i]) continue
    if (parseListLine(lines[i])) listLineIndexes.push(i)
  }
  if (listIndex < 0 || listIndex >= listLineIndexes.length) return -1
  return listLineIndexes[listIndex]
}

function findListLineIndexByText(lines, listText, fenceMask) {
  const key = normalizeCompareText(listText)
  if (!key) return -1

  let bestIndex = -1
  let bestScore = 0
  for (let i = 0; i < lines.length; i++) {
    if (fenceMask[i]) continue
    const l = parseListLine(lines[i])
    if (!l) continue
    const candidate = normalizeCompareText(l.text)
    if (!candidate) continue
    if (candidate.includes(key) || key.includes(candidate)) {
      const score = Math.min(candidate.length, key.length)
      if (score > bestScore) {
        bestScore = score
        bestIndex = i
      }
    }
  }
  return bestIndex
}

function getHeadingTreeEnd(lines, rootIndex, rootLevel, fenceMask) {
  let end = lines.length
  for (let i = rootIndex + 1; i < lines.length; i++) {
    if (fenceMask[i]) continue
    const h = parseHeadingLine(lines[i])
    if (h && h.level <= rootLevel) {
      end = i
      break
    }
  }
  return end
}

function getListTreeEnd(lines, rootIndex, rootIndent, fenceMask) {
  let end = lines.length
  for (let i = rootIndex + 1; i < lines.length; i++) {
    if (fenceMask[i]) continue
    const line = lines[i]
    if (line.trim() === '') continue

    const h = parseHeadingLine(line)
    if (h && h.level >= 1 && h.level <= 4) {
      end = i
      break
    }

    const l = parseListLine(line)
    if (l) {
      if (l.indent <= rootIndent) {
        end = i
        break
      }
      continue
    }
  }
  return end
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function getPreviousListIndent(lines, startIndex, fenceMask) {
  for (let i = startIndex - 1; i >= 0; i--) {
    if (fenceMask[i]) continue
    const l = parseListLine(lines[i])
    if (l) return l.indent
    const h = parseHeadingLine(lines[i])
    if (h && h.level >= 1 && h.level <= 4) break
  }
  return null
}

function escapeOrderedListLikeStart(text) {
  return text.replace(/^(\d+)([.)])(\s+)/, '$1\\$2$3')
}

function getPreviousHeadingLevel(lines, index, fenceMask) {
  for (let i = index - 1; i >= 0; i--) {
    if (fenceMask[i]) continue
    const h = parseHeadingLine(lines[i])
    if (h && h.level >= 1 && h.level <= 4) return h.level
  }
  return 1
}

function normalizeListTextForHeading(text) {
  return text.replace(/^(\[[^\]]+\]\s*)?●\s+/, '$1')
}

function shiftHeadingTree(lines, start, end, delta, fenceMask) {
  for (let i = start; i < end; i++) {
    if (fenceMask[i]) continue
    const h = parseHeadingLine(lines[i])
    if (!h || h.level > 4) continue
    const nextLevel = clamp(h.level + delta, 1, 4)
    lines[i] = `${h.indent}${'#'.repeat(nextLevel)}${h.gap}${h.text}`
  }
}

function shiftListTree(lines, start, end, deltaIndent, rootIndent, fenceMask) {
  for (let i = start; i < end; i++) {
    if (fenceMask[i]) continue
    const line = lines[i]
    if (line.trim() === '') continue

    const h = parseHeadingLine(line)
    if (h && h.level >= 1 && h.level <= 4) continue

    const l = parseListLine(line)
    if (l) {
      if (l.indent < rootIndent) continue
      const nextIndent = Math.max(0, l.indent + deltaIndent)
      lines[i] = `${' '.repeat(nextIndent)}${l.marker}${l.gap}${l.text}`
      continue
    }

    // 리스트 트리 안의 일반 텍스트(기호 bullets 포함)도 함께 이동
    const indent = countLeadingSpaces(line)
    const nextIndent = Math.max(0, indent + deltaIndent)
    lines[i] = `${' '.repeat(nextIndent)}${line.trimStart()}`
  }
}

function convertHeadingTreeToBullet(lines, start, end, rootLevel, fenceMask) {
  for (let i = start; i < end; i++) {
    if (fenceMask[i]) continue
    const line = lines[i]
    if (line.trim() === '') continue

    const h = parseHeadingLine(lines[i])
    if (h && h.level <= 4) {
      const relDepth = Math.max(0, h.level - rootLevel)
      const indent = ' '.repeat(relDepth * 2)
      lines[i] = `${indent}- ${escapeOrderedListLikeStart(h.text)}`
      continue
    }

    // 헤더 하위의 일반 텍스트/리스트도 함께 한 단계(2칸) 내려서 트리로 유지
    const indent = countLeadingSpaces(line)
    lines[i] = `${' '.repeat(indent + 2)}${line.trimStart()}`
  }
}

function convertListItemToHeading(lines, index, fenceMask) {
  if (fenceMask[index]) return false
  const l = parseListLine(lines[index])
  if (!l) return false
  const prevLevel = getPreviousHeadingLevel(lines, index, fenceMask)
  const level = clamp(prevLevel + 1, 1, 4)
  lines[index] = `${'#'.repeat(level)} ${normalizeListTextForHeading(l.text)}`
  return true
}

function convertListRangeToHeading(lines, start, end, rootIndent, fenceMask, baseLevel) {
  for (let i = start; i < end; i++) {
    if (fenceMask[i]) continue
    const l = parseListLine(lines[i])
    if (!l || l.indent < rootIndent) continue
    const rel = Math.max(0, Math.floor((l.indent - rootIndent) / 2))
    const level = clamp(baseLevel + rel, 1, 4)
    lines[i] = `${'#'.repeat(level)} ${normalizeListTextForHeading(l.text)}`
  }
}

function transformOnce(content, action, target, scope = 'single') {
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r?\n/)
  const fenceMask = getFenceMask(lines)

  let start = -1
  let end = -1
  let rootKind = target.targetType
  let rootLevel = 1
  let rootIndent = 0

  if (target.targetType === 'heading') {
    if (typeof target.sourceLine === 'number' && target.sourceLine >= 0 && target.sourceLine < lines.length) {
      const hs = parseHeadingLine(lines[target.sourceLine])
      if (hs && hs.level >= 1 && hs.level <= 4) {
        start = target.sourceLine
      }
    }
    if (start < 0) {
      start = getHeadingLineIndexByTocIndex(lines, target.tocIndex, fenceMask)
    }
    if (start < 0) return { ok: false, message: '선택한 헤더를 찾지 못했습니다.' }
    const h = parseHeadingLine(lines[start])
    if (!h || h.level > 4) return { ok: false, message: '유효한 헤더가 아닙니다.' }
    rootLevel = h.level
    end = getHeadingTreeEnd(lines, start, rootLevel, fenceMask)
  } else if (target.targetType === 'list') {
    if (typeof target.sourceLine === 'number' && target.sourceLine >= 0 && target.sourceLine < lines.length) {
      const ls = parseListLine(lines[target.sourceLine])
      if (ls) {
        start = target.sourceLine
      }
    }
    if (start < 0) {
      start = getListLineIndexByListIndex(lines, target.listIndex, fenceMask)
    }
    if (start < 0) {
      start = findListLineIndexByText(lines, target.listText, fenceMask)
    }
    if (start < 0) return { ok: false, message: '선택한 목록 항목을 찾지 못했습니다.' }
    const l = parseListLine(lines[start])
    if (!l) return { ok: false, message: '유효한 목록 항목이 아닙니다.' }
    rootIndent = l.indent
    end = getListTreeEnd(lines, start, rootIndent, fenceMask)
  } else {
    return { ok: false, message: '지원하지 않는 대상입니다.' }
  }

  if (start < 0 || end <= start) return { ok: false, message: '변환 범위를 계산하지 못했습니다.' }

  const groupMode = scope === 'group'
  if (!groupMode && (action === 'shiftUp' || action === 'shiftDown' || action === 'toBullet')) {
    end = start + 1
  }

  if (action === 'shiftUp') {
    if (rootKind === 'heading') {
      shiftHeadingTree(lines, start, end, -1, fenceMask)
    } else {
      // 최상위 블릿(D1)을 더 위로 올리면 직전 헤더의 하위 헤더로 승격한다.
      if (rootIndent === 0) {
        const prevLevel = getPreviousHeadingLevel(lines, start, fenceMask)
        const baseLevel = clamp(prevLevel + 1, 1, 4)
        if (groupMode) {
          convertListRangeToHeading(lines, start, end, rootIndent, fenceMask, baseLevel)
        } else {
          const one = parseListLine(lines[start])
          if (!one) return { ok: false, message: '선택한 목록 항목을 헤더로 변환하지 못했습니다.' }
          lines[start] = `${'#'.repeat(baseLevel)} ${normalizeListTextForHeading(one.text)}`
        }
      } else {
        shiftListTree(lines, start, end, -2, rootIndent, fenceMask)
      }
    }
  } else if (action === 'shiftDown') {
    if (rootKind === 'heading') {
      shiftHeadingTree(lines, start, end, 1, fenceMask)
    } else {
      const prevIndent = getPreviousListIndent(lines, start, fenceMask)
      if (prevIndent === null || rootIndent + 2 > prevIndent + 2) {
        return { ok: false, message: '블릿은 상위/이전 블릿보다 한 단계까지만 내려갈 수 있습니다.' }
      }
      shiftListTree(lines, start, end, 2, rootIndent, fenceMask)
    }
  } else if (action === 'toBullet') {
    if (rootKind !== 'heading') return { ok: false, message: '헤더에서만 블릿 변환이 가능합니다.' }
    convertHeadingTreeToBullet(lines, start, end, rootLevel, fenceMask)
  } else if (action === 'toHeading') {
    if (rootKind !== 'list') return { ok: false, message: '목록에서만 헤더 변환이 가능합니다.' }
    const changed = convertListItemToHeading(lines, start, fenceMask)
    if (!changed) return { ok: false, message: '선택한 목록 항목을 헤더로 변환하지 못했습니다.' }
  } else {
    return { ok: false, message: '지원하지 않는 액션입니다.' }
  }

  const updated = lines.join(eol)
  if (updated === content) return { ok: false, message: '변경된 내용이 없습니다.' }
  return { ok: true, updatedContent: updated }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#1e1e2e',
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
  // 개발 중 에러 확인용 - 배포 시 제거
  // mainWindow.webContents.openDevTools()
}

function sendUpdateStatus(status, message) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('update:status', { status, message: message || '' })
}

function initAutoUpdater() {
  if (updateInitialized) return
  updateInitialized = true

  if (!app.isPackaged) {
    sendUpdateStatus('skipped', '개발 모드에서는 자동업데이트를 건너뜁니다.')
    return
  }

  const updateUrl = String(process.env.MDSEE_UPDATE_URL || '').trim()
  if (updateUrl) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: updateUrl
    })
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('checking', '업데이트를 확인하는 중입니다.')
  })
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('available', `새 버전 발견: ${info && info.version ? info.version : '알 수 없음'}`)
  })
  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus('none', '최신 버전입니다.')
  })
  autoUpdater.on('error', (err) => {
    sendUpdateStatus('error', err && err.message ? err.message : '업데이트 확인 중 오류가 발생했습니다.')
  })
  autoUpdater.on('download-progress', (progress) => {
    const p = Math.round(progress && progress.percent ? progress.percent : 0)
    sendUpdateStatus('downloading', `업데이트 다운로드 중... ${p}%`)
  })
  autoUpdater.on('update-downloaded', async (info) => {
    sendUpdateStatus('downloaded', `업데이트 준비 완료: ${info && info.version ? info.version : '새 버전'}`)
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0,
      cancelId: 1,
      title: '업데이트 준비 완료',
      message: '새 버전이 다운로드되었습니다. 지금 재시작하여 적용할까요?'
    })
    if (result.response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall())
    }
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      sendUpdateStatus('error', err && err.message ? err.message : '업데이트 확인 실패')
    })
  }, 3000)
}

async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    loadFile(result.filePaths[0])
  }
}

function loadFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const fileName = path.basename(filePath)
    currentFilePath = filePath

    mainWindow.webContents.send('file:loaded', { content, filePath, fileName })
    mainWindow.setTitle(`mdSee - ${fileName}`)
    watchFile(filePath)
  } catch (err) {
    mainWindow.webContents.send('file:error', err.message)
  }
}

function watchFile(filePath) {
  if (currentWatcher) {
    currentWatcher.close()
    currentWatcher = null
  }

  currentWatcher = fs.watch(filePath, (eventType) => {
    if (eventType === 'change') {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        mainWindow.webContents.send('file:changed', { content })
      } catch (_) {}
    }
  })
}

ipcMain.handle('file:open', () => openFileDialog())

ipcMain.handle('file:loadPath', (event, filePath) => {
  loadFile(filePath)
  return true
})

ipcMain.handle('file:transformTree', (event, payload) => {
  const { filePath, action, target, scope = 'single', currentContent } = payload || {}
  if (!filePath || !action || !target) {
    return { ok: false, message: '잘못된 요청입니다.' }
  }

  try {
    const original = typeof currentContent === 'string'
      ? currentContent
      : fs.readFileSync(filePath, 'utf-8')
    const targets = Array.isArray(target.targets) && target.targets.length > 0
      ? target.targets.slice()
      : [target]

    // index 기반 타깃은 뒤에서부터 적용하면 앞쪽 index가 안정적이다.
    targets.sort((a, b) => {
      const ai = typeof a.listIndex === 'number' ? a.listIndex : a.tocIndex
      const bi = typeof b.listIndex === 'number' ? b.listIndex : b.tocIndex
      return (bi || 0) - (ai || 0)
    })

    let working = original
    for (const t of targets) {
      const one = transformOnce(working, action, t, scope)
      if (!one.ok) return one
      working = one.updatedContent
    }

    if (working === original) {
      return { ok: false, message: '변경된 내용이 없습니다.' }
    }

    pushUndoSnapshot(filePath, original)
    return { ok: true, updatedContent: working }
  } catch (err) {
    return { ok: false, message: err.message }
  }
})

ipcMain.handle('file:save', (event, payload) => {
  const { filePath, content } = payload || {}
  if (!filePath || typeof content !== 'string') {
    return { ok: false, message: '저장할 데이터가 올바르지 않습니다.' }
  }

  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err.message }
  }
})

ipcMain.handle('file:updateHeadingLevel', (event, payload) => {
  const { filePath, tocIndex, level } = payload || {}
  if (!filePath || typeof tocIndex !== 'number' || typeof level !== 'number') {
    return { ok: false, message: '잘못된 요청입니다.' }
  }
  if (level < 1 || level > 6) {
    return { ok: false, message: '헤딩 레벨은 1~6만 가능합니다.' }
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const eol = content.includes('\r\n') ? '\r\n' : '\n'
    const lines = content.split(/\r?\n/)
    const headingLineIndexes = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const m = line.match(/^(\s{0,3})(#{1,6})([ \t]+)(.*)$/)
      if (!m) continue

      const currentLevel = m[2].length
      if (currentLevel >= 1 && currentLevel <= 4) {
        headingLineIndexes.push(i)
      }
    }

    if (tocIndex < 0 || tocIndex >= headingLineIndexes.length) {
      return { ok: false, message: '대상 헤딩을 찾지 못했습니다.' }
    }

    const lineIndex = headingLineIndexes[tocIndex]
    const line = lines[lineIndex]
    const m = line.match(/^(\s{0,3})(#{1,6})([ \t]+)(.*)$/)
    if (!m) {
      return { ok: false, message: '대상 라인이 헤딩이 아닙니다.' }
    }

    lines[lineIndex] = `${m[1]}${'#'.repeat(level)}${m[3]}${m[4]}`
    const updated = lines.join(eol)
    if (updated !== content) {
      pushUndoSnapshot(filePath, content)
    }
    fs.writeFileSync(filePath, updated, 'utf-8')

    // 감시 이벤트 지연 전에 즉시 화면 갱신
    mainWindow.webContents.send('file:changed', { content: updated })
    if (filePath === currentFilePath) {
      const fileName = path.basename(filePath)
      mainWindow.setTitle(`mdSee - ${fileName}`)
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err.message }
  }
})

ipcMain.handle('file:undo', (event, payload) => {
  const { filePath, currentContent } = payload || {}
  if (!filePath) {
    return { ok: false, message: '파일 경로가 없습니다.' }
  }

  try {
    const stack = undoHistoryByFile.get(filePath) || []
    if (stack.length === 0) {
      return { ok: false, message: '되돌릴 변경이 없습니다.' }
    }

    const previousContent = stack.pop()
    undoHistoryByFile.set(filePath, stack)
    if (typeof currentContent === 'string' && currentContent !== previousContent) {
      // no-op: keep stack behavior deterministic per transform
    }
    return { ok: true, remainingUndo: stack.length, previousContent }
  } catch (err) {
    return { ok: false, message: err.message }
  }
})

ipcMain.handle('settings:get', () => {
  try {
    const settings = readUiSettings()
    return { ok: true, settings }
  } catch (err) {
    return { ok: false, message: err.message, settings: { ...defaultUiSettings } }
  }
})

ipcMain.handle('settings:set', (event, payload) => {
  try {
    const current = readUiSettings()
    const merged = { ...current, ...(payload && typeof payload === 'object' ? payload : {}) }
    const settings = writeUiSettings(merged)
    return { ok: true, settings }
  } catch (err) {
    return { ok: false, message: err.message }
  }
})

ipcMain.on('window:minimize', () => mainWindow.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.restore()
  else mainWindow.maximize()
})
ipcMain.on('window:close', () => mainWindow.close())

app.whenReady().then(() => {
  createWindow()
  initAutoUpdater()
})

app.on('window-all-closed', () => {
  if (currentWatcher) currentWatcher.close()
  app.quit()
})
