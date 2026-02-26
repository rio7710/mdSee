const { ipcRenderer } = require('electron')
const { marked } = require('marked')
const hljs = require('highlight.js')

// marked 설정 - 코드 하이라이팅
const renderer = new marked.Renderer()
renderer.code = function(code, language) {
  let highlighted
  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(code, { language }).value
    } else {
      highlighted = hljs.highlightAuto(code).value
    }
  } catch (_) {
    highlighted = code
  }
  const langClass = language ? ` class="language-${language}"` : ''
  return `<pre><code${langClass}>${highlighted}</code></pre>`
}

marked.use({ renderer, breaks: true, gfm: true })

// DOM 요소
const dropzone = document.getElementById('dropzone')
const markdownView = document.getElementById('markdownView')
const markdownBody = document.getElementById('markdownBody')
const lineGutter = document.getElementById('lineGutter')
const tocPanel = document.getElementById('tocPanel')
const tocList = document.getElementById('tocList')
const filePath = document.getElementById('filePath')
const watchIndicator = document.getElementById('watchIndicator')
const appTitle = document.getElementById('appTitle')
const appVersion = document.getElementById('appVersion')
const btnOpen = document.getElementById('btnOpen')
const btnOpenLarge = document.getElementById('btnOpenLarge')
const btnSave = document.getElementById('btnSave')
const btnMoveLine = document.getElementById('btnMoveLine')
const consoleMenuSwitch = document.getElementById('consoleMenuSwitch')
const consoleMenuText = document.getElementById('consoleMenuText')
const btnMinimize = document.getElementById('btnMinimize')
const btnMaximize = document.getElementById('btnMaximize')
const btnClose = document.getElementById('btnClose')
const btnToc = document.getElementById('btnToc')
const breadcrumbBar = document.getElementById('breadcrumbBar')
const actionToast = document.getElementById('actionToast')
const debugConsole = document.getElementById('debugConsole')
const debugConsoleBody = document.getElementById('debugConsoleBody')
const btnConsoleCopy = document.getElementById('btnConsoleCopy')
const btnConsoleClear = document.getElementById('btnConsoleClear')
const errorModal = document.getElementById('errorModal')
const errorModalMessage = document.getElementById('errorModalMessage')
const btnErrorClose = document.getElementById('btnErrorClose')
const confirmModal = document.getElementById('confirmModal')
const confirmModalMessage = document.getElementById('confirmModalMessage')
const btnConfirmCancel = document.getElementById('btnConfirmCancel')
const btnConfirmProceed = document.getElementById('btnConfirmProceed')
const editModal = document.getElementById('editModal')
const editModalTitle = document.getElementById('editModalTitle')
const editModalInput = document.getElementById('editModalInput')
const btnEditCancel = document.getElementById('btnEditCancel')
const btnEditApply = document.getElementById('btnEditApply')
const tocContextMenu = document.getElementById('tocContextMenu')
const tocContextMenuStatus = document.getElementById('tocContextMenuStatus')
const tocContextMenuDebug = document.getElementById('tocContextMenuDebug')
const tocContextMenuItems = Array.from(tocContextMenu.querySelectorAll('.context-menu-item'))
const readContextMenu = document.getElementById('readContextMenu')
const readContextMenuStatus = document.getElementById('readContextMenuStatus')
const readToggleAutoBlock = document.getElementById('readToggleAutoBlock')
const readToggleHtmlClip = document.getElementById('readToggleHtmlClip')
const readToggleLabels = document.getElementById('readToggleLabels')
const readToggleAutoCopy = document.getElementById('readToggleAutoCopy')
const readToggleStripNumbers = document.getElementById('readToggleStripNumbers')
const labelContextMenu = document.getElementById('labelContextMenu')
const labelContextMenuStatus = document.getElementById('labelContextMenuStatus')
const modeSwitch = document.getElementById('modeSwitch')
const modeText = document.getElementById('modeText')
const advancedMenuSwitch = document.getElementById('advancedMenuSwitch')
const advancedMenuText = document.getElementById('advancedMenuText')
const locationH1Switch = document.getElementById('locationH1Switch')
const locationH2Switch = document.getElementById('locationH2Switch')
const locationH3Switch = document.getElementById('locationH3Switch')
const locationH4Switch = document.getElementById('locationH4Switch')
const locationH5Switch = document.getElementById('locationH5Switch')
const locationH6Switch = document.getElementById('locationH6Switch')
const stripNumbersSwitch = document.getElementById('stripNumbersSwitch')
const stripNumbersText = document.getElementById('stripNumbersText')
// 복사 메뉴 드롭다운 체크박스
const menuAutoBlockSwitch = document.getElementById('menuAutoBlockSwitch')
const menuAutoBlockText = document.getElementById('menuAutoBlockText')
const menuHtmlClipSwitch = document.getElementById('menuHtmlClipSwitch')
const menuHtmlClipText = document.getElementById('menuHtmlClipText')
const menuHideLabelsSwitch = document.getElementById('menuHideLabelsSwitch')
const menuHideLabelsText = document.getElementById('menuHideLabelsText')
const menuAutoCopySwitch = document.getElementById('menuAutoCopySwitch')
const menuAutoCopyText = document.getElementById('menuAutoCopyText')
const viewHeaderPalette = document.getElementById('viewHeaderPalette')
const headerColorItems = Array.from(document.querySelectorAll('.header-color-item'))
const headerFontItems = Array.from(document.querySelectorAll('.header-font-item'))
const btnResetHeaderColors = document.getElementById('btnResetHeaderColors')
const btnResetHeaderFonts = document.getElementById('btnResetHeaderFonts')
const btnResetHeaderLocation = document.getElementById('btnResetHeaderLocation')
const btnResetHeaderFamilies = document.getElementById('btnResetHeaderFamilies')
const viewHeaderFontPicker = document.getElementById('viewHeaderFontPicker')
const viewHeaderFontSelect = document.getElementById('viewHeaderFontSelect')
const viewDefaultFontSelect = document.getElementById('viewDefaultFontSelect')
const viewTemplateName = document.getElementById('viewTemplateName')
const viewTemplateSelect = document.getElementById('viewTemplateSelect')
const btnTemplateSave = document.getElementById('btnTemplateSave')
const headingFontInputs = {
  1: document.getElementById('headingFontH1'),
  2: document.getElementById('headingFontH2'),
  3: document.getElementById('headingFontH3'),
  4: document.getElementById('headingFontH4'),
  5: document.getElementById('headingFontH5'),
  6: document.getElementById('headingFontH6')
}

let scrollRatio = 0
let scrollSaveTimer = null
let pendingRestoreRatio = null
let tocVisible = true
let focusedTocIndex = -1  // 키보드로 포커스된 TOC 항목 인덱스
let tocItems = []         // TOC 항목 배열 (레벨 정보 포함)
let collapsedTocItems = new Set()  // 접힌 TOC 항목 인덱스
let currentFilePath = ''
let contextTarget = null
let lastMenuActionContext = null
let diskContent = ''
let workingContent = ''
let currentDocStats = { maxHeadingLevel: 6, minHeadingLevel: 1, maxListDepth: 0, minListDepth: 0 }
let isDirty = false
let isReadMode = false
let isAdjustingReadSelection = false
let readHideLabels = false
let readAutoCopy = false
let readAutoBlockSelect = true
let readHtmlClip = false
let readStripNumbers = false
let advancedMenu = false
let locationHeadingVisible = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
const DEFAULT_HEADING_COLORS = {
  1: '#89b4fa',
  2: '#7fb0ff',
  3: '#74a7ff',
  4: '#689dff',
  5: '#fab387',
  6: '#e07a45'
}
let headingColors = { ...DEFAULT_HEADING_COLORS }
const DEFAULT_HEADING_FONTS = {
  1: 32,
  2: 24,
  3: 20,
  4: 18,
  5: 18,
  6: 18
}
let headingFonts = { ...DEFAULT_HEADING_FONTS }
let headingFamilies = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' }
let defaultDocumentFont = ''
let activeHeaderColorLevel = 0
let activeHeaderFontLevel = 0
let availableSystemFonts = []
let settingTemplates = {}
let activeTemplateName = ''
let lastAutoCopiedText = ''
let lastReadSelectedBlocks = []
let activeInlineEditor = null
let labelContextTarget = null
let lastJumpedSourceLine = -1
let isConsoleVisible = true
let suppressGlobalMenuCloseUntil = 0
let toastTimer = null
let lastOpenedFilePath = ''
const RAINBOW_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7']

function isHexColor(v) {
  return /^#([0-9a-fA-F]{6})$/.test(String(v || ''))
}

function normalizeHeadingColorMap(input = {}) {
  const out = {}
  for (let level = 1; level <= 6; level++) {
    const raw = input[level]
    out[level] = isHexColor(raw) ? String(raw).toLowerCase() : DEFAULT_HEADING_COLORS[level]
  }
  return out
}

function normalizeHeadingFontMap(input = {}) {
  const out = {}
  for (let level = 1; level <= 6; level++) {
    const raw = Number(input[level])
    out[level] = Number.isFinite(raw) && raw >= 12 && raw <= 48 ? Math.round(raw) : DEFAULT_HEADING_FONTS[level]
  }
  return out
}

function applyHeadingColors() {
  for (let level = 1; level <= 6; level++) {
    const key = `--heading-color-h${level}`
    const value = headingColors[level]
    if (isHexColor(value)) {
      document.documentElement.style.setProperty(key, String(value).toLowerCase())
    } else {
      document.documentElement.style.removeProperty(key)
    }
  }
}

function applyHeadingFonts() {
  for (let level = 1; level <= 6; level++) {
    const key = `--heading-font-h${level}`
    const value = Number(headingFonts[level])
    if (Number.isFinite(value) && value >= 12 && value <= 48) {
      document.documentElement.style.setProperty(key, `${Math.round(value)}px`)
    } else {
      document.documentElement.style.removeProperty(key)
    }
  }
}

function applyHeadingFamilies() {
  for (let level = 1; level <= 6; level++) {
    const key = `--heading-family-h${level}`
    const value = String(headingFamilies[level] || '').trim()
    if (value) {
      const escaped = value.replace(/'/g, "\\'")
      document.documentElement.style.setProperty(key, `'${escaped}'`)
    } else {
      document.documentElement.style.removeProperty(key)
    }
  }
}

function applyDefaultDocumentFont() {
  const value = String(defaultDocumentFont || '').trim()
  if (value) {
    const escaped = value.replace(/'/g, "\\'")
    document.documentElement.style.setProperty('--doc-font-family', `'${escaped}'`)
  } else {
    document.documentElement.style.removeProperty('--doc-font-family')
  }
}

function updateHeaderColorItemUi() {
  const swatches = Array.from(document.querySelectorAll('.header-color-swatch'))
  swatches.forEach((swatch) => {
    const level = Number(swatch.dataset.level)
    const color = headingColors[level]
    if (isHexColor(color)) {
      swatch.style.background = color
      swatch.classList.add('has-color')
    } else {
      swatch.style.background = 'transparent'
      swatch.classList.remove('has-color')
    }
  })
}

function updateHeadingFontInputUi() {
  for (let level = 1; level <= 6; level++) {
    const input = headingFontInputs[level]
    if (!input) continue
    input.value = String(headingFonts[level])
  }
}

function normalizeHeadingFamilyMap(input = {}) {
  const out = {}
  for (let level = 1; level <= 6; level++) {
    out[level] = String(input[level] || '').trim()
  }
  return out
}

function normalizeTemplateMap(input = {}) {
  const out = {}
  if (!input || typeof input !== 'object') return out
  Object.entries(input).forEach(([name, value]) => {
    const key = String(name || '').trim().slice(0, 40)
    if (!key) return
    const src = value && typeof value === 'object' ? value : {}
    out[key] = {
      advancedMenu: !!src.advancedMenu,
      consoleVisible: src.consoleVisible !== false,
      locationShowH1: src.locationShowH1 !== false,
      locationShowH2: src.locationShowH2 !== false,
      locationShowH3: src.locationShowH3 !== false,
      locationShowH4: src.locationShowH4 !== false,
      locationShowH5: src.locationShowH5 !== false,
      locationShowH6: src.locationShowH6 !== false,
      headingColorH1: isHexColor(src.headingColorH1) ? String(src.headingColorH1).toLowerCase() : DEFAULT_HEADING_COLORS[1],
      headingColorH2: isHexColor(src.headingColorH2) ? String(src.headingColorH2).toLowerCase() : DEFAULT_HEADING_COLORS[2],
      headingColorH3: isHexColor(src.headingColorH3) ? String(src.headingColorH3).toLowerCase() : DEFAULT_HEADING_COLORS[3],
      headingColorH4: isHexColor(src.headingColorH4) ? String(src.headingColorH4).toLowerCase() : DEFAULT_HEADING_COLORS[4],
      headingColorH5: isHexColor(src.headingColorH5) ? String(src.headingColorH5).toLowerCase() : DEFAULT_HEADING_COLORS[5],
      headingColorH6: isHexColor(src.headingColorH6) ? String(src.headingColorH6).toLowerCase() : DEFAULT_HEADING_COLORS[6],
      headingFontH1: Number.isFinite(Number(src.headingFontH1)) ? Math.max(12, Math.min(48, Math.round(Number(src.headingFontH1)))) : DEFAULT_HEADING_FONTS[1],
      headingFontH2: Number.isFinite(Number(src.headingFontH2)) ? Math.max(12, Math.min(48, Math.round(Number(src.headingFontH2)))) : DEFAULT_HEADING_FONTS[2],
      headingFontH3: Number.isFinite(Number(src.headingFontH3)) ? Math.max(12, Math.min(48, Math.round(Number(src.headingFontH3)))) : DEFAULT_HEADING_FONTS[3],
      headingFontH4: Number.isFinite(Number(src.headingFontH4)) ? Math.max(12, Math.min(48, Math.round(Number(src.headingFontH4)))) : DEFAULT_HEADING_FONTS[4],
      headingFontH5: Number.isFinite(Number(src.headingFontH5)) ? Math.max(12, Math.min(48, Math.round(Number(src.headingFontH5)))) : DEFAULT_HEADING_FONTS[5],
      headingFontH6: Number.isFinite(Number(src.headingFontH6)) ? Math.max(12, Math.min(48, Math.round(Number(src.headingFontH6)))) : DEFAULT_HEADING_FONTS[6],
      headingFamilyH1: String(src.headingFamilyH1 || '').trim(),
      headingFamilyH2: String(src.headingFamilyH2 || '').trim(),
      headingFamilyH3: String(src.headingFamilyH3 || '').trim(),
      headingFamilyH4: String(src.headingFamilyH4 || '').trim(),
      headingFamilyH5: String(src.headingFamilyH5 || '').trim(),
      headingFamilyH6: String(src.headingFamilyH6 || '').trim(),
      defaultDocumentFont: String(src.defaultDocumentFont || '').trim()
    }
  })
  return out
}

function renderTemplateOptions() {
  if (!viewTemplateSelect) return
  viewTemplateSelect.innerHTML = ''
  const base = document.createElement('option')
  base.value = ''
  base.textContent = '템플릿 선택'
  viewTemplateSelect.appendChild(base)
  Object.keys(settingTemplates).sort((a, b) => a.localeCompare(b, 'ko-KR')).forEach((name) => {
    const opt = document.createElement('option')
    opt.value = name
    opt.textContent = name
    viewTemplateSelect.appendChild(opt)
  })
  viewTemplateSelect.value = settingTemplates[activeTemplateName] ? activeTemplateName : ''
}

function collectTemplateSettings() {
  return {
    advancedMenu,
    consoleVisible: isConsoleVisible,
    locationShowH1: !!locationHeadingVisible[1],
    locationShowH2: !!locationHeadingVisible[2],
    locationShowH3: !!locationHeadingVisible[3],
    locationShowH4: !!locationHeadingVisible[4],
    locationShowH5: !!locationHeadingVisible[5],
    locationShowH6: !!locationHeadingVisible[6],
    headingColorH1: headingColors[1] || DEFAULT_HEADING_COLORS[1],
    headingColorH2: headingColors[2] || DEFAULT_HEADING_COLORS[2],
    headingColorH3: headingColors[3] || DEFAULT_HEADING_COLORS[3],
    headingColorH4: headingColors[4] || DEFAULT_HEADING_COLORS[4],
    headingColorH5: headingColors[5] || DEFAULT_HEADING_COLORS[5],
    headingColorH6: headingColors[6] || DEFAULT_HEADING_COLORS[6],
    headingFontH1: headingFonts[1] || DEFAULT_HEADING_FONTS[1],
    headingFontH2: headingFonts[2] || DEFAULT_HEADING_FONTS[2],
    headingFontH3: headingFonts[3] || DEFAULT_HEADING_FONTS[3],
    headingFontH4: headingFonts[4] || DEFAULT_HEADING_FONTS[4],
    headingFontH5: headingFonts[5] || DEFAULT_HEADING_FONTS[5],
    headingFontH6: headingFonts[6] || DEFAULT_HEADING_FONTS[6],
    headingFamilyH1: headingFamilies[1] || '',
    headingFamilyH2: headingFamilies[2] || '',
    headingFamilyH3: headingFamilies[3] || '',
    headingFamilyH4: headingFamilies[4] || '',
    headingFamilyH5: headingFamilies[5] || '',
    headingFamilyH6: headingFamilies[6] || '',
    defaultDocumentFont: defaultDocumentFont || ''
  }
}

function applyTemplateSettings(template) {
  const safe = normalizeTemplateMap({ __tmp: template }).__tmp
  if (!safe) return
  advancedMenu = !!safe.advancedMenu
  locationHeadingVisible = {
    1: safe.locationShowH1 !== false,
    2: safe.locationShowH2 !== false,
    3: safe.locationShowH3 !== false,
    4: safe.locationShowH4 !== false,
    5: safe.locationShowH5 !== false,
    6: safe.locationShowH6 !== false
  }
  headingColors = normalizeHeadingColorMap({
    1: safe.headingColorH1,
    2: safe.headingColorH2,
    3: safe.headingColorH3,
    4: safe.headingColorH4,
    5: safe.headingColorH5,
    6: safe.headingColorH6
  })
  headingFonts = normalizeHeadingFontMap({
    1: safe.headingFontH1,
    2: safe.headingFontH2,
    3: safe.headingFontH3,
    4: safe.headingFontH4,
    5: safe.headingFontH5,
    6: safe.headingFontH6
  })
  headingFamilies = normalizeHeadingFamilyMap({
    1: safe.headingFamilyH1,
    2: safe.headingFamilyH2,
    3: safe.headingFamilyH3,
    4: safe.headingFamilyH4,
    5: safe.headingFamilyH5,
    6: safe.headingFamilyH6
  })
  defaultDocumentFont = String(safe.defaultDocumentFont || '').trim()
  updateAdvancedMenuToggleUi()
  updateLocationHeadingToggleUi()
  updateReadMenuButtons()
  applyHeadingColors()
  applyHeadingFonts()
  applyHeadingFamilies()
  applyDefaultDocumentFont()
  updateHeaderColorItemUi()
  updateHeadingFontInputUi()
  updateHeaderFontItemUi()
  updateBreadcrumb()
  if (viewDefaultFontSelect) {
    const current = defaultDocumentFont
    if (current && !Array.from(viewDefaultFontSelect.options).some((opt) => opt.value === current)) {
      const custom = document.createElement('option')
      custom.value = current
      custom.textContent = `${current} (현재)`
      viewDefaultFontSelect.appendChild(custom)
    }
    viewDefaultFontSelect.value = current
  }
  setConsoleVisibility(safe.consoleVisible !== false)
}

function updateHeaderFontItemUi() {
  headerFontItems.forEach((item) => {
    const level = Number(item.dataset.level)
    const family = String(headingFamilies[level] || '').trim()
    item.title = family ? `헤더${level} 폰트: ${family}` : `헤더${level} 폰트 선택`
    if (family) {
      const escaped = family.replace(/'/g, "\\'")
      item.style.fontFamily = `'${escaped}'`
    } else {
      item.style.fontFamily = ''
    }
  })
}

function closeHeaderColorPalette() {
  activeHeaderColorLevel = 0
  if (viewHeaderPalette) viewHeaderPalette.style.display = 'none'
}

function openHeaderColorPalette(level) {
  activeHeaderColorLevel = level
  closeHeaderFontPicker()
  if (!viewHeaderPalette) return
  viewHeaderPalette.style.display = 'flex'
}

function renderHeaderColorPalette() {
  if (!viewHeaderPalette) return
  viewHeaderPalette.innerHTML = ''
  RAINBOW_COLORS.forEach((color, idx) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'breadcrumb-color-dot'
    btn.dataset.color = color
    btn.title = `색상 ${idx + 1}`
    btn.style.background = color
    btn.addEventListener('click', () => {
      if (!activeHeaderColorLevel) return
      headingColors[activeHeaderColorLevel] = color
      applyHeadingColors()
      updateHeaderColorItemUi()
      saveUiSettings()
      closeHeaderColorPalette()
    })
    viewHeaderPalette.appendChild(btn)
  })
}

function closeHeaderFontPicker() {
  activeHeaderFontLevel = 0
  if (viewHeaderFontPicker) viewHeaderFontPicker.style.display = 'none'
}

function openHeaderFontPicker(level) {
  activeHeaderFontLevel = level
  closeHeaderColorPalette()
  if (!viewHeaderFontPicker || !viewHeaderFontSelect) return
  const current = String(headingFamilies[level] || '')
  viewHeaderFontSelect.dataset.level = String(level)
  if (current && !Array.from(viewHeaderFontSelect.options).some((opt) => opt.value === current)) {
    const custom = document.createElement('option')
    custom.value = current
    custom.textContent = `${current} (현재)`
    viewHeaderFontSelect.appendChild(custom)
  }
  viewHeaderFontSelect.value = current
  viewHeaderFontPicker.style.display = 'block'
}

function renderHeaderFontPickerOptions() {
  if (viewHeaderFontSelect) {
    viewHeaderFontSelect.innerHTML = ''
    const base = document.createElement('option')
    base.value = ''
    base.textContent = '기본 폰트(문서)'
    viewHeaderFontSelect.appendChild(base)
    availableSystemFonts.forEach((font) => {
      const opt = document.createElement('option')
      opt.value = font
      opt.textContent = font
      viewHeaderFontSelect.appendChild(opt)
    })
  }
  if (viewDefaultFontSelect) {
    viewDefaultFontSelect.innerHTML = ''
    const base = document.createElement('option')
    base.value = ''
    base.textContent = '문서 기본 폰트: 앱 기본'
    viewDefaultFontSelect.appendChild(base)
    availableSystemFonts.forEach((font) => {
      const opt = document.createElement('option')
      opt.value = font
      opt.textContent = font
      viewDefaultFontSelect.appendChild(opt)
    })
  }
}

async function loadSystemFonts() {
  try {
    const result = await ipcRenderer.invoke('app:listSystemFonts')
    if (result?.ok && Array.isArray(result.fonts)) {
      availableSystemFonts = Array.from(new Set(result.fonts.map((f) => String(f || '').trim()).filter(Boolean)))
    }
  } catch (_) {}
  if (!availableSystemFonts.length) {
    availableSystemFonts = ['맑은 고딕', 'Malgun Gothic', 'Arial', 'Times New Roman', 'Consolas']
  }
  renderHeaderFontPickerOptions()
}

function appendDebugLog(level, message) {
  if (!debugConsoleBody) return
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const lvl = String(level || 'INFO').toUpperCase()
  const line = `[${hh}:${mm}:${ss}] [${lvl}] ${String(message || '')}`
  const div = document.createElement('div')
  div.className = `debug-console-line ${lvl === 'ERROR' ? 'error' : ''}`.trim()
  div.textContent = line
  debugConsoleBody.appendChild(div)
  while (debugConsoleBody.childNodes.length > 400) {
    debugConsoleBody.removeChild(debugConsoleBody.firstChild)
  }
  debugConsoleBody.scrollTop = debugConsoleBody.scrollHeight
}

function getActionLabel(action) {
  const map = {
    shiftUp: '위계 한 단계 위로',
    shiftDown: '위계 한 단계 아래로',
    toBullet: '헤더 -> 블릿',
    toHeading: '블릿 -> 헤더',
    editContent: '내용 편집'
  }
  return map[action] || String(action || '')
}

function showSuccessToast(message) {
  if (!actionToast) return
  actionToast.textContent = String(message || '완료되었습니다.')
  actionToast.style.display = 'block'
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    actionToast.style.display = 'none'
  }, 1600)
}

function updateSyncIndicatorText(message) {
  if (!watchIndicator) return
  const text = String(message || '').trim()
  if (!text) {
    watchIndicator.innerHTML = '<span class="dot"></span> 자동 동기화 중'
    return
  }
  watchIndicator.innerHTML = `<span class="dot"></span> ${text}`
}

async function invokeWithTimeout(channel, payload, timeoutMs = 8000) {
  let timer = null
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`IPC_TIMEOUT:${channel}`)), timeoutMs)
    })
    return await Promise.race([ipcRenderer.invoke(channel, payload), timeoutPromise])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function setConsoleVisibility(nextVisible) {
  isConsoleVisible = !!nextVisible
  if (!debugConsole) return
  debugConsole.classList.toggle('hidden', !isConsoleVisible)
  if (consoleMenuSwitch) consoleMenuSwitch.checked = isConsoleVisible
  if (consoleMenuText) consoleMenuText.textContent = `콘솔: ${isConsoleVisible ? '켬' : '끔'}`
}

function splitEditableLine(line) {
  const src = String(line || '')
  let m = src.match(/^(\s{0,3}#{1,6}[ \t]+)(.*)$/)
  if (m) return { prefix: m[1], content: m[2] }
  m = src.match(/^(\s*[-+*][ \t]+)(.*)$/)
  if (m) return { prefix: m[1], content: m[2] }
  m = src.match(/^(\s*\d+[.)][ \t]+)(.*)$/)
  if (m) return { prefix: m[1], content: m[2] }
  m = src.match(/^(\s*>+[ \t]*)(.*)$/)
  if (m) return { prefix: m[1], content: m[2] }
  return { prefix: '', content: src }
}

function splitLabelFromContent(content) {
  const src = String(content || '')
  const m = src.match(/^(\s*(?:\*\*)?\[[가-힣A-Za-z]{1,8}\](?:\*\*)?\s*)(.*)$/)
  if (!m) return { labelPart: '', body: src }
  return { labelPart: m[1], body: m[2] }
}

function detectLabelStyle(labelPart) {
  const raw = String(labelPart || '')
  return {
    isBold: raw.includes('**[') && raw.includes(']**')
  }
}

function buildLabelToken(labelName, style) {
  const token = `[${labelName}]`
  return style && style.isBold ? `**${token}**` : token
}

function toEditorDisplayText(text) {
  return String(text || '').replace(/<br\s*\/?>/gi, '\n')
}

function fromEditorDisplayText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br>')
}

const BLOCK_SELECTORS = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, hr'

function buildContextStatusText(contextInfo = {}) {
  const { kind = 'text', level = null, bulletDepth = null, targets = [], scope = 'single' } = contextInfo
  const mode = scope === 'group' ? '그룹 이동' : '나혼자 이동'
  const countSuffix = targets.length > 1 ? ` (${targets.length}개)` : ''
  if (kind === 'table') return `표 편집 | 선택 셀${countSuffix}`
  if (kind === 'heading' && level) return `${mode} | 헤더 H${level}${countSuffix}`
  if (kind === 'bullet') {
    const depthLabel = Number.isInteger(bulletDepth) ? ` D${bulletDepth}` : ''
    return `${mode} | 블릿${depthLabel}${countSuffix}`
  }
  if (kind === 'numbered') {
    const depthLabel = Number.isInteger(bulletDepth) ? ` D${bulletDepth}` : ''
    return `${mode} | 번호목록${depthLabel}${countSuffix}`
  }
  return `${mode} | 일반 텍스트${countSuffix}`
}

function setDirty(next) {
  isDirty = !!next
  btnSave.disabled = !isDirty
}

function showErrorModal(message) {
  errorModalMessage.textContent = message || '알 수 없는 오류가 발생했습니다.'
  errorModal.style.display = 'flex'
  appendDebugLog('ERROR', message || '알 수 없는 오류가 발생했습니다.')
}

function hideErrorModal() {
  errorModal.style.display = 'none'
}

function askConfirm(message) {
  return new Promise((resolve) => {
    confirmModalMessage.textContent = message
    confirmModal.style.display = 'flex'

    const cleanup = () => {
      confirmModal.style.display = 'none'
      btnConfirmCancel.removeEventListener('click', onCancel)
      btnConfirmProceed.removeEventListener('click', onProceed)
      confirmModal.removeEventListener('click', onBackdrop)
    }
    const onCancel = () => {
      cleanup()
      resolve(false)
    }
    const onProceed = () => {
      cleanup()
      resolve(true)
    }
    const onBackdrop = (e) => {
      if (e.target === confirmModal) onCancel()
    }

    btnConfirmCancel.addEventListener('click', onCancel)
    btnConfirmProceed.addEventListener('click', onProceed)
    confirmModal.addEventListener('click', onBackdrop)
  })
}

function askTextEdit(title, initialValue) {
  return new Promise((resolve) => {
    editModalTitle.textContent = title || '편집'
    editModalInput.value = String(initialValue || '')
    editModal.style.display = 'flex'
    setTimeout(() => {
      editModalInput.focus()
      editModalInput.select()
    }, 0)

    const cleanup = () => {
      editModal.style.display = 'none'
      btnEditCancel.removeEventListener('click', onCancel)
      btnEditApply.removeEventListener('click', onApply)
      editModal.removeEventListener('click', onBackdrop)
      editModalInput.removeEventListener('keydown', onKeydown)
    }
    const onCancel = () => {
      cleanup()
      resolve(null)
    }
    const onApply = () => {
      const value = editModalInput.value
      cleanup()
      resolve(value)
    }
    const onBackdrop = (e) => {
      if (e.target === editModal) onCancel()
    }
    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
        e.preventDefault()
        onApply()
      }
    }

    btnEditCancel.addEventListener('click', onCancel)
    btnEditApply.addEventListener('click', onApply)
    editModal.addEventListener('click', onBackdrop)
    editModalInput.addEventListener('keydown', onKeydown)
  })
}

function isSelectionNearElementEnd(selectedText, elementText) {
  const s = String(selectedText || '').replace(/\s+/g, ' ').trim()
  const e = String(elementText || '').replace(/\s+/g, ' ').trim()
  if (!s || !e) return false
  if (s.length <= 2) return true
  if (!e.endsWith(s)) return false
  return s.length <= Math.min(8, Math.floor(e.length * 0.2))
}

function inferPromoteHeadingLevelFromLi(li) {
  const headings = Array.from(markdownBody.querySelectorAll('h1, h2, h3, h4'))
  let prevLevel = 1
  for (const h of headings) {
    const rel = h.compareDocumentPosition(li)
    if (rel & Node.DOCUMENT_POSITION_FOLLOWING) {
      prevLevel = Number(h.tagName[1])
    } else {
      break
    }
  }
  return Math.min(prevLevel + 1, 4)
}

function uniqueDeepestLis(lis) {
  return lis.filter((li, _, arr) => !arr.some((other) => other !== li && li.contains(other)))
}

function getListDepth(li) {
  let depth = 0
  let node = li
  while (node) {
    const parentList = node.parentElement ? node.parentElement.closest('ul, ol') : null
    if (!parentList) break
    depth += 1
    const parentLi = parentList.parentElement ? parentList.parentElement.closest('li') : null
    node = parentLi
  }
  return Math.max(1, depth)
}

function getListOwnText(li) {
  const cloned = li.cloneNode(true)
  const nested = cloned.querySelectorAll('ul, ol')
  nested.forEach((n) => n.remove())
  return (cloned.textContent || '').trim()
}

function parseHeadingLine(line) {
  const m = line.match(/^(\s{0,3})(#{1,6})([ \t]+)(.*)$/)
  if (!m) return null
  return { level: m[2].length, text: m[4] }
}

function parseListLine(line) {
  const src = String(line || '')
  let m = src.match(/^\s*(?:>\s*)*([-+*])([ \t]+)(.*)$/)
  if (m) return { text: m[3] }
  m = src.match(/^\s*(?:>\s*)*(\d+[.)])([ \t]+)(.*)$/)
  if (m) return { text: m[3] }
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

function buildLineBasedContext(sourceLine, targetEl, selectedText = '') {
  const lines = String(workingContent || '').split(/\r?\n/)
  if (!Number.isInteger(sourceLine) || sourceLine < 0 || sourceLine >= lines.length) return null

  // DOM 우선 판정: 리스트/헤더 내부 클릭 시 하위 p/span이 선택되어도
  // 상위 구조(li/hx) 기준으로 위계 이동 액션을 유지한다.
  const headingEl = targetEl && targetEl.closest ? targetEl.closest('h1, h2, h3, h4') : null
  if (headingEl) {
    const headingLine = Number(headingEl.dataset.srcLine)
    const resolvedLine = Number.isInteger(headingLine) ? headingLine : sourceLine
    const level = Number(headingEl.tagName[1]) || 2
    return {
      kind: 'heading',
      level,
      targetType: 'heading',
      sourceLine: resolvedLine,
      targets: [{ targetType: 'heading', sourceLine: resolvedLine }],
      selectedText,
      debugBlocks: [{ sourceLine: resolvedLine, text: (headingEl.textContent || '').trim() }],
      anchorElement: headingEl,
      allowedActions: ['editContent', 'shiftUp', 'shiftDown', 'toBullet']
    }
  }

  const liEl = targetEl && targetEl.closest ? targetEl.closest('li') : null
  if (liEl) {
    const liLine = Number(liEl.dataset.srcLine)
    const resolvedLine = Number.isInteger(liLine) ? liLine : sourceLine
    const allLis = Array.from(markdownBody.querySelectorAll('li'))
    const listIndex = allLis.findIndex((item) => item === liEl)
    const isNumbered = !!liEl.closest('ol')
    return {
      kind: isNumbered ? 'numbered' : 'bullet',
      targetType: 'list',
      sourceLine: resolvedLine,
      targets: [{
        targetType: 'list',
        listIndex: listIndex >= 0 ? listIndex : undefined,
        sourceLine: resolvedLine,
        listText: getListOwnText(liEl)
      }],
      bulletDepth: getListDepth(liEl),
      promoteHeadingLevel: inferPromoteHeadingLevelFromLi(liEl),
      selectedText,
      debugBlocks: [{ sourceLine: resolvedLine, text: getListOwnText(liEl) }],
      anchorElement: liEl,
      allowedActions: ['editContent', 'shiftUp', 'shiftDown', 'toHeading']
    }
  }

  const line = lines[sourceLine] || ''
  const heading = line.match(/^(\s{0,3})(#{1,6})([ \t]+)(.*)$/)
  if (heading) {
    const level = heading[2].length
    return {
      kind: 'heading',
      level,
      targetType: 'heading',
      sourceLine,
      targets: [{ targetType: 'heading', sourceLine }],
      selectedText,
      debugBlocks: [{ sourceLine, text: heading[4] || line.trim() }],
      anchorElement: targetEl && targetEl.closest ? targetEl.closest(BLOCK_SELECTORS) : null,
      allowedActions: ['editContent', 'shiftUp', 'shiftDown', 'toBullet']
    }
  }

  const bullet = line.match(/^(\s*)([-+*])([ \t]+)(.*)$/)
  const numbered = line.match(/^(\s*)(\d+[.)])([ \t]+)(.*)$/)
  const listMatch = bullet || numbered
  if (listMatch) {
    const li = targetEl && targetEl.closest ? targetEl.closest('li') : null
    const allLis = Array.from(markdownBody.querySelectorAll('li'))
    const listIndex = li ? allLis.findIndex((item) => item === li) : -1
    const listText = li ? getListOwnText(li) : (listMatch[4] || '').trim()
    const kind = numbered ? 'numbered' : 'bullet'
    const indent = (listMatch[1] || '').length
    const bulletDepth = li ? getListDepth(li) : Math.floor(indent / 2) + 1
    const promoteHeadingLevel = li ? inferPromoteHeadingLevelFromLi(li) : 2
    return {
      kind,
      targetType: 'list',
      sourceLine,
      targets: [{
        targetType: 'list',
        listIndex: listIndex >= 0 ? listIndex : undefined,
        sourceLine,
        listText
      }],
      bulletDepth,
      promoteHeadingLevel,
      selectedText,
      debugBlocks: [{ sourceLine, text: listText || line.trim() }],
      anchorElement: li || (targetEl && targetEl.closest ? targetEl.closest(BLOCK_SELECTORS) : null),
      allowedActions: ['editContent', 'shiftUp', 'shiftDown', 'toHeading']
    }
  }

  return {
    kind: 'text',
    targetType: 'line',
    sourceLine,
    selectedText,
    debugBlocks: [{ sourceLine, text: line.trim() }],
    anchorElement: targetEl && targetEl.closest ? targetEl.closest(BLOCK_SELECTORS) : null,
    allowedActions: ['editContent']
  }
}

function annotateSourceLines(content) {
  const lines = String(content || '').split(/\r?\n/)
  const headingSrc = []
  const listSrc = []
  const paraSrc = []
  const quoteSrc = []
  const preSrc = []
  const hrSrc = []
  const tableSrc = []

  const isHrLine = (line) => /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(String(line || ''))
  const isQuoteLine = (line) => /^\s*>/.test(String(line || ''))
  const isFenceStart = (line) => /^\s*(```+|~~~+)/.test(String(line || ''))
  const isTableSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(String(line || ''))
  const isTableLike = (line) => /\|/.test(String(line || ''))

  let inFence = false
  let fenceChar = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = String(line || '').trim()
    if (!trimmed) continue

    const fence = line.match(/^\s*(```+|~~~+)/)
    if (fence) {
      const ch = fence[1][0]
      if (!inFence) {
        inFence = true
        fenceChar = ch
        preSrc.push({ start: i, end: i })
      } else if (ch === fenceChar) {
        inFence = false
        fenceChar = ''
      }
      continue
    }
    if (inFence) continue

    const h = parseHeadingLine(line)
    if (h && h.level >= 1 && h.level <= 6) {
      headingSrc.push({ line: i, level: h.level })
      continue
    }

    if (parseListLine(line)) {
      listSrc.push(i)
      continue
    }

    if (isHrLine(line)) {
      hrSrc.push({ start: i, end: i })
      continue
    }

    if (isQuoteLine(line)) {
      const start = i
      while (i + 1 < lines.length && isQuoteLine(lines[i + 1])) i += 1
      quoteSrc.push({ start, end: i })
      continue
    }

    if (isTableLike(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const start = i
      i += 1
      while (i + 1 < lines.length && String(lines[i + 1] || '').trim() && isTableLike(lines[i + 1])) i += 1
      tableSrc.push({ start, end: i })
      continue
    }

    const start = i
    while (i + 1 < lines.length) {
      const next = lines[i + 1]
      const nextTrim = String(next || '').trim()
      if (!nextTrim) break
      if (isFenceStart(next) || isHrLine(next) || isQuoteLine(next) || parseHeadingLine(next) || parseListLine(next)) break
      if (isTableLike(next) && i + 2 < lines.length && isTableSeparator(lines[i + 2])) break
      i += 1
    }
    paraSrc.push({ start, end: i })
  }

  const mapBySequence = (elements, srcRanges) => {
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      const range = srcRanges[i]
      if (range && Number.isInteger(range.start) && Number.isInteger(range.end)) {
        el.dataset.srcLine = String(range.start)
        el.dataset.srcStart = String(range.start)
        el.dataset.srcEnd = String(range.end)
      } else {
        delete el.dataset.srcLine
        delete el.dataset.srcStart
        delete el.dataset.srcEnd
      }
    }
  }

  const mapListByStableOrder = (elements) => {
    const ranges = listSrc.map((line) => ({ start: line, end: line }))
    mapBySequence(elements, ranges)
  }

  const domHeadings = Array.from(markdownBody.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  let hCursor = 0
  for (const el of domHeadings) {
    const level = Number(el.tagName[1])
    let src = undefined
    for (let j = hCursor; j < headingSrc.length; j++) {
      if (headingSrc[j].level !== level) continue
      src = headingSrc[j].line
      hCursor = j + 1
      break
    }
    if (Number.isInteger(src)) {
      el.dataset.srcLine = String(src)
      el.dataset.srcStart = String(src)
      el.dataset.srcEnd = String(src)
    } else {
      delete el.dataset.srcLine
      delete el.dataset.srcStart
      delete el.dataset.srcEnd
    }
  }

  mapListByStableOrder(Array.from(markdownBody.querySelectorAll('li')))
  mapBySequence(Array.from(markdownBody.querySelectorAll('p')), paraSrc)
  mapBySequence(Array.from(markdownBody.querySelectorAll('blockquote')), quoteSrc)
  mapBySequence(Array.from(markdownBody.querySelectorAll('pre')), preSrc)
  mapBySequence(Array.from(markdownBody.querySelectorAll('hr')), hrSrc)
  mapBySequence(Array.from(markdownBody.querySelectorAll('table')), tableSrc)

  // NOTE: li 매핑은 원문 순서를 절대 유지하면서 근거리 텍스트만 보조로 사용한다.
}

function applyLineGuideMarkers(content) {
  void content
  Array.from(markdownBody.querySelectorAll('.line-gap-placeholder')).forEach((el) => el.remove())
  const blocks = Array.from(markdownBody.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, hr'))
  blocks.forEach((el) => {
    const nestedParagraph = el.tagName === 'P' && !!el.closest('li, blockquote, td, th')
    if (nestedParagraph) {
      el.classList.remove('has-line-guide')
      delete el.dataset.lineNo
      return
    }
    const src = Number(el.dataset.srcLine)
    const start = Number(el.dataset.srcStart)
    const end = Number(el.dataset.srcEnd)
    if (Number.isInteger(src) && src >= 0) {
      el.classList.add('has-line-guide')
      if (Number.isInteger(start) && Number.isInteger(end) && end > start) {
        el.dataset.lineNo = `${start + 1}~${end + 1}`
      } else {
        el.dataset.lineNo = String(src + 1)
      }
    } else {
      el.classList.remove('has-line-guide')
      delete el.dataset.lineNo
    }
  })

  // 정확도 우선: 가짜 라인 생성 방지를 위해 placeholder 번호 생성은 비활성화.
}

function renderLineGutter() {
  if (!lineGutter) return
  lineGutter.style.display = 'none'
  lineGutter.innerHTML = ''
}

function resetTableMarkerMergeView() {
  const hiddenCells = markdownBody.querySelectorAll('td.marker-merged, th.marker-merged')
  hiddenCells.forEach((cell) => {
    cell.style.display = ''
    cell.classList.remove('marker-merged')
  })

  const mergedAnchors = markdownBody.querySelectorAll('td[data-merge-orig-colspan], th[data-merge-orig-colspan], td[data-merge-orig-rowspan], th[data-merge-orig-rowspan]')
  mergedAnchors.forEach((cell) => {
    if (cell.dataset.mergeOrigColspan !== undefined) {
      const raw = cell.dataset.mergeOrigColspan
      if (!raw || raw === '1') cell.removeAttribute('colspan')
      else cell.setAttribute('colspan', raw)
      delete cell.dataset.mergeOrigColspan
    }
    if (cell.dataset.mergeOrigRowspan !== undefined) {
      const raw = cell.dataset.mergeOrigRowspan
      if (!raw || raw === '1') cell.removeAttribute('rowspan')
      else cell.setAttribute('rowspan', raw)
      delete cell.dataset.mergeOrigRowspan
    }
  })
}

function increaseCellSpan(cell, axis, amount = 1) {
  if (!cell || amount <= 0) return
  if (axis === 'col') {
    if (cell.dataset.mergeOrigColspan === undefined) {
      cell.dataset.mergeOrigColspan = cell.getAttribute('colspan') || '1'
    }
    const current = Number(cell.getAttribute('colspan') || '1')
    cell.setAttribute('colspan', String(Math.max(1, current + amount)))
    return
  }
  if (cell.dataset.mergeOrigRowspan === undefined) {
    cell.dataset.mergeOrigRowspan = cell.getAttribute('rowspan') || '1'
  }
  const current = Number(cell.getAttribute('rowspan') || '1')
  cell.setAttribute('rowspan', String(Math.max(1, current + amount)))
}

function applyTableMarkerMergeView() {
  resetTableMarkerMergeView()
  if (!isReadMode) return

  const tables = Array.from(markdownBody.querySelectorAll('table'))
  tables.forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr'))
    let prevAnchors = []

    rows.forEach((row) => {
      const cells = Array.from(row.children).filter((el) => el.tagName === 'TD' || el.tagName === 'TH')
      const currAnchors = []
      let logicalCol = 0

      cells.forEach((cell) => {
        const colspan = Math.max(1, Number(cell.getAttribute('colspan') || '1') || 1)
        const marker = String(cell.textContent || '').replace(/\u00A0/g, ' ').trim().toUpperCase()

        if (marker === '=CS=') {
          const leftAnchor = currAnchors[logicalCol - 1]
          if (leftAnchor) {
            increaseCellSpan(leftAnchor, 'col', colspan)
            cell.style.display = 'none'
            cell.classList.add('marker-merged')
            for (let i = 0; i < colspan; i++) currAnchors[logicalCol + i] = leftAnchor
          } else {
            for (let i = 0; i < colspan; i++) currAnchors[logicalCol + i] = cell
          }
          logicalCol += colspan
          return
        }

        if (marker === '=RS=') {
          const upAnchor = prevAnchors[logicalCol]
          if (upAnchor) {
            increaseCellSpan(upAnchor, 'row', 1)
            cell.style.display = 'none'
            cell.classList.add('marker-merged')
            for (let i = 0; i < colspan; i++) currAnchors[logicalCol + i] = upAnchor
          } else {
            for (let i = 0; i < colspan; i++) currAnchors[logicalCol + i] = cell
          }
          logicalCol += colspan
          return
        }

        for (let i = 0; i < colspan; i++) currAnchors[logicalCol + i] = cell
        logicalCol += colspan
      })

      prevAnchors = currAnchors
    })
  })
}

function getCurrentSourceLineFromSelection() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return -1
  const node = selection.focusNode
  const target = node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node
  const info = getLineEditInfoFromTarget(target)
  return info && Number.isInteger(info.sourceLine) ? info.sourceLine : -1
}

function findBestBlockForSourceLine(sourceLine) {
  const blocks = Array.from(markdownBody.querySelectorAll('[data-src-start][data-src-end]'))
    .map((el) => ({
      el,
      start: Number(el.dataset.srcStart),
      end: Number(el.dataset.srcEnd)
    }))
    .filter((x) => Number.isInteger(x.start) && Number.isInteger(x.end))
    .sort((a, b) => a.start - b.start)
  if (!blocks.length) return null
  const inRange = blocks.find((b) => sourceLine >= b.start && sourceLine <= b.end)
  if (inRange) return inRange.el
  const forward = blocks.find((b) => b.start >= sourceLine)
  if (forward) return forward.el
  return blocks[blocks.length - 1].el
}

function jumpToSourceLine(sourceLine) {
  const block = findBestBlockForSourceLine(sourceLine)
  if (!block) return false
  const targetTop = Math.max(0, block.offsetTop - Math.floor(markdownView.clientHeight * 0.35))
  markdownView.scrollTo({ top: targetTop, behavior: 'smooth' })
  lastJumpedSourceLine = sourceLine
  block.classList.add('line-jump-target')
  renderLineGutter()
  setTimeout(() => {
    block.classList.remove('line-jump-target')
    renderLineGutter()
  }, 1200)
  return true
}


function hideTocContextMenu() {
  tocContextMenu.style.display = 'none'
  contextTarget = null
}

function resetTocContextState(reason = '') {
  tocContextMenu.style.display = 'none'
  contextTarget = null
  suppressGlobalMenuCloseUntil = 0
  if (reason) appendDebugLog('INFO', `menu:state reset (${reason})`)
}

function snapshotActionContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return null
  const safeTargets = Array.isArray(ctx.targets)
    ? ctx.targets.map((t) => ({
      targetType: t && t.targetType ? String(t.targetType) : undefined,
      sourceLine: Number.isInteger(Number(t && t.sourceLine)) ? Number(t.sourceLine) : undefined,
      tocIndex: Number.isInteger(Number(t && t.tocIndex)) ? Number(t.tocIndex) : undefined,
      listIndex: Number.isInteger(Number(t && t.listIndex)) ? Number(t.listIndex) : undefined,
      listText: t && typeof t.listText === 'string' ? t.listText : undefined
    }))
    : []
  const safeDebugBlocks = Array.isArray(ctx.debugBlocks)
    ? ctx.debugBlocks.map((b) => ({
      sourceLine: Number.isInteger(Number(b && b.sourceLine)) ? Number(b.sourceLine) : undefined,
      text: b && typeof b.text === 'string' ? b.text : ''
    }))
    : []
  const safeTableContext = ctx.tableContext && typeof ctx.tableContext === 'object'
    ? {
      tableIndex: Number.isInteger(Number(ctx.tableContext.tableIndex)) ? Number(ctx.tableContext.tableIndex) : undefined,
      rowIndex: Number.isInteger(Number(ctx.tableContext.rowIndex)) ? Number(ctx.tableContext.rowIndex) : undefined,
      cellIndex: Number.isInteger(Number(ctx.tableContext.cellIndex)) ? Number(ctx.tableContext.cellIndex) : undefined
    }
    : undefined
  return {
    kind: ctx.kind,
    targetType: ctx.targetType,
    sourceLine: Number.isInteger(Number(ctx.sourceLine)) ? Number(ctx.sourceLine) : undefined,
    level: Number.isInteger(Number(ctx.level)) ? Number(ctx.level) : undefined,
    bulletDepth: Number.isInteger(Number(ctx.bulletDepth)) ? Number(ctx.bulletDepth) : undefined,
    promoteHeadingLevel: Number.isInteger(Number(ctx.promoteHeadingLevel)) ? Number(ctx.promoteHeadingLevel) : undefined,
    tocIndex: Number.isInteger(Number(ctx.tocIndex)) ? Number(ctx.tocIndex) : undefined,
    scope: ctx.scope === 'group' ? 'group' : 'single',
    needsConfirm: !!ctx.needsConfirm,
    selectedText: typeof ctx.selectedText === 'string' ? ctx.selectedText : '',
    allowedActions: Array.isArray(ctx.allowedActions) ? ctx.allowedActions.slice() : [],
    targets: safeTargets,
    debugBlocks: safeDebugBlocks,
    tableContext: safeTableContext
  }
}

function stabilizeMenuUi(reason = '') {
  try {
    tocContextMenu.style.pointerEvents = 'auto'
    const activeEl = document.activeElement
    if (activeEl && typeof activeEl.blur === 'function') {
      activeEl.blur()
    }
    tocContextMenuItems.forEach((btn) => {
      if (btn && typeof btn.blur === 'function') btn.blur()
    })
    suppressGlobalMenuCloseUntil = 0
    if (reason) appendDebugLog('INFO', `menu:ui stabilized (${reason})`)
  } catch (_) {}
}

function hideReadContextMenu() {
  readContextMenu.style.display = 'none'
}

function hideLabelContextMenu() {
  labelContextMenu.style.display = 'none'
  labelContextTarget = null
}

function hideAllContextMenus() {
  hideTocContextMenu()
  hideReadContextMenu()
  hideLabelContextMenu()
}

function updateReadMenuButtons() {
  const blockText = `블럭지정: ${readAutoBlockSelect ? '자동' : '수동'}`
  const htmlClipText = `HTML 클립: ${readHtmlClip ? '켬' : '끔'}`
  const labelText = `라벨 감추기: ${readHideLabels ? '켬' : '끔'}`
  const copyText = `자동 복사: ${readAutoCopy ? '켬' : '끔'}`
  const stripText = `번호삭제/클립보드: ${readStripNumbers ? '켬' : '끔'}`
  readToggleAutoBlock.textContent = blockText
  readToggleHtmlClip.textContent = htmlClipText
  readToggleLabels.textContent = labelText
  readToggleAutoCopy.textContent = copyText
  if (readToggleStripNumbers) readToggleStripNumbers.textContent = stripText
  readToggleAutoBlock.classList.toggle('is-on', readAutoBlockSelect)
  readToggleHtmlClip.classList.toggle('is-on', readHtmlClip)
  readToggleLabels.classList.toggle('is-on', readHideLabels)
  readToggleAutoCopy.classList.toggle('is-on', readAutoCopy)
  if (readToggleStripNumbers) readToggleStripNumbers.classList.toggle('is-on', readStripNumbers)
  // 복사 드롭다운 메뉴 동기화
  if (menuAutoBlockText) menuAutoBlockText.textContent = `블럭지정: ${readAutoBlockSelect ? '자동' : '수동'}`
  if (menuAutoBlockSwitch) menuAutoBlockSwitch.checked = readAutoBlockSelect
  if (menuHtmlClipText) menuHtmlClipText.textContent = `HTML 클립: ${readHtmlClip ? '켬' : '끔'}`
  if (menuHtmlClipSwitch) menuHtmlClipSwitch.checked = readHtmlClip
  if (menuHideLabelsText) menuHideLabelsText.textContent = `라벨 감추기: ${readHideLabels ? '켬' : '끔'}`
  if (menuHideLabelsSwitch) menuHideLabelsSwitch.checked = readHideLabels
  if (menuAutoCopyText) menuAutoCopyText.textContent = `자동 복사: ${readAutoCopy ? '켬' : '끔'}`
  if (menuAutoCopySwitch) menuAutoCopySwitch.checked = readAutoCopy
}

function showReadContextMenu(x, y) {
  suppressGlobalMenuCloseUntil = Date.now() + 250
  updateReadMenuButtons()
  readContextMenuStatus.textContent = '읽기 모드 옵션'
  readContextMenu.style.display = 'block'

  const menuWidth = readContextMenu.offsetWidth || 180
  const menuHeight = readContextMenu.offsetHeight || 100
  const maxX = window.innerWidth - menuWidth - 8
  const maxY = window.innerHeight - menuHeight - 8
  readContextMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`
  readContextMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`
}

function showLabelContextMenu(x, y, contextInfo = {}) {
  suppressGlobalMenuCloseUntil = Date.now() + 250
  labelContextTarget = contextInfo
  labelContextMenu.style.display = 'block'
  const menuWidth = labelContextMenu.offsetWidth || 150
  const menuHeight = labelContextMenu.offsetHeight || 220
  const maxX = window.innerWidth - menuWidth - 8
  const maxY = window.innerHeight - menuHeight - 8
  labelContextMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`
  labelContextMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`
  const line = Number(contextInfo.sourceLine)
  labelContextMenuStatus.textContent = Number.isInteger(line)
    ? `라벨 변경 (line:${line + 1})`
    : '라벨 변경'
}

function applyReadVisualOptions() {
  document.body.classList.toggle('read-hide-labels', isReadMode && readHideLabels)
}

function updateAdvancedMenuToggleUi() {
  if (advancedMenuSwitch) advancedMenuSwitch.checked = advancedMenu
  if (advancedMenuText) advancedMenuText.textContent = `비활성메뉴(고급메뉴): ${advancedMenu ? '켬' : '끔'}`
}

function updateLocationHeadingToggleUi() {
  if (locationH1Switch) locationH1Switch.checked = !!locationHeadingVisible[1]
  if (locationH2Switch) locationH2Switch.checked = !!locationHeadingVisible[2]
  if (locationH3Switch) locationH3Switch.checked = !!locationHeadingVisible[3]
  if (locationH4Switch) locationH4Switch.checked = !!locationHeadingVisible[4]
  if (locationH5Switch) locationH5Switch.checked = !!locationHeadingVisible[5]
  if (locationH6Switch) locationH6Switch.checked = !!locationHeadingVisible[6]
}

function updateStripNumbersUi() {
  if (stripNumbersSwitch) stripNumbersSwitch.checked = readStripNumbers
  if (stripNumbersText) stripNumbersText.textContent = `번호삭제/클립보드: ${readStripNumbers ? '켬' : '끔'}`
}

function collectUiSettings() {
  return {
    lastOpenedFilePath,
    lastScrollRatio: scrollRatio,
    readMode: isReadMode,
    advancedMenu,
    readHideLabels,
    readAutoCopy,
    readAutoBlockSelect,
    readHtmlClip,
    readStripNumbers,
    locationShowH1: !!locationHeadingVisible[1],
    locationShowH2: !!locationHeadingVisible[2],
    locationShowH3: !!locationHeadingVisible[3],
    locationShowH4: !!locationHeadingVisible[4],
    locationShowH5: !!locationHeadingVisible[5],
    locationShowH6: !!locationHeadingVisible[6],
    headingColorH1: headingColors[1] || DEFAULT_HEADING_COLORS[1],
    headingColorH2: headingColors[2] || DEFAULT_HEADING_COLORS[2],
    headingColorH3: headingColors[3] || DEFAULT_HEADING_COLORS[3],
    headingColorH4: headingColors[4] || DEFAULT_HEADING_COLORS[4],
    headingColorH5: headingColors[5] || DEFAULT_HEADING_COLORS[5],
    headingColorH6: headingColors[6] || DEFAULT_HEADING_COLORS[6],
    headingFontH1: headingFonts[1] || DEFAULT_HEADING_FONTS[1],
    headingFontH2: headingFonts[2] || DEFAULT_HEADING_FONTS[2],
    headingFontH3: headingFonts[3] || DEFAULT_HEADING_FONTS[3],
    headingFontH4: headingFonts[4] || DEFAULT_HEADING_FONTS[4],
    headingFontH5: headingFonts[5] || DEFAULT_HEADING_FONTS[5],
    headingFontH6: headingFonts[6] || DEFAULT_HEADING_FONTS[6],
    headingFamilyH1: headingFamilies[1] || '',
    headingFamilyH2: headingFamilies[2] || '',
    headingFamilyH3: headingFamilies[3] || '',
    headingFamilyH4: headingFamilies[4] || '',
    headingFamilyH5: headingFamilies[5] || '',
    headingFamilyH6: headingFamilies[6] || '',
    defaultDocumentFont: defaultDocumentFont || '',
    consoleVisible: isConsoleVisible,
    settingTemplates,
    activeTemplateName
  }
}

async function saveUiSettings() {
  try {
    await ipcRenderer.invoke('settings:set', collectUiSettings())
  } catch (_) {}
}

function applyUiSettings(settings = {}) {
  lastOpenedFilePath = typeof settings.lastOpenedFilePath === 'string' ? settings.lastOpenedFilePath : ''
  const savedRatio = Number(settings.lastScrollRatio)
  if (Number.isFinite(savedRatio) && savedRatio > 0) {
    pendingRestoreRatio = savedRatio
    appendDebugLog('INFO', `[스크롤] 복원 예약 ratio=${savedRatio.toFixed(4)}`)
  }
  advancedMenu = !!settings.advancedMenu
  readHideLabels = !!settings.readHideLabels
  readAutoCopy = !!settings.readAutoCopy
  readAutoBlockSelect = settings.readAutoBlockSelect !== false  // 기본값 true
  readHtmlClip = !!settings.readHtmlClip
  readStripNumbers = !!settings.readStripNumbers
  locationHeadingVisible = {
    1: settings.locationShowH1 !== false,
    2: settings.locationShowH2 !== false,
    3: settings.locationShowH3 !== false,
    4: settings.locationShowH4 !== false,
    5: settings.locationShowH5 !== false,
    6: settings.locationShowH6 !== false
  }
  headingColors = normalizeHeadingColorMap({
    1: isHexColor(settings.headingColorH1) ? String(settings.headingColorH1).toLowerCase() : '',
    2: isHexColor(settings.headingColorH2) ? String(settings.headingColorH2).toLowerCase() : '',
    3: isHexColor(settings.headingColorH3) ? String(settings.headingColorH3).toLowerCase() : '',
    4: isHexColor(settings.headingColorH4) ? String(settings.headingColorH4).toLowerCase() : '',
    5: isHexColor(settings.headingColorH5) ? String(settings.headingColorH5).toLowerCase() : '',
    6: isHexColor(settings.headingColorH6) ? String(settings.headingColorH6).toLowerCase() : ''
  })
  headingFonts = normalizeHeadingFontMap({
    1: settings.headingFontH1,
    2: settings.headingFontH2,
    3: settings.headingFontH3,
    4: settings.headingFontH4,
    5: settings.headingFontH5,
    6: settings.headingFontH6
  })
  headingFamilies = normalizeHeadingFamilyMap({
    1: settings.headingFamilyH1,
    2: settings.headingFamilyH2,
    3: settings.headingFamilyH3,
    4: settings.headingFamilyH4,
    5: settings.headingFamilyH5,
    6: settings.headingFamilyH6
  })
  defaultDocumentFont = String(settings.defaultDocumentFont || '').trim()
  settingTemplates = normalizeTemplateMap(settings.settingTemplates || {})
  activeTemplateName = String(settings.activeTemplateName || '').trim()
  updateAdvancedMenuToggleUi()
  updateLocationHeadingToggleUi()
  updateStripNumbersUi()
  updateReadMenuButtons()
  applyReadVisualOptions()
  applyHeadingColors()
  applyHeadingFonts()
  applyHeadingFamilies()
  applyDefaultDocumentFont()
  renderHeaderColorPalette()
  updateHeaderColorItemUi()
  updateHeadingFontInputUi()
  updateHeaderFontItemUi()
  if (viewDefaultFontSelect) {
    const current = defaultDocumentFont
    if (current && !Array.from(viewDefaultFontSelect.options).some((opt) => opt.value === current)) {
      const custom = document.createElement('option')
      custom.value = current
      custom.textContent = `${current} (현재)`
      viewDefaultFontSelect.appendChild(custom)
    }
    viewDefaultFontSelect.value = current
  }
  renderTemplateOptions()
  setConsoleVisibility(settings.consoleVisible !== false)
  setReadMode(!!settings.readMode)
}

async function loadUiSettings() {
  try {
    const result = await ipcRenderer.invoke('settings:get')
    if (!result?.ok || !result.settings) return null
    applyUiSettings(result.settings)
    return result.settings
  } catch (_) {
    return null
  }
}

async function loadAppVersion() {
  if (!appVersion) return
  try {
    const result = await ipcRenderer.invoke('app:getVersion')
    if (result?.ok && result.version) appVersion.textContent = `v${result.version}`
    else appVersion.textContent = 'v-'
  } catch (_) {
    appVersion.textContent = 'v-'
  }
}

function decorateLabelsForDisplay(content) {
  const lines = String(content || '').split(/\r?\n/)
  let inFence = false
  let fenceChar = ''
  const out = lines.map((line) => {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/)
    if (fenceMatch) {
      const ch = fenceMatch[1][0]
      if (!inFence) {
        inFence = true
        fenceChar = ch
      } else if (ch === fenceChar) {
        inFence = false
        fenceChar = ''
      }
      return line
    }
    if (inFence) return line
    return line.replace(/\[([가-힣A-Za-z]{1,8})\](?!\()/g, '<span class="md-label">[$1]</span>')
  })
  return out.join('\n')
}

async function copyTextToClipboard(text, label = '복사') {
  const value = toCRLF(String(text || ''))
  if (!value.trim()) return false
  try {
    await navigator.clipboard.writeText(value)
    appendDebugLog('INFO', `[${label}] ${value.length}자 — ${value.slice(0, 60)}${value.length > 60 ? '…' : ''}`)
    return true
  } catch (_) {
    try {
      const ta = document.createElement('textarea')
      ta.value = value
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      ta.style.top = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return !!ok
    } catch (_) {
      return false
    }
  }
}

function getSelectionTextWithoutLabels() {
  if (isReadMode && readAutoBlockSelect && lastReadSelectedBlocks.length > 0) {
    const lines = lastReadSelectedBlocks
      .map((block) => getBlockTextWithoutLabels(block))
      .filter((line) => !!line)
    if (lines.length > 0) return lines.join('\n')
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return ''
  const range = selection.getRangeAt(0)
  const startInViewer = markdownBody.contains(range.startContainer)
  const endInViewer = markdownBody.contains(range.endContainer)
  if (!startInViewer || !endInViewer) return ''

  const fragment = range.cloneContents()
  const wrapper = document.createElement('div')
  wrapper.appendChild(fragment)
  wrapper.querySelectorAll('.md-label').forEach((el) => el.remove())
  const raw = wrapper.innerText || wrapper.textContent || ''
  return normalizeCopiedText(raw)
}

function getClosestBlock(node) {
  if (!node) return null
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node.closest ? node.closest(BLOCK_SELECTORS) : null
  }
  const parent = node.parentElement
  return parent && parent.closest ? parent.closest(BLOCK_SELECTORS) : null
}

function getIntersectingBlocks(range) {
  const allBlocks = Array.from(markdownBody.querySelectorAll(BLOCK_SELECTORS))
  return allBlocks.filter((el) => {
    try {
      return range.intersectsNode(el)
    } catch (_) {
      return false
    }
  })
}

function getTouchedBlocksFromTextNodes(range) {
  const walker = document.createTreeWalker(markdownBody, NodeFilter.SHOW_TEXT)
  const blocks = []
  const seen = new Set()
  let node = walker.nextNode()
  while (node) {
    const text = String(node.textContent || '')
    if (text.trim()) {
      let touched = false
      try {
        touched = range.intersectsNode(node)
      } catch (_) {
        touched = false
      }
      if (touched) {
        const block = getClosestBlock(node)
        if (block && !seen.has(block)) {
          seen.add(block)
          blocks.push(block)
        }
      }
    }
    node = walker.nextNode()
  }
  return blocks
}

function uniqueDeepestBlocks(blocks) {
  return blocks.filter((el, _, arr) => !arr.some((other) => other !== el && el.contains(other)))
}

function getBlockTextWithoutLabels(block) {
  const cloned = block.cloneNode(true)
  cloned.querySelectorAll('.md-label').forEach((el) => el.remove())
  if (cloned.tagName === 'LI') {
    cloned.querySelectorAll('ul, ol').forEach((n) => n.remove())
  }
  const raw = cloned.innerText || cloned.textContent || ''
  // 단일 블록 내부는 줄바꿈 없이 공백으로 이어붙임
  return String(raw || '')
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
    .trim()
}

function normalizeCopiedText(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

// 번호 삭제 모드: 줄 앞 번호·로마숫자 접두 제거 (원문자 ①②③ 는 유지)
// 제거 대상: "(1) " / "1. " / "1) " / "IV. " (로마숫자+점+공백)
// 조건: 줄 맨 앞 + 뒤에 공백 1개 이상 있을 때만 → 공백까지 제거
function stripNumberLabels(text) {
  return text
    .replace(/^[ \t]*(?:\(\d+\)|\d+[.)]|[IVXLCDMivxlcdm]+\.) +/gm, '')
    .trim()
}

function toCRLF(text) {
  return String(text || '').replace(/\r\n/g, '\n').trim().replace(/\n/g, '\r\n')
}

function detectEol(content) {
  return String(content || '').includes('\r\n') ? '\r\n' : '\n'
}

function updateWorkingContent(nextContent) {
  workingContent = nextContent
  setDirty(workingContent !== diskContent)
  renderMarkdown(workingContent)
}

async function saveCurrentFile() {
  if (!currentFilePath || !isDirty) return true
  const result = await ipcRenderer.invoke('file:save', {
    filePath: currentFilePath,
    content: workingContent
  })
  if (!result?.ok) {
    showErrorModal(result?.message || '저장에 실패했습니다.')
    return false
  }
  diskContent = workingContent
  setDirty(false)
  return true
}

async function ensureSavedBeforeAction() {
  if (!isDirty) return true
  const shouldSave = await askConfirm('편집 내용이 있습니다. 저장할까요?')
  if (!shouldSave) return true
  return saveCurrentFile()
}

async function openFileDialogWithDirtyCheck() {
  const okToProceed = await ensureSavedBeforeAction()
  if (!okToProceed) return
  ipcRenderer.invoke('file:open')
}

function inferSourceLineFromText(content, rawText) {
  const key = normalizeCompareText(rawText)
  if (!key) return -1
  const lines = String(content || '').split(/\r?\n/)
  let bestIndex = -1
  let bestScore = 0
  for (let i = 0; i < lines.length; i++) {
    const candidate = normalizeCompareText(lines[i])
    if (!candidate) continue
    if (candidate === key || candidate.includes(key) || key.includes(candidate)) {
      const score = Math.min(candidate.length, key.length)
      if (score > bestScore) {
        bestScore = score
        bestIndex = i
      }
    }
  }
  return bestIndex
}

function getLineEditInfoFromTarget(targetEl) {
  if (!targetEl || !markdownBody.contains(targetEl)) return null
  const li = targetEl.closest('li')
  if (li) {
    const liSrc = Number(li.dataset.srcLine)
    if (Number.isInteger(liSrc)) return { sourceLine: liSrc }
  }
  const heading = targetEl.closest('h1, h2, h3, h4')
  if (heading) {
    const headingSrc = Number(heading.dataset.srcLine)
    if (Number.isInteger(headingSrc)) return { sourceLine: headingSrc }
  }
  const srcHolder = targetEl.closest('[data-src-line]')
  const directSrc = srcHolder ? Number(srcHolder.dataset.srcLine) : NaN
  if (Number.isInteger(directSrc)) return { sourceLine: directSrc }
  return null
}

function parseMarkdownTableBlocks(content) {
  const lines = String(content || '').split(/\r?\n/)
  const blocks = []
  const isTableLike = (line) => /\|/.test(line)
  const isSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || '')

  for (let i = 0; i < lines.length - 1; i++) {
    if (!isTableLike(lines[i])) continue
    if (!isSeparator(lines[i + 1])) continue
    const start = i
    let end = i + 1
    for (let j = i + 2; j < lines.length; j++) {
      if (!isTableLike(lines[j])) break
      end = j
    }
    blocks.push({ start, end })
    i = end
  }
  return blocks
}

function parsePipeRow(line) {
  const raw = String(line || '').trim()
  const stripped = raw.replace(/^\|/, '').replace(/\|$/, '')
  return stripped.split('|').map((s) => s.trim())
}

function buildPipeRow(cells) {
  return `| ${cells.map((s) => String(s || '').trim()).join(' | ')} |`
}

function getBlockRangeEndOffset(block) {
  if (!block || !block.childNodes) return 0
  if (block.tagName !== 'LI') return block.childNodes.length

  const children = Array.from(block.childNodes)
  const nestedListIndex = children.findIndex((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false
    const tag = node.tagName ? node.tagName.toUpperCase() : ''
    return tag === 'UL' || tag === 'OL'
  })

  if (nestedListIndex > 0) return nestedListIndex
  return block.childNodes.length
}

function expandSelectionToBlocks() {
  if (!isReadMode || isAdjustingReadSelection) return
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    lastReadSelectedBlocks = []
    return
  }
  const range = selection.getRangeAt(0)
  const startInViewer = markdownBody.contains(range.startContainer)
  const endInViewer = markdownBody.contains(range.endContainer)
  if (!startInViewer || !endInViewer) {
    lastReadSelectedBlocks = []
    return
  }

  const touchedByText = getTouchedBlocksFromTextNodes(range)
  const intersected = uniqueDeepestBlocks(
    touchedByText.length > 0 ? touchedByText : getIntersectingBlocks(range)
  )
  if (!intersected.length) {
    lastReadSelectedBlocks = []
    return
  }
  lastReadSelectedBlocks = intersected

  const startBlock = getClosestBlock(range.startContainer) || intersected[0]
  const endBlock = getClosestBlock(range.endContainer) || intersected[intersected.length - 1]
  if (!startBlock || !endBlock) return

  const newRange = document.createRange()
  newRange.setStart(startBlock, 0)
  newRange.setEnd(endBlock, getBlockRangeEndOffset(endBlock))

  isAdjustingReadSelection = true
  selection.removeAllRanges()
  selection.addRange(newRange)
  setTimeout(() => {
    isAdjustingReadSelection = false
  }, 0)
}

async function syncReadSelectionAutoCopy() {
  if (!isReadMode || !readAutoCopy) return
  const raw = getSelectionTextWithoutLabels()
  const text = readStripNumbers ? stripNumberLabels(raw) : raw
  const normalized = text.trim()
  if (!normalized || normalized === lastAutoCopiedText) return
  const ok = await copyTextToClipboard(text, '자동블록복사')
  if (ok) lastAutoCopiedText = normalized
}

function handleReadSelectionUpdate() {
  if (!isReadMode) return
  if (readAutoBlockSelect) expandSelectionToBlocks()
  syncReadSelectionAutoCopy()
}

function clearReadSelection() {
  lastReadSelectedBlocks = []
  const selection = window.getSelection()
  if (selection) selection.removeAllRanges()
}

function setReadMode(nextReadMode) {
  isReadMode = !!nextReadMode
  if (!isReadMode) lastReadSelectedBlocks = []
  if (modeSwitch) modeSwitch.checked = isReadMode
  if (modeText) modeText.textContent = isReadMode ? '읽기모드' : '편집모드'
  document.body.classList.toggle('read-mode', isReadMode)
  applyReadVisualOptions()
  applyTableMarkerMergeView()
  hideAllContextMenus()
  renderLineGutter()
}

function showTocContextMenu(x, y, contextInfo = {}) {
  suppressGlobalMenuCloseUntil = Date.now() + 250
  contextTarget = contextInfo
  lastMenuActionContext = snapshotActionContext(contextInfo)
  tocContextMenu.style.display = 'block'
  tocContextMenu.style.pointerEvents = 'auto'

  const menuWidth = tocContextMenu.offsetWidth || 150
  const menuHeight = tocContextMenu.offsetHeight || 156
  const maxX = window.innerWidth - menuWidth - 8
  const maxY = window.innerHeight - menuHeight - 8

  tocContextMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`
  tocContextMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`

  const {
    kind = 'text',
    level = null,
    bulletDepth = null,
    allowedActions = [],
    targets = [],
    selectedText = '',
    debugBlocks = []
  } = contextInfo
  const line = resolveEditableLineFromContext(contextInfo)
  const lineText = Number.isInteger(line) && line >= 0 ? String(line + 1) : '?'
  appendDebugLog(
    'INFO',
    `menu:open kind=${kind} line=${lineText} actions=${(allowedActions || []).join(',') || '(none)'}`
  )
  tocContextMenuStatus.textContent = buildContextStatusText(contextInfo)

  tocContextMenuItems.forEach((btn) => {
    const action = btn.dataset.action
    const enabled = allowedActions.includes(action)
    btn.disabled = false
    btn.dataset.enabled = enabled ? '1' : '0'
    btn.classList.toggle('is-disabled', !enabled)
    btn.style.display = enabled || advancedMenu ? 'block' : 'none'
    btn.style.pointerEvents = 'auto'
  })

  const debugText = String(selectedText || '').replace(/\s+/g, ' ').trim()
  if (debugText) {
    tocContextMenuDebug.style.display = 'block'
    const blockLines = debugBlocks.map((b, idx) => {
      const lineInfo = Number.isInteger(b.sourceLine) ? `line:${b.sourceLine + 1}` : 'line:?'
      return `${idx + 1}. ${lineInfo} ${b.text}`
    })
    tocContextMenuDebug.textContent = [
      `선택: ${debugText}`,
      blockLines.length ? '블록:' : '블록: (없음)',
      ...blockLines
    ].join('\n')
    tocContextMenuDebug.title = `${debugText}\n${blockLines.join('\n')}`
  } else {
    tocContextMenuDebug.style.display = 'none'
    tocContextMenuDebug.textContent = ''
    tocContextMenuDebug.title = ''
  }
}

function finishInlineEditor(applyChange) {
  if (!activeInlineEditor) return
  const { textarea, sourceLine, initialValue, prefix, labelPart } = activeInlineEditor
  const nextContent = fromEditorDisplayText(textarea.value)
  textarea.remove()
  activeInlineEditor = null
  if (!applyChange) return
  if (nextContent === initialValue) return
  const lines = String(workingContent || '').split(/\r?\n/)
  if (!Number.isInteger(sourceLine) || sourceLine < 0 || sourceLine >= lines.length) return
  const normalizedLabel = labelPart ? (/\s$/.test(labelPart) ? labelPart : `${labelPart} `) : ''
  lines[sourceLine] = `${prefix}${normalizedLabel}${nextContent}`
  updateWorkingContent(lines.join(detectEol(workingContent)))
}

function startInlineEditor(sourceLine, initialContent, prefix, labelPart, anchorEl) {
  finishInlineEditor(false)
  const textarea = document.createElement('textarea')
  textarea.className = 'inline-line-editor'
  textarea.value = toEditorDisplayText(initialContent)

  let top = 120
  let left = 24
  let width = Math.max(480, Math.min(window.innerWidth - 48, 900))
  if (anchorEl && anchorEl.getBoundingClientRect) {
    const rect = anchorEl.getBoundingClientRect()
    top = Math.max(72, rect.top - 4)
    left = Math.max(16, rect.left - 2)
    width = Math.max(320, Math.min(window.innerWidth - left - 16, rect.width + 24))
  }

  textarea.style.top = `${top}px`
  textarea.style.left = `${left}px`
  textarea.style.width = `${width}px`
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  activeInlineEditor = { textarea, sourceLine, initialValue: initialContent, prefix, labelPart }
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      finishInlineEditor(false)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      finishInlineEditor(true)
    }
  })
  textarea.addEventListener('blur', () => {
    finishInlineEditor(true)
  })
}

function editLineBySourceLine(sourceLine, anchorEl = null) {
  const lines = String(workingContent || '').split(/\r?\n/)
  if (!Number.isInteger(sourceLine) || sourceLine < 0 || sourceLine >= lines.length) return
  const currentLine = lines[sourceLine]
  const parsed = splitEditableLine(currentLine)
  const labelParsed = splitLabelFromContent(parsed.content)
  startInlineEditor(sourceLine, labelParsed.body, parsed.prefix, labelParsed.labelPart, anchorEl)
}

function replaceLabelBySourceLine(sourceLine, labelName) {
  const lines = String(workingContent || '').split(/\r?\n/)
  if (!Number.isInteger(sourceLine) || sourceLine < 0 || sourceLine >= lines.length) return false
  const parsed = splitEditableLine(lines[sourceLine])
  const labelParsed = splitLabelFromContent(parsed.content)
  const style = detectLabelStyle(labelParsed.labelPart)
  const nextLabel = buildLabelToken(labelName, style)
  const body = String(labelParsed.body || '').trimStart()
  lines[sourceLine] = `${parsed.prefix}${nextLabel}${body ? ` ${body}` : ''}`
  updateWorkingContent(lines.join(detectEol(workingContent)))
  return true
}

function resolveEditableLineFromContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return -1
  if (Number.isInteger(Number(ctx.sourceLine))) return Number(ctx.sourceLine)

  if (Array.isArray(ctx.targets)) {
    const fromTargets = ctx.targets.find((t) => Number.isInteger(Number(t && t.sourceLine)))
    if (fromTargets) return Number(fromTargets.sourceLine)
  }

  if (Array.isArray(ctx.debugBlocks)) {
    const fromDebug = ctx.debugBlocks.find((b) => Number.isInteger(Number(b && b.sourceLine)))
    if (fromDebug) return Number(fromDebug.sourceLine)
  }

  return -1
}

function toSerializableTransformTarget(ctx) {
  if (!ctx || typeof ctx !== 'object') return null
  const out = {
    targetType: ctx.targetType,
    kind: ctx.kind,
    level: Number.isInteger(Number(ctx.level)) ? Number(ctx.level) : undefined,
    bulletDepth: Number.isInteger(Number(ctx.bulletDepth)) ? Number(ctx.bulletDepth) : undefined,
    promoteHeadingLevel: Number.isInteger(Number(ctx.promoteHeadingLevel)) ? Number(ctx.promoteHeadingLevel) : undefined,
    sourceLine: Number.isInteger(Number(ctx.sourceLine)) ? Number(ctx.sourceLine) : undefined,
    tocIndex: Number.isInteger(Number(ctx.tocIndex)) ? Number(ctx.tocIndex) : undefined
  }

  if (Array.isArray(ctx.targets)) {
    out.targets = ctx.targets.map((t) => ({
      targetType: t && t.targetType ? String(t.targetType) : undefined,
      sourceLine: Number.isInteger(Number(t && t.sourceLine)) ? Number(t.sourceLine) : undefined,
      tocIndex: Number.isInteger(Number(t && t.tocIndex)) ? Number(t.tocIndex) : undefined,
      listIndex: Number.isInteger(Number(t && t.listIndex)) ? Number(t.listIndex) : undefined,
      listText: t && typeof t.listText === 'string' ? t.listText : undefined
    }))
  }
  return out
}

function editTableCellAtContext(tableContext) {
  if (!tableContext) return
  const { tableIndex, rowIndex, cellIndex } = tableContext
  const blocks = parseMarkdownTableBlocks(workingContent)
  const block = blocks[tableIndex]
  if (!block) return
  const lines = String(workingContent || '').split(/\r?\n/)
  let sourceLineIndex = block.start
  if (rowIndex > 0) sourceLineIndex = block.start + rowIndex + 1
  if (sourceLineIndex < block.start || sourceLineIndex > block.end || sourceLineIndex >= lines.length) return

  const rowCells = parsePipeRow(lines[sourceLineIndex])
  if (cellIndex < 0 || cellIndex >= rowCells.length) return
  const currentCellValue = rowCells[cellIndex]
  const nextCellValue = askTextEdit(
    `표 셀 편집 (R${rowIndex + 1}, C${cellIndex + 1})`,
    toEditorDisplayText(currentCellValue)
  )
  return Promise.resolve(nextCellValue).then((value) => {
    const normalized = value === null ? null : fromEditorDisplayText(value)
    if (normalized === null || normalized === currentCellValue) return
    rowCells[cellIndex] = normalized
    lines[sourceLineIndex] = buildPipeRow(rowCells)
    updateWorkingContent(lines.join(detectEol(workingContent)))
  })
}

// 내용 편집은 컨텍스트에 따라 표 셀 편집 또는 일반 줄 편집으로 자동 분기한다.

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// TOC 항목 포커스 이동 & 스크롤 노출
function setTocFocus(index) {
  if (index < 0 || index >= tocItems.length) return
  focusedTocIndex = index

  tocItems.forEach((t, i) => t.el.classList.toggle('focused', i === index))

  // TOC 패널 안에서 보이도록 스크롤
  const el = tocItems[index].el
  const panelRect = tocList.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  if (elRect.top < panelRect.top) tocList.scrollTop -= panelRect.top - elRect.top + 8
  else if (elRect.bottom > panelRect.bottom) tocList.scrollTop += elRect.bottom - panelRect.bottom + 8
}

function hasTocChildren(idx) {
  const myLevel = tocItems[idx].level
  for (let k = idx + 1; k < tocItems.length; k++) {
    if (tocItems[k].level <= myLevel) break
    return true
  }
  return false
}

// 접힌 항목 idx 기준으로 숨길 TOC 인덱스 범위 계산
// (idx+1 ~ 다음 동급 이상 헤딩 직전까지)
function getHiddenTocRange() {
  const hiddenSet = new Set()
  collapsedTocItems.forEach((idx) => {
    const myLevel = tocItems[idx].level
    for (let k = idx + 1; k < tocItems.length; k++) {
      if (tocItems[k].level <= myLevel) break
      hiddenSet.add(k)
    }
  })
  return hiddenSet
}

function updateTocVisibility() {
  const hiddenSet = getHiddenTocRange()
  tocItems.forEach(({ el }, i) => {
    el.style.display = hiddenSet.has(i) ? 'none' : ''
  })
  updateViewVisibility()
}

// 접힌 헤딩에 속한 뷰 섹션 숨김/표시 (범위 기반)
function updateViewVisibility() {
  const children = Array.from(markdownBody.children)
  const hidden = new Array(children.length).fill(false)

  collapsedTocItems.forEach((idx) => {
    const startHeading = tocItems[idx].heading
    const startPos = children.indexOf(startHeading)
    if (startPos < 0) return
    const myLevel = tocItems[idx].level

    // 다음 동급 이상 헤딩 위치 탐색
    let endPos = children.length
    for (let k = idx + 1; k < tocItems.length; k++) {
      if (tocItems[k].level <= myLevel) {
        endPos = children.indexOf(tocItems[k].heading)
        break
      }
    }
    for (let p = startPos + 1; p < endPos; p++) hidden[p] = true
  })

  children.forEach((child, p) => {
    child.style.display = hidden[p] ? 'none' : ''
  })
}

function toggleTocItem(idx) {
  if (collapsedTocItems.has(idx)) {
    collapsedTocItems.delete(idx)
  } else {
    collapsedTocItems.add(idx)
  }
  const btn = tocItems[idx].el.querySelector('.toc-toggle')
  if (btn) btn.textContent = collapsedTocItems.has(idx) ? '▶' : '▼'
  updateTocVisibility()
}

// TOC 생성
function buildToc() {
  const headings = markdownBody.querySelectorAll('h1, h2, h3, h4')
  tocList.innerHTML = ''
  tocItems = []
  focusedTocIndex = -1
  collapsedTocItems.clear()

  if (headings.length === 0) {
    tocPanel.style.display = 'none'
    return
  }

  headings.forEach((h, i) => {
    h.id = `heading-${i}-${slugify(h.textContent)}`
    const level = parseInt(h.tagName[1])  // 1~4

    const item = document.createElement('div')
    item.className = `toc-item toc-${h.tagName.toLowerCase()}`
    item.title = h.textContent
    item.tabIndex = -1

    const textSpan = document.createElement('span')
    textSpan.className = 'toc-item-text'
    textSpan.textContent = h.textContent
    item.appendChild(textSpan)

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('toc-toggle')) return
      h.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTocFocus(i)
    })

    item.addEventListener('contextmenu', (e) => {
      if (isReadMode) {
        e.preventDefault()
        showReadContextMenu(e.clientX, e.clientY)
        return
      }
      const sourceLine = Number(h.dataset.srcLine)
      e.preventDefault()
      showTocContextMenu(e.clientX, e.clientY, {
        kind: 'heading',
        level,
        targetType: 'heading',
        tocIndex: i,
        anchorElement: h,
        sourceLine: Number.isInteger(sourceLine) ? sourceLine : undefined,
        allowedActions: ['editContent', 'shiftUp', 'shiftDown', 'toBullet']
      })
    })

    tocItems.push({ el: item, level, heading: h })
    tocList.appendChild(item)
  })

  // 2차 패스: 자식이 있는 항목에 토글 버튼 삽입
  tocItems.forEach(({ el }, i) => {
    const icon = document.createElement('span')
    if (hasTocChildren(i)) {
      icon.className = 'toc-toggle'
      icon.textContent = '▼'
      icon.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleTocItem(i)
      })
    } else {
      icon.className = 'toc-toggle-spacer'
    }
    el.insertBefore(icon, el.firstChild)
  })

  // TOC에 키보드 포커스 가능하게
  tocList.tabIndex = 0

  // 스크롤 시 활성 헤딩 업데이트
  markdownView.addEventListener('scroll', updateActiveToc, { passive: true })
}

// 스크롤 위치에 따라 활성 TOC 항목 업데이트
function updateBreadcrumb() {
  if (!breadcrumbBar) return
  const scrollTop = markdownView.scrollTop + 80
  // 각 레벨별 가장 최근 지나친 헤딩 추적 (h1~h4 기준)
  const current = {}
  const allHeadings = Array.from(markdownBody.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  for (const h of allHeadings) {
    if (h.offsetTop > scrollTop) break
    const lv = Number(h.tagName[1])
    current[lv] = (h.textContent || '').trim()
    // 하위 레벨 초기화 (새 상위 헤딩이 나오면 하위는 리셋)
    for (let deeper = lv + 1; deeper <= 6; deeper++) delete current[deeper]
  }
  const enabledLevels = [1, 2, 3, 4, 5, 6].filter((lv) => !!locationHeadingVisible[lv])
  const chain = enabledLevels
    .map((lv) => ({ level: lv, text: current[lv] }))
    .filter((x) => !!x.text)
  if (!chain.length) {
    breadcrumbBar.innerHTML = ''
    return
  }
  breadcrumbBar.innerHTML = chain.map((entry, i) => {
    const isLast = i === chain.length - 1
    const text = String(entry.text || '')
    const level = Number(entry.level || 1)
    const item = `<span class="breadcrumb-item bc-lv${level}${isLast ? ' bc-last' : ''}" title="${text}">${text}</span>`
    return i < chain.length - 1 ? item + '<span class="breadcrumb-sep">›</span>' : item
  }).join('')
}

function updateActiveToc() {
  if (!tocItems.length) {
    updateBreadcrumb()
    return
  }

  let activeIndex = 0
  const scrollTop = markdownView.scrollTop + 80

  tocItems.forEach(({ heading }, i) => {
    if (heading.offsetTop <= scrollTop) activeIndex = i
  })

  let prevActive = -1
  tocItems.forEach(({ el }, i) => {
    if (el.classList.contains('active')) prevActive = i
    el.classList.toggle('active', i === activeIndex)
  })

  updateBreadcrumb()

  // 활성 항목이 바뀌면: 포커스 인덱스 동기화 + TOC 패널 직접 스크롤
  if (prevActive !== activeIndex) {
    focusedTocIndex = activeIndex
    const activeEl = tocItems[activeIndex].el
    const itemTop = activeEl.offsetTop
    const itemBottom = itemTop + activeEl.offsetHeight
    const listTop = tocList.scrollTop
    const listBottom = listTop + tocList.clientHeight
    if (itemTop < listTop || itemBottom > listBottom) {
      tocList.scrollTop = itemTop - tocList.clientHeight / 2 + activeEl.offsetHeight / 2
    }
  }
}

function renderMarkdown(content) {
  if (pendingRestoreRatio === null && markdownView.scrollHeight > 0) {
    scrollRatio = markdownView.scrollTop / markdownView.scrollHeight
  }

  markdownBody.innerHTML = marked.parse(decorateLabelsForDisplay(content))
  applyTableMarkerMergeView()
  annotateSourceLines(content)
  applyLineGuideMarkers(content)
  buildToc()

  requestAnimationFrame(() => {
    if (pendingRestoreRatio !== null) {
      scrollRatio = pendingRestoreRatio
      pendingRestoreRatio = null
      appendDebugLog('INFO', `[스크롤] 복원 완료 ratio=${scrollRatio.toFixed(4)} scrollTop=${markdownView.scrollHeight > 0 ? Math.round(markdownView.scrollHeight * scrollRatio) : 0}px`)
    }
    if (markdownView.scrollHeight > 0) {
      markdownView.scrollTop = markdownView.scrollHeight * scrollRatio
    }
    updateActiveToc()
    renderLineGutter()
  })
}

function showFile(data) {
  dropzone.style.display = 'none'
  document.getElementById('mainLayout').style.display = 'flex'
  watchIndicator.style.display = 'flex'

  filePath.textContent = data.filePath
  filePath.title = data.filePath
  appTitle.textContent = `mdSee - ${data.fileName}`
  currentFilePath = data.filePath
  lastOpenedFilePath = data.filePath
  diskContent = data.content
  workingContent = data.content
  if (data.docStats) currentDocStats = data.docStats
  setDirty(false)

  renderMarkdown(workingContent)
  saveUiSettings()
}

async function initializeAppState() {
  await loadSystemFonts()
  renderHeaderColorPalette()
  applyHeadingColors()
  applyHeadingFonts()
  applyHeadingFamilies()
  applyDefaultDocumentFont()
  updateHeaderColorItemUi()
  updateHeadingFontInputUi()
  updateHeaderFontItemUi()
  setReadMode(false)
  updateAdvancedMenuToggleUi()
  updateReadMenuButtons()
  const settings = await loadUiSettings()
  loadAppVersion()

  const cachedPath = settings && typeof settings.lastOpenedFilePath === 'string'
    ? settings.lastOpenedFilePath
    : ''
  if (!cachedPath) {
    appendDebugLog('INFO', 'startup: no last file cache')
    return
  }

  try {
    const restored = await ipcRenderer.invoke('file:restoreLast', { filePath: cachedPath })
    if (restored && restored.ok) {
      appendDebugLog('INFO', `startup: restored last file ${cachedPath}`)
    } else {
      appendDebugLog('INFO', `startup: last file not restored (${restored && restored.code ? restored.code : 'UNKNOWN'})`)
    }
  } catch (err) {
    appendDebugLog('ERROR', `startup: restore failed ${err && err.message ? err.message : 'unknown'}`)
  }
}

initializeAppState()

if (modeSwitch) {
  modeSwitch.addEventListener('change', () => {
    setReadMode(modeSwitch.checked)
    saveUiSettings()
  })
}

if (advancedMenuSwitch) {
  advancedMenuSwitch.addEventListener('change', () => {
    advancedMenu = !!advancedMenuSwitch.checked
    updateAdvancedMenuToggleUi()
    saveUiSettings()
  })
}

if (readToggleAutoBlock) {
  readToggleAutoBlock.addEventListener('click', () => {
    readAutoBlockSelect = !readAutoBlockSelect
    if (!readAutoBlockSelect) lastReadSelectedBlocks = []
    updateReadMenuButtons()
    saveUiSettings()
  })
}

if (readToggleHtmlClip) {
  readToggleHtmlClip.addEventListener('click', () => {
    readHtmlClip = !readHtmlClip
    updateReadMenuButtons()
    saveUiSettings()
  })
}

if (readToggleLabels) {
  readToggleLabels.addEventListener('click', () => {
    readHideLabels = !readHideLabels
    applyReadVisualOptions()
    updateReadMenuButtons()
    saveUiSettings()
  })
}

if (readToggleAutoCopy) {
  readToggleAutoCopy.addEventListener('click', () => {
    readAutoCopy = !readAutoCopy
    if (!readAutoCopy) lastAutoCopiedText = ''
    updateReadMenuButtons()
    if (readAutoCopy) syncReadSelectionAutoCopy()
    saveUiSettings()
  })
}

if (readToggleStripNumbers) {
  readToggleStripNumbers.addEventListener('click', () => {
    readStripNumbers = !readStripNumbers
    updateStripNumbersUi()
    updateReadMenuButtons()
    saveUiSettings()
  })
}

if (stripNumbersSwitch) {
  stripNumbersSwitch.addEventListener('change', () => {
    readStripNumbers = !!stripNumbersSwitch.checked
    updateStripNumbersUi()
    updateReadMenuButtons()
    saveUiSettings()
  })
}

if (locationH1Switch) {
  locationH1Switch.addEventListener('change', () => {
    locationHeadingVisible[1] = !!locationH1Switch.checked
    updateLocationHeadingToggleUi()
    updateBreadcrumb()
    saveUiSettings()
  })
}
if (locationH2Switch) {
  locationH2Switch.addEventListener('change', () => {
    locationHeadingVisible[2] = !!locationH2Switch.checked
    updateLocationHeadingToggleUi()
    updateBreadcrumb()
    saveUiSettings()
  })
}
if (locationH3Switch) {
  locationH3Switch.addEventListener('change', () => {
    locationHeadingVisible[3] = !!locationH3Switch.checked
    updateLocationHeadingToggleUi()
    updateBreadcrumb()
    saveUiSettings()
  })
}
if (locationH4Switch) {
  locationH4Switch.addEventListener('change', () => {
    locationHeadingVisible[4] = !!locationH4Switch.checked
    updateLocationHeadingToggleUi()
    updateBreadcrumb()
    saveUiSettings()
  })
}
if (locationH5Switch) {
  locationH5Switch.addEventListener('change', () => {
    locationHeadingVisible[5] = !!locationH5Switch.checked
    updateLocationHeadingToggleUi()
    updateBreadcrumb()
    saveUiSettings()
  })
}
if (locationH6Switch) {
  locationH6Switch.addEventListener('change', () => {
    locationHeadingVisible[6] = !!locationH6Switch.checked
    updateLocationHeadingToggleUi()
    updateBreadcrumb()
    saveUiSettings()
  })
}

if (headerColorItems.length > 0) {
  headerColorItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const level = Number(item.dataset.level)
      if (!Number.isInteger(level) || level < 1 || level > 6) return
      if (activeHeaderColorLevel === level) {
        closeHeaderColorPalette()
      } else {
        openHeaderColorPalette(level)
      }
    })
  })
}

if (btnResetHeaderColors) {
  btnResetHeaderColors.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    headingColors = { ...DEFAULT_HEADING_COLORS }
    closeHeaderColorPalette()
    applyHeadingColors()
    updateHeaderColorItemUi()
    saveUiSettings()
  })
}

if (btnResetHeaderLocation) {
  btnResetHeaderLocation.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    locationHeadingVisible = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
    updateLocationHeadingToggleUi()
    updateBreadcrumb()
    saveUiSettings()
  })
}

if (btnResetHeaderFamilies) {
  btnResetHeaderFamilies.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    headingFamilies = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' }
    closeHeaderFontPicker()
    applyHeadingFamilies()
    updateHeaderFontItemUi()
    saveUiSettings()
  })
}

for (let level = 1; level <= 6; level++) {
  const input = headingFontInputs[level]
  if (!input) continue
  input.addEventListener('change', () => {
    const value = Number(input.value)
    headingFonts[level] = Number.isFinite(value) && value >= 12 && value <= 48
      ? Math.round(value)
      : DEFAULT_HEADING_FONTS[level]
    updateHeadingFontInputUi()
    applyHeadingFonts()
    saveUiSettings()
  })
}

if (btnResetHeaderFonts) {
  btnResetHeaderFonts.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    headingFonts = { ...DEFAULT_HEADING_FONTS }
    updateHeadingFontInputUi()
    applyHeadingFonts()
    saveUiSettings()
  })
}

if (headerFontItems.length > 0) {
  headerFontItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const level = Number(item.dataset.level)
      if (!Number.isInteger(level) || level < 1 || level > 6) return
      if (activeHeaderFontLevel === level) {
        closeHeaderFontPicker()
      } else {
        openHeaderFontPicker(level)
      }
    })
  })
}

if (viewHeaderFontPicker) {
  viewHeaderFontPicker.addEventListener('click', (e) => {
    e.stopPropagation()
  })
  viewHeaderFontPicker.addEventListener('mousedown', (e) => {
    e.stopPropagation()
  })
}

if (viewHeaderFontSelect) {
  viewHeaderFontSelect.addEventListener('click', (e) => {
    e.stopPropagation()
  })
  viewHeaderFontSelect.addEventListener('mousedown', (e) => {
    e.stopPropagation()
  })
  viewHeaderFontSelect.addEventListener('change', () => {
    const level = Number(viewHeaderFontSelect.dataset.level || activeHeaderFontLevel || 0)
    if (!Number.isInteger(level) || level < 1 || level > 6) return
    headingFamilies[level] = String(viewHeaderFontSelect.value || '').trim()
    applyHeadingFamilies()
    updateHeaderFontItemUi()
    saveUiSettings()
  })
}

if (viewDefaultFontSelect) {
  viewDefaultFontSelect.addEventListener('click', (e) => {
    e.stopPropagation()
  })
  viewDefaultFontSelect.addEventListener('mousedown', (e) => {
    e.stopPropagation()
  })
  viewDefaultFontSelect.addEventListener('change', () => {
    defaultDocumentFont = String(viewDefaultFontSelect.value || '').trim()
    applyDefaultDocumentFont()
    saveUiSettings()
  })
}

if (viewTemplateName) {
  viewTemplateName.addEventListener('click', (e) => e.stopPropagation())
  viewTemplateName.addEventListener('mousedown', (e) => e.stopPropagation())
}

if (btnTemplateSave) {
  btnTemplateSave.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const name = String(viewTemplateName ? viewTemplateName.value : '').trim().slice(0, 40)
    if (!name) {
      showErrorModal('템플릿 이름을 입력해 주세요.')
      return
    }
    settingTemplates[name] = collectTemplateSettings()
    activeTemplateName = name
    renderTemplateOptions()
    if (viewTemplateSelect) viewTemplateSelect.value = name
    if (viewTemplateName) viewTemplateName.value = ''
    saveUiSettings()
    showSuccessToast(`템플릿 저장 완료: ${name}`)
  })
}

if (viewTemplateSelect) {
  viewTemplateSelect.addEventListener('click', (e) => e.stopPropagation())
  viewTemplateSelect.addEventListener('mousedown', (e) => e.stopPropagation())
  viewTemplateSelect.addEventListener('change', () => {
    const name = String(viewTemplateSelect.value || '').trim()
    if (!name || !settingTemplates[name]) return
    activeTemplateName = name
    applyTemplateSettings(settingTemplates[name])
    saveUiSettings()
    showSuccessToast(`템플릿 적용 완료: ${name}`)
  })
}

// 복사 드롭다운 메뉴 이벤트
if (menuAutoBlockSwitch) {
  menuAutoBlockSwitch.addEventListener('change', () => {
    readAutoBlockSelect = !!menuAutoBlockSwitch.checked
    if (!readAutoBlockSelect) lastReadSelectedBlocks = []
    updateReadMenuButtons()
    saveUiSettings()
  })
}
if (menuHtmlClipSwitch) {
  menuHtmlClipSwitch.addEventListener('change', () => {
    readHtmlClip = !!menuHtmlClipSwitch.checked
    updateReadMenuButtons()
    saveUiSettings()
  })
}
if (menuHideLabelsSwitch) {
  menuHideLabelsSwitch.addEventListener('change', () => {
    readHideLabels = !!menuHideLabelsSwitch.checked
    applyReadVisualOptions()
    updateReadMenuButtons()
    saveUiSettings()
  })
}
if (menuAutoCopySwitch) {
  menuAutoCopySwitch.addEventListener('change', () => {
    readAutoCopy = !!menuAutoCopySwitch.checked
    if (!readAutoCopy) lastAutoCopiedText = ''
    updateReadMenuButtons()
    if (readAutoCopy) syncReadSelectionAutoCopy()
    saveUiSettings()
  })
}

// =====================
// 드롭다운 메뉴 열기/닫기
// =====================
const menuDropdowns = [
  { btnId: 'menuBtnFile', dropId: 'menuDropFile' },
  { btnId: 'menuBtnView', dropId: 'menuDropView' },
  { btnId: 'menuBtnCopy', dropId: 'menuDropCopy' },
].map(({ btnId, dropId }) => ({
  btn: document.getElementById(btnId),
  drop: document.getElementById(dropId),
})).filter(({ btn, drop }) => btn && drop)

function closeAllMenuDropdowns() {
  menuDropdowns.forEach(({ btn, drop }) => {
    drop.classList.remove('open')
    btn.classList.remove('open')
  })
  closeHeaderColorPalette()
  closeHeaderFontPicker()
}

menuDropdowns.forEach(({ btn, drop }) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const isOpen = drop.classList.contains('open')
    closeAllMenuDropdowns()
    if (!isOpen) {
      drop.classList.add('open')
      btn.classList.add('open')
    }
  })
})

if (viewHeaderPalette) {
  viewHeaderPalette.addEventListener('click', (e) => {
    e.stopPropagation()
  })
}

// 드롭다운 내 버튼 클릭 시 닫기
// 보기 메뉴는 내부 컨트롤 조작이 많아 클릭해도 닫지 않는다.
document.querySelectorAll('.menu-dropdown button.menu-drop-item:not(.header-color-item)').forEach((item) => {
  item.addEventListener('click', () => {
    if (item.closest('#menuDropView')) return
    closeAllMenuDropdowns()
  })
})

// 바깥 클릭 시 닫기
document.addEventListener('click', (e) => {
  const target = e.target
  if (target && target.closest && (target.closest('.menu-dropdown') || target.closest('.menu-btn'))) {
    return
  }
  closeAllMenuDropdowns()
})

// TOC 토글
function toggleTocPanel() {
  tocVisible = !tocVisible
  tocPanel.style.display = tocVisible ? 'flex' : 'none'
  btnToc.classList.toggle('active', tocVisible)
}

btnToc.addEventListener('click', toggleTocPanel)

const btnTocClose = document.getElementById('btnTocClose')
if (btnTocClose) btnTocClose.addEventListener('click', toggleTocPanel)

// IPC 이벤트
ipcRenderer.on('file:loaded', (_, data) => showFile(data))
ipcRenderer.on('file:changed', (_, data) => {
  if (isDirty) return
  diskContent = data.content
  workingContent = data.content
  if (data.docStats) currentDocStats = data.docStats
  setDirty(false)
  renderMarkdown(workingContent)
})
ipcRenderer.on('file:error', (_, msg) => {
  showErrorModal(msg)
})
ipcRenderer.on('debug:log', (_, data) => {
  const level = data && data.level ? data.level : 'INFO'
  const message = data && data.message ? data.message : ''
  appendDebugLog(level, `main ${message}`)
})
ipcRenderer.on('update:status', (_, payload) => {
  const status = payload && payload.status ? String(payload.status) : 'unknown'
  const message = payload && payload.message ? String(payload.message) : ''
  appendDebugLog(status === 'error' ? 'ERROR' : 'INFO', `update:${status} ${message}`.trim())

  if (status === 'downloading' || status === 'checking' || status === 'available') {
    updateSyncIndicatorText(message || '업데이트 확인 중')
    return
  }
  if (status === 'downloaded') {
    updateSyncIndicatorText('업데이트 준비 완료')
    showSuccessToast('업데이트 다운로드 완료')
    return
  }
  if (status === 'none') {
    updateSyncIndicatorText('최신 버전')
    return
  }
  if (status === 'error') {
    updateSyncIndicatorText('업데이트 오류')
    return
  }
  if (status === 'skipped') {
    updateSyncIndicatorText('개발모드(업데이트 건너뜀)')
    return
  }
  updateSyncIndicatorText(message || '자동 동기화 중')
})

// 버튼 이벤트
btnOpen.addEventListener('click', () => openFileDialogWithDirtyCheck())
btnOpenLarge.addEventListener('click', () => openFileDialogWithDirtyCheck())
btnSave.addEventListener('click', async () => {
  await saveCurrentFile()
})
// 줄 이동 인라인 필드
const gotoLineInput = document.getElementById('gotoLineInput')

function doGotoLine() {
  const lineNumber = parseInt(gotoLineInput.value, 10)
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return
  const ok = jumpToSourceLine(lineNumber - 1)
  if (ok) gotoLineInput.blur()
  else gotoLineInput.select()
}

if (gotoLineInput) {
  gotoLineInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doGotoLine() }
    if (e.key === 'Escape') { gotoLineInput.value = ''; gotoLineInput.blur() }
  })
}

if (btnMoveLine) {
  btnMoveLine.addEventListener('click', () => doGotoLine())
}
if (consoleMenuSwitch) {
  consoleMenuSwitch.addEventListener('change', () => {
    setConsoleVisibility(!!consoleMenuSwitch.checked)
  })
}
if (btnConsoleClear) {
  btnConsoleClear.addEventListener('click', () => {
    if (debugConsoleBody) debugConsoleBody.textContent = ''
    appendDebugLog('INFO', '콘솔을 비웠습니다.')
  })
}
if (btnConsoleCopy) {
  btnConsoleCopy.addEventListener('click', async () => {
    const text = debugConsoleBody ? (debugConsoleBody.innerText || '').trim() : ''
    if (!text) {
      appendDebugLog('INFO', '복사할 콘솔 내용이 없습니다.')
      return
    }
    const ok = await copyTextToClipboard(text)
    appendDebugLog(ok ? 'INFO' : 'ERROR', ok ? '콘솔 내용을 복사했습니다.' : '콘솔 복사에 실패했습니다.')
  })
}

// 타이틀바 버튼
btnMinimize.addEventListener('click', () => ipcRenderer.send('window:minimize'))
btnMaximize.addEventListener('click', () => ipcRenderer.send('window:maximize'))
btnClose.addEventListener('click', async () => {
  const okToProceed = await ensureSavedBeforeAction()
  if (!okToProceed) return
  ipcRenderer.send('window:close')
})

// 드래그 앤 드롭
document.addEventListener('dragover', (e) => {
  e.preventDefault()
  e.stopPropagation()
  document.body.classList.add('drag-over')
})

document.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) document.body.classList.remove('drag-over')
})

document.addEventListener('drop', (e) => {
  e.preventDefault()
  e.stopPropagation()
  document.body.classList.remove('drag-over')

  const files = Array.from(e.dataTransfer.files)
  const mdFile = files.find(f => /\.(md|markdown)$/i.test(f.name))
  if (mdFile) {
    ensureSavedBeforeAction().then((okToProceed) => {
      if (!okToProceed) return
      ipcRenderer.invoke('file:loadPath', mdFile.path)
    })
  }
})

// TOC 키보드 탐색
// ↑↓: 이전/다음 항목, ←: 부모(상위 레벨), →: 첫 자식(하위 레벨), Enter: 스크롤 이동
tocList.addEventListener('keydown', (e) => {
  if (!tocItems.length) return

  const cur = focusedTocIndex < 0 ? 0 : focusedTocIndex
  const curLevel = tocItems[cur] ? tocItems[cur].level : 1

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    for (let i = cur + 1; i < tocItems.length; i++) {
      if (tocItems[i].el.style.display !== 'none') { setTocFocus(i); break }
    }

  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    for (let i = cur - 1; i >= 0; i--) {
      if (tocItems[i].el.style.display !== 'none') { setTocFocus(i); break }
    }

  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    // 자식 있고 펼쳐져 있으면 → 접기
    if (hasTocChildren(cur) && !collapsedTocItems.has(cur)) {
      toggleTocItem(cur)
    } else {
      // 부모 헤딩으로 이동
      for (let i = cur - 1; i >= 0; i--) {
        if (tocItems[i].level < curLevel && tocItems[i].el.style.display !== 'none') {
          setTocFocus(i)
          break
        }
      }
    }

  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    // 자식 있고 접혀 있으면 → 펼치기
    if (hasTocChildren(cur) && collapsedTocItems.has(cur)) {
      toggleTocItem(cur)
    } else {
      // 첫 자식으로 이동
      for (let i = cur + 1; i < tocItems.length; i++) {
        if (tocItems[i].level > curLevel && tocItems[i].el.style.display !== 'none') {
          setTocFocus(i)
          break
        }
      }
    }

  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (tocItems[cur]) {
      tocItems[cur].heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
})

// TOC 클릭 시 키보드 포커스 활성화
tocList.addEventListener('click', () => tocList.focus())

// 뷰어 우클릭 시 선택 텍스트 기준으로 메뉴 표시
markdownView.addEventListener('contextmenu', (e) => {
  if (!markdownView.contains(e.target)) return
  appendDebugLog('INFO', 'view:contextmenu event')
  try {
    resetTocContextState('pre-open')
    if (activeInlineEditor) {
      appendDebugLog('INFO', 'view:contextmenu finishing active inline editor')
      finishInlineEditor(true)
    }
    // 기본 브라우저 메뉴는 항상 막고, 앱 메뉴가 안 뜨는 이유를 로그로 남긴다.
    e.preventDefault()
    if (isReadMode) {
      hideTocContextMenu()
      showReadContextMenu(e.clientX, e.clientY)
      appendDebugLog('INFO', 'view:contextmenu read-mode menu shown')
      return
    }

    const labelEl = e.target && e.target.closest ? e.target.closest('.md-label') : null
    if (labelEl && e.altKey) {
      const lineInfo = getLineEditInfoFromTarget(labelEl)
      if (lineInfo && Number.isInteger(lineInfo.sourceLine)) {
        hideTocContextMenu()
        showLabelContextMenu(e.clientX, e.clientY, {
          sourceLine: lineInfo.sourceLine
        })
        appendDebugLog('INFO', `view:contextmenu label menu line=${lineInfo.sourceLine + 1} (alt)`)
        return
      }
    }

    const tableCell = e.target && e.target.closest ? e.target.closest('td, th') : null
    if (tableCell) {
      const table = tableCell.closest('table')
      const allTables = Array.from(markdownBody.querySelectorAll('table'))
      const tableIndex = allTables.findIndex((t) => t === table)
      const row = tableCell.parentElement
      const rowIndex = row ? Array.from(table.rows).indexOf(row) : -1
      const cellIndex = tableCell.cellIndex
      if (tableIndex >= 0 && rowIndex >= 0 && cellIndex >= 0) {
        showTocContextMenu(e.clientX, e.clientY, {
          kind: 'table',
          targetType: 'table',
          tableContext: { tableIndex, rowIndex, cellIndex },
          anchorElement: tableCell,
          selectedText: (tableCell.textContent || '').trim(),
          debugBlocks: [{
            text: `table:${tableIndex + 1} row:${rowIndex + 1} col:${cellIndex + 1}`
          }],
          allowedActions: ['editContent']
        })
        appendDebugLog('INFO', `view:contextmenu table menu t=${tableIndex + 1} r=${rowIndex + 1} c=${cellIndex + 1}`)
        return
      }
    }

    const selection = window.getSelection()
    const selectedText = selection ? selection.toString().trim() : ''
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

    // 원문 라인 기준 우선: 선택 라인이 있으면 해당 라인 태그 범위로 컨텍스트를 구성한다.
    const lineInfo = getLineEditInfoFromTarget(e.target)
    if (lineInfo && Number.isInteger(lineInfo.sourceLine)) {
      const ctx = buildLineBasedContext(lineInfo.sourceLine, e.target, selectedText)
      if (ctx) {
        showTocContextMenu(e.clientX, e.clientY, ctx)
        appendDebugLog('INFO', `view:contextmenu line ctx line=${lineInfo.sourceLine + 1}`)
        return
      }
    }

    if (!selectedText || !range) {
      appendDebugLog('INFO', 'view:contextmenu no selection/no range; fallback menu')
      showTocContextMenu(e.clientX, e.clientY, {
        kind: 'text',
        targetType: 'line',
        allowedActions: []
      })
      return
    }

  const compactSelected = selectedText.replace(/\s+/g, '')
  const isBulletOnlySelection =
    compactSelected.length > 0 &&
    /^[•●◦▪▫■□]+$/.test(compactSelected)

  if (isBulletOnlySelection) {
    const targetLi = e.target && e.target.closest ? e.target.closest('li') : null
    let node = range.startContainer
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement
    const rangeLi = node && node.closest ? node.closest('li') : null
    const li = targetLi || rangeLi
    if (li) {
      const allLis = Array.from(markdownBody.querySelectorAll('li'))
      const listIndex = allLis.findIndex((item) => item === li)
      if (listIndex >= 0) {
        const sourceLine = Number(li.dataset.srcLine)
        const isNumbered = !!li.closest('ol')
        e.preventDefault()
        showTocContextMenu(e.clientX, e.clientY, {
          kind: isNumbered ? 'numbered' : 'bullet',
          targetType: 'list',
          targets: [{
            targetType: 'list',
            listIndex,
            sourceLine: Number.isInteger(sourceLine) ? sourceLine : undefined,
            listText: getListOwnText(li)
          }],
          bulletDepth: getListDepth(li),
          promoteHeadingLevel: inferPromoteHeadingLevelFromLi(li),
          scope: e.altKey ? 'group' : 'single',
          selectedText,
          needsConfirm: !Number.isInteger(sourceLine) || isSelectionNearElementEnd(selectedText, getListOwnText(li)),
          debugBlocks: [{
            sourceLine: Number.isInteger(sourceLine) ? sourceLine : undefined,
            text: getListOwnText(li)
          }],
          anchorElement: li,
          allowedActions: ['editContent', 'shiftUp', 'shiftDown', 'toHeading']
        })
        return
      }
    }
  }

  const intersectingHeadings = Array.from(markdownBody.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter((el) => range.intersectsNode(el))
  const heading = intersectingHeadings.length > 0 ? intersectingHeadings[0] : null
  if (heading && markdownBody.contains(heading)) {
    const targets = intersectingHeadings
      .map((h) => {
        const sourceLine = Number(h.dataset.srcLine)
        const tocIndex = tocItems.findIndex((item) => item.heading === h)
        // TOC에 없는 깊은 헤딩(h5/h6)도 sourceLine이 있으면 포함
        if (tocIndex < 0 && !Number.isInteger(sourceLine)) return null
        return {
          targetType: 'heading',
          tocIndex: tocIndex >= 0 ? tocIndex : undefined,
          sourceLine: Number.isInteger(sourceLine) ? sourceLine : undefined
        }
      })
      .filter(Boolean)
    if (!targets.length) {
      appendDebugLog('INFO', 'view:contextmenu heading block: no targets, fallback menu')
      showTocContextMenu(e.clientX, e.clientY, { kind: 'text', targetType: 'line', allowedActions: [] })
      return
    }
    const debugBlocks = intersectingHeadings.map((h) => ({
      sourceLine: Number.isInteger(Number(h.dataset.srcLine)) ? Number(h.dataset.srcLine) : undefined,
      text: (h.textContent || '').trim()
    }))
    const needsConfirm = debugBlocks.some((b) => !Number.isInteger(b.sourceLine)) ||
      isSelectionNearElementEnd(selectedText, (heading.textContent || '').trim())

    const first = targets[0]
    // TOC에 없는 깊은 헤딩은 toBullet만 지원
    const hasToclessTarget = targets.some((t) => t.tocIndex === undefined)
    const level = first.tocIndex !== undefined && tocItems[first.tocIndex] ? tocItems[first.tocIndex].level : Number(heading.tagName[1]) || null
    const allowedActions = hasToclessTarget
      ? ['toBullet']
      : ['editContent', 'shiftUp', 'shiftDown', 'toBullet']
    e.preventDefault()
    showTocContextMenu(e.clientX, e.clientY, {
      kind: 'heading',
      level,
      targetType: 'heading',
      targets,
      scope: e.altKey ? 'group' : 'single',
      selectedText,
      needsConfirm,
      debugBlocks,
      anchorElement: heading,
      sourceLine: Number.isInteger(first.sourceLine) ? first.sourceLine : undefined,
      allowedActions
    })
    return
  }

  const intersectingLis = Array.from(markdownBody.querySelectorAll('li'))
    .filter((el) => range.intersectsNode(el))
  const targetLis = uniqueDeepestLis(intersectingLis)
  if (targetLis.length > 0) {
    const allLis = Array.from(markdownBody.querySelectorAll('li'))
    const targets = targetLis
      .map((node) => {
        const listIndex = allLis.findIndex((li) => li === node)
        if (listIndex < 0) return null
        const sourceLine = Number(node.dataset.srcLine)
        const ownText = getListOwnText(node)
        return {
          targetType: 'list',
          listIndex,
          sourceLine: Number.isInteger(sourceLine) ? sourceLine : undefined,
          listText: ownText
        }
      })
      .filter(Boolean)
    if (!targets.length) {
      appendDebugLog('INFO', 'view:contextmenu list block: no targets, fallback menu')
      showTocContextMenu(e.clientX, e.clientY, { kind: 'text', targetType: 'line', allowedActions: [] })
      return
    }
    const debugBlocks = targetLis.map((node) => {
      const sourceLine = Number(node.dataset.srcLine)
      const ownText = getListOwnText(node)
      return {
        sourceLine: Number.isInteger(sourceLine) ? sourceLine : undefined,
        text: ownText
      }
    })
    const needsConfirm = debugBlocks.some((b) => !Number.isInteger(b.sourceLine)) ||
      isSelectionNearElementEnd(selectedText, debugBlocks[0] ? debugBlocks[0].text : '')

    const isNumbered = !!targetLis[0].closest('ol')
    const bulletDepth = getListDepth(targetLis[0])
    const promoteHeadingLevel = inferPromoteHeadingLevelFromLi(targetLis[0])
    e.preventDefault()
    showTocContextMenu(e.clientX, e.clientY, {
      kind: isNumbered ? 'numbered' : 'bullet',
      targetType: 'list',
      targets,
      bulletDepth,
      promoteHeadingLevel,
      scope: e.altKey ? 'group' : 'single',
      selectedText,
      needsConfirm,
      debugBlocks,
      anchorElement: targetLis[0],
      sourceLine: Number.isInteger(targets[0].sourceLine) ? targets[0].sourceLine : undefined,
      allowedActions: ['editContent', 'shiftUp', 'shiftDown', 'toHeading']
    })
    return
  }

    // fallthrough: show basic menu
    appendDebugLog('INFO', 'view:contextmenu fallthrough: showing basic menu')
    showTocContextMenu(e.clientX, e.clientY, { kind: 'text', targetType: 'line', allowedActions: [] })
  } catch (err) {
    appendDebugLog('ERROR', `view:contextmenu error ${err && err.message ? err.message : 'unknown'}`)
    showErrorModal(`우클릭 메뉴 오류\n\n${err && err.message ? err.message : 'unknown error'}`)
  }
})

markdownView.addEventListener('mouseup', () => {
  handleReadSelectionUpdate()
})

markdownView.addEventListener('keyup', () => {
  handleReadSelectionUpdate()
})

markdownView.addEventListener('scroll', () => {
  renderLineGutter()
  if (markdownView.scrollHeight > 0) {
    scrollRatio = markdownView.scrollTop / markdownView.scrollHeight
  }
  clearTimeout(scrollSaveTimer)
  scrollSaveTimer = setTimeout(() => {
    appendDebugLog('INFO', `[스크롤] 위치 저장 ratio=${scrollRatio.toFixed(4)}`)
    saveUiSettings()
  }, 800)
}, { passive: true })

markdownView.addEventListener('dblclick', () => {
  if (!isReadMode) return
  clearReadSelection()
})

// TOC 우클릭 메뉴 동작
tocContextMenu.addEventListener('contextmenu', (e) => {
  // 메뉴 위에서 다시 우클릭해도 브라우저 기본 컨텍스트가 뜨지 않게 막는다.
  e.preventDefault()
})

tocContextMenu.addEventListener('pointerup', (e) => {
  const item = e.target.closest('[data-action]')
  if (!item) return
  const clickType = e.button === 2 ? 'right' : 'left'
  appendDebugLog('INFO', `menu:${item.dataset.action || '?'} ${clickType}-pointerup execute`)
  // 일부 환경에서 click 누락이 있어 pointerup에서 실행을 보강한다.
  item.click()
})

tocContextMenu.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]')
  if (!target) {
    appendDebugLog('INFO', 'menu:click ignored (no action target)')
    resetTocContextState('empty-click')
    return
  }

  const action = target.dataset.action
  if (!action) {
    appendDebugLog('INFO', 'menu:click ignored (empty action)')
    resetTocContextState('empty-action')
    return
  }
  if (target.dataset.enabled === '0') {
    appendDebugLog('INFO', `menu:${action} ignored (disabled for current context)`)
    resetTocContextState('disabled-action')
    return
  }
  if (!contextTarget && !lastMenuActionContext) {
    appendDebugLog('ERROR', `menu:${action} blocked (context missing)`)
    resetTocContextState('context-missing')
    return
  }
  const actionContext = contextTarget || lastMenuActionContext
  const rawLine = resolveEditableLineFromContext(actionContext)
  const rawLineText = Number.isInteger(rawLine) && rawLine >= 0 ? String(rawLine + 1) : '?'
  appendDebugLog('INFO', `menu:${action} clicked line=${rawLineText}`)

  if (action === 'editContent') {
    if (actionContext.tableContext) {
      const tableContext = actionContext.tableContext
      resetTocContextState('edit-table')
      await editTableCellAtContext(tableContext)
      return
    }
    const line = resolveEditableLineFromContext(actionContext)
    if (Number.isInteger(line) && line >= 0) {
      const anchorElement = actionContext.anchorElement || null
      resetTocContextState('edit-line')
      editLineBySourceLine(line, anchorElement)
      return
    }
    resetTocContextState('edit-line-missing')
    showErrorModal('편집할 내용을 찾지 못했습니다. 대상을 다시 선택한 뒤 시도해 주세요.')
    appendDebugLog('ERROR', 'menu:editContent failed (editable line not found)')
    return
  }

  if (!currentFilePath) {
    appendDebugLog('ERROR', `menu:${action} blocked (currentFilePath missing)`)
    resetTocContextState('file-missing')
    return
  }

  const forcePromoteConfirm =
    action === 'shiftUp' &&
    (actionContext.kind === 'bullet' || actionContext.kind === 'numbered') &&
    actionContext.bulletDepth === 1

  if (forcePromoteConfirm) {
    const level = Number.isInteger(actionContext.promoteHeadingLevel) ? actionContext.promoteHeadingLevel : 2
    const ok = await askConfirm(`최상위 블릿입니다. 헤더 H${level}로 이동합니다.`)
    if (!ok) {
      appendDebugLog('INFO', `menu:${action} canceled by user (force promote confirm)`)
      resetTocContextState('confirm-cancel')
      return
    }
  } else if (actionContext.needsConfirm) {
    const actionLabelMap = {
      shiftUp: '위계 한 단계 위로',
      shiftDown: '위계 한 단계 아래로',
      toBullet: '헤더 -> 블릿',
      toHeading: '블릿 -> 헤더'
    }
    const modeLabel = actionContext.scope === 'group' ? '그룹 이동' : '나혼자 이동'
    const ok = await askConfirm(
      `${actionLabelMap[action] || action}을(를) 진행할까요?\n현재 모드: ${modeLabel}`
    )
    if (!ok) {
      appendDebugLog('INFO', `menu:${action} canceled by user (confirm dialog)`)
      resetTocContextState('confirm-cancel')
      return
    }
  }

  appendDebugLog('INFO', `tree:${action} request start`)
  const serialTarget = toSerializableTransformTarget(actionContext)
  if (!serialTarget) {
    appendDebugLog('ERROR', `tree:${action} blocked (serial target missing)`)
    showErrorModal('위계 이동 요청을 만들 수 없습니다.')
    resetTocContextState('serial-target-missing')
    return
  }
  let result = null
  try {
    result = await invokeWithTimeout('file:transformTree', {
      filePath: currentFilePath,
      action,
      target: serialTarget,
      scope: actionContext.scope || 'single',
      currentContent: workingContent
    }, 12000)
    appendDebugLog('INFO', `tree:${action} response received`)
  } catch (err) {
    const message = err && err.message ? err.message : 'invoke failed'
    appendDebugLog('ERROR', `tree:${action} invoke error ${message}`)
    showErrorModal(`위계 이동 IPC 오류\n\n${message}`)
    resetTocContextState('invoke-error')
    return
  }

  if (!result?.ok) {
    const code = result?.code || 'E_UNKNOWN'
    const line = resolveEditableLineFromContext(actionContext)
    const lineText = Number.isInteger(line) && line >= 0 ? String(line + 1) : '?'
    const msg = [
      `${result?.message || '위계 변경 저장에 실패했습니다.'}`,
      '',
      `오류코드: ${code}`,
      `액션: ${action}`,
      `라인: ${lineText}`
    ].join('\n')
    appendDebugLog('ERROR', `tree:${action} failed code=${code} line=${lineText} msg=${result?.message || 'unknown'}`)
    showErrorModal(msg)
    stabilizeMenuUi('action-failed')
  } else if (typeof result.updatedContent === 'string') {
    workingContent = result.updatedContent
    setDirty(workingContent !== diskContent)
    renderMarkdown(workingContent)
    const line = resolveEditableLineFromContext(actionContext)
    const lineText = Number.isInteger(line) && line >= 0 ? String(line + 1) : '?'
    appendDebugLog('INFO', `tree:${action} ok line=${lineText}`)
    showSuccessToast(`${getActionLabel(action)} 완료 (line:${lineText})`)
    stabilizeMenuUi('action-success')
  }
  resetTocContextState('action-complete')
})

labelContextMenu.addEventListener('click', (e) => {
  const item = e.target.closest('[data-label]')
  if (!item || !labelContextTarget) return
  const labelName = item.dataset.label
  const sourceLine = Number(labelContextTarget.sourceLine)
  if (!labelName || !Number.isInteger(sourceLine)) {
    hideLabelContextMenu()
    return
  }
  replaceLabelBySourceLine(sourceLine, labelName)
  hideLabelContextMenu()
})

document.addEventListener('pointerdown', (e) => {
  const target = e.target
  const inTocMenu = tocContextMenu.contains(target)
  const inReadMenu = readContextMenu.contains(target)
  const inLabelMenu = labelContextMenu.contains(target)
  if (!inTocMenu && tocContextMenu.style.display !== 'none') {
    resetTocContextState('outside-pointerdown')
    appendDebugLog('INFO', 'menu:toc closed by outside pointerdown')
  }
  if (!inReadMenu && readContextMenu.style.display !== 'none') {
    hideReadContextMenu()
    appendDebugLog('INFO', 'menu:read closed by outside pointerdown')
  }
  if (!inLabelMenu && labelContextMenu.style.display !== 'none') {
    hideLabelContextMenu()
    appendDebugLog('INFO', 'menu:label closed by outside pointerdown')
  }
}, true)

document.addEventListener('scroll', (e) => {
  if (debugConsoleBody && debugConsoleBody.contains(e.target)) return
  hideAllContextMenus()
}, true)
window.addEventListener('resize', hideAllContextMenus)
window.addEventListener('resize', renderLineGutter)
document.addEventListener('keydown', (e) => {
  if (isReadMode) return
  if (e.key === 'Alt' && contextTarget && tocContextMenu.style.display !== 'none') {
    contextTarget.scope = 'group'
    tocContextMenuStatus.textContent = buildContextStatusText(contextTarget)
  }
})
document.addEventListener('keyup', (e) => {
  if (isReadMode) return
  if (e.key === 'Alt' && contextTarget && tocContextMenu.style.display !== 'none') {
    contextTarget.scope = 'single'
    tocContextMenuStatus.textContent = buildContextStatusText(contextTarget)
  }
})

// 키보드 단축키
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && confirmModal.style.display !== 'none') {
    e.preventDefault()
    btnConfirmCancel.click()
    return
  }
  if (e.key === 'Escape' && isReadMode) {
    e.preventDefault()
    clearReadSelection()
  }
  if (e.key === 'Escape') hideAllContextMenus()
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (!currentFilePath) return
    ipcRenderer.invoke('file:undo', { filePath: currentFilePath, currentContent: workingContent }).then((result) => {
      if (!result?.ok && result?.message && result.message !== '되돌릴 변경이 없습니다.') {
        showErrorModal(result.message)
      } else if (result?.ok && typeof result.previousContent === 'string') {
        workingContent = result.previousContent
        setDirty(workingContent !== diskContent)
        renderMarkdown(workingContent)
      }
    })
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    btnSave.click()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault()
    openFileDialogWithDirtyCheck()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
    e.preventDefault()
    if (gotoLineInput) { gotoLineInput.focus(); gotoLineInput.select() }
  }
})


function tableToPlainText(table) {
  return Array.from(table.querySelectorAll('tr'))
    .map((tr) =>
      Array.from(tr.querySelectorAll('td, th'))
        .map((c) => c.textContent.replace(/\s+/g, ' ').trim())
        .join('\t')
    )
    .join('\n')
}

document.addEventListener('copy', (e) => {
  if (!isReadMode) return

  // 자동블록/수동 공통: 복사할 텍스트 수집
  function getReadCopyText() {
    if (readAutoBlockSelect && lastReadSelectedBlocks.length > 0) {
      const lines = lastReadSelectedBlocks.map((b) => {
        if (b.tagName === 'TABLE') return tableToPlainText(b)
        return getBlockTextWithoutLabels(b)
      }).filter(Boolean)
      return { source: 'autoblock', text: lines.join('\n'), blocks: lastReadSelectedBlocks }
    }
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return { source: 'nosel', text: '' }
    const range = sel.getRangeAt(0)
    const fragment = range.cloneContents()
    const wrapper = document.createElement('div')
    wrapper.appendChild(fragment)
    wrapper.querySelectorAll('.md-label').forEach((el) => el.remove())
    return { source: 'manual', text: normalizeCopiedText(wrapper.innerText || wrapper.textContent || ''), wrapper }
  }

  const { source, text, blocks, wrapper } = getReadCopyText()

  if (!text) {
    appendDebugLog('INFO', `[복사:스킵] 선택된 블록 없음 (source=${source})`)
    return
  }

  e.preventDefault()
  const { clipboard } = require('electron')

  // 표 HTML 처리
  const tables = source === 'autoblock'
    ? (blocks || []).filter((b) => b.tagName === 'TABLE')
    : (wrapper ? [...wrapper.querySelectorAll('table')] : [])

  const textContent = toCRLF(readStripNumbers ? stripNumberLabels(text) : text)

  if (tables.length > 0) {
    const htmlContent = tables.map((t) => t.outerHTML).join('\n')
    clipboard.write({ html: htmlContent, text: textContent })
    const label = readHtmlClip ? '[복사:HTML클립]' : '[복사:표HTML]'
    appendDebugLog('INFO', `${label} 표${tables.length}개 ${textContent.length}자 — ${textContent.slice(0, 60)}${textContent.length > 60 ? '…' : ''}`)
  } else if (readHtmlClip || source === 'autoblock') {
    clipboard.write({ text: textContent })
    appendDebugLog('INFO', `[복사:텍스트] ${textContent.length}자 (${source}) — ${textContent.slice(0, 60)}${textContent.length > 60 ? '…' : ''}`)
  } else {
    if (e.clipboardData) e.clipboardData.setData('text/plain', textContent)
    appendDebugLog('INFO', `[일반복사] ${textContent.length}자 — ${textContent.slice(0, 60)}${textContent.length > 60 ? '…' : ''}`)
  }
})

btnErrorClose.addEventListener('click', hideErrorModal)
errorModal.addEventListener('click', (e) => {
  if (e.target === errorModal) hideErrorModal()
})

setConsoleVisibility(true)
appendDebugLog('INFO', '디버그 콘솔이 시작되었습니다.')
