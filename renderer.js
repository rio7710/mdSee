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
const tocPanel = document.getElementById('tocPanel')
const tocList = document.getElementById('tocList')
const filePath = document.getElementById('filePath')
const watchIndicator = document.getElementById('watchIndicator')
const appTitle = document.getElementById('appTitle')
const btnOpen = document.getElementById('btnOpen')
const btnOpenLarge = document.getElementById('btnOpenLarge')
const btnSave = document.getElementById('btnSave')
const btnMinimize = document.getElementById('btnMinimize')
const btnMaximize = document.getElementById('btnMaximize')
const btnClose = document.getElementById('btnClose')
const btnToc = document.getElementById('btnToc')
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
const labelContextMenu = document.getElementById('labelContextMenu')
const labelContextMenuStatus = document.getElementById('labelContextMenuStatus')
const modeSwitch = document.getElementById('modeSwitch')
const modeText = document.getElementById('modeText')
const advancedMenuSwitch = document.getElementById('advancedMenuSwitch')
const advancedMenuText = document.getElementById('advancedMenuText')

let scrollRatio = 0
let tocVisible = true
let focusedTocIndex = -1  // 키보드로 포커스된 TOC 항목 인덱스
let tocItems = []         // TOC 항목 배열 (레벨 정보 포함)
let currentFilePath = ''
let contextTarget = null
let diskContent = ''
let workingContent = ''
let isDirty = false
let isReadMode = false
let isAdjustingReadSelection = false
let readHideLabels = false
let readAutoCopy = false
let readAutoBlockSelect = true
let readHtmlClip = false
let advancedMenu = false
let lastAutoCopiedText = ''
let lastReadSelectedBlocks = []
let activeInlineEditor = null
let labelContextTarget = null

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
  let m = line.match(/^(\s*)([-+*])([ \t]+)(.*)$/)
  if (m) return { text: m[4] }
  m = line.match(/^(\s*)(\d+[.)])([ \t]+)(.*)$/)
  if (m) return { text: m[4] }
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

function inferListSourceLine(content, listText) {
  const key = normalizeCompareText(listText)
  if (!key) return undefined
  const lines = String(content || '').split(/\r?\n/)
  const matches = []
  for (let i = 0; i < lines.length; i++) {
    const l = parseListLine(lines[i])
    if (!l) continue
    const candidate = normalizeCompareText(l.text)
    if (!candidate) continue
    if (candidate === key || candidate.includes(key) || key.includes(candidate)) {
      matches.push(i)
    }
  }
  if (matches.length === 1) return matches[0]
  return undefined
}

function annotateSourceLines(content) {
  const lines = String(content || '').split(/\r?\n/)
  const headingSrc = []
  const listSrc = []
  for (let i = 0; i < lines.length; i++) {
    const h = parseHeadingLine(lines[i])
    if (h && h.level >= 1 && h.level <= 4) {
      headingSrc.push({ line: i, level: h.level, text: normalizeCompareText(h.text) })
    }
    const l = parseListLine(lines[i])
    if (l) {
      listSrc.push({ line: i, text: normalizeCompareText(l.text) })
    }
  }

  const domHeadings = Array.from(markdownBody.querySelectorAll('h1, h2, h3, h4'))
  let hCursor = 0
  for (const el of domHeadings) {
    const level = Number(el.tagName[1])
    const text = normalizeCompareText(el.textContent)
    let found = -1
    for (let j = hCursor; j < headingSrc.length; j++) {
      const c = headingSrc[j]
      if (c.level !== level) continue
      if (c.text === text || c.text.includes(text) || text.includes(c.text)) {
        found = j
        break
      }
    }
    if (found >= 0) {
      el.dataset.srcLine = String(headingSrc[found].line)
      hCursor = found + 1
    } else {
      delete el.dataset.srcLine
    }
  }

  const domLis = Array.from(markdownBody.querySelectorAll('li'))
  let lCursor = 0
  for (const el of domLis) {
    const text = normalizeCompareText(getListOwnText(el))
    let found = -1
    for (let j = lCursor; j < listSrc.length; j++) {
      const c = listSrc[j]
      if (c.text === text || c.text.includes(text) || text.includes(c.text)) {
        found = j
        break
      }
    }
    if (found >= 0) {
      el.dataset.srcLine = String(listSrc[found].line)
      lCursor = found + 1
    } else {
      delete el.dataset.srcLine
    }
  }
}

function hideTocContextMenu() {
  tocContextMenu.style.display = 'none'
  contextTarget = null
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
  readToggleAutoBlock.textContent = blockText
  readToggleHtmlClip.textContent = htmlClipText
  readToggleLabels.textContent = labelText
  readToggleAutoCopy.textContent = copyText
  readToggleAutoBlock.classList.toggle('is-on', readAutoBlockSelect)
  readToggleHtmlClip.classList.toggle('is-on', readHtmlClip)
  readToggleLabels.classList.toggle('is-on', readHideLabels)
  readToggleAutoCopy.classList.toggle('is-on', readAutoCopy)
}

function showReadContextMenu(x, y) {
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
  if (advancedMenuText) advancedMenuText.textContent = `고급메뉴: ${advancedMenu ? '켬' : '끔'}`
}

function collectUiSettings() {
  return {
    readMode: isReadMode,
    advancedMenu,
    readHideLabels,
    readAutoCopy,
    readAutoBlockSelect,
    readHtmlClip
  }
}

async function saveUiSettings() {
  try {
    await ipcRenderer.invoke('settings:set', collectUiSettings())
  } catch (_) {}
}

function applyUiSettings(settings = {}) {
  advancedMenu = !!settings.advancedMenu
  readHideLabels = !!settings.readHideLabels
  readAutoCopy = !!settings.readAutoCopy
  readAutoBlockSelect = settings.readAutoBlockSelect !== false  // 기본값 true
  readHtmlClip = !!settings.readHtmlClip
  updateAdvancedMenuToggleUi()
  updateReadMenuButtons()
  applyReadVisualOptions()
  setReadMode(!!settings.readMode)
}

async function loadUiSettings() {
  try {
    const result = await ipcRenderer.invoke('settings:get')
    if (!result?.ok || !result.settings) return
    applyUiSettings(result.settings)
  } catch (_) {}
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

async function copyTextToClipboard(text) {
  const value = String(text || '')
  if (!value.trim()) return false
  try {
    await navigator.clipboard.writeText(value)
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
  if (isReadMode && lastReadSelectedBlocks.length > 0) {
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
  return normalizeCopiedText(raw)
}

function normalizeCopiedText(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
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
  const srcHolder = targetEl.closest('[data-src-line]')
  const directSrc = srcHolder ? Number(srcHolder.dataset.srcLine) : NaN
  if (Number.isInteger(directSrc)) return { sourceLine: directSrc }
  const block = targetEl.closest(BLOCK_SELECTORS)
  if (!block) return null
  const inferred = inferSourceLineFromText(workingContent, block.textContent || '')
  if (!Number.isInteger(inferred) || inferred < 0) return null
  return { sourceLine: inferred }
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
  const text = getSelectionTextWithoutLabels()
  const normalized = text.trim()
  if (!normalized || normalized === lastAutoCopiedText) return
  const ok = await copyTextToClipboard(text)
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
  hideAllContextMenus()
}

function showTocContextMenu(x, y, contextInfo = {}) {
  contextTarget = contextInfo
  tocContextMenu.style.display = 'block'

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
  tocContextMenuStatus.textContent = buildContextStatusText(contextInfo)

  tocContextMenuItems.forEach((btn) => {
    const action = btn.dataset.action
    const enabled = allowedActions.includes(action)
    btn.disabled = !enabled
    btn.style.display = enabled || advancedMenu ? 'block' : 'none'
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

  const fromSelection = inferSourceLineFromText(workingContent, ctx.selectedText || '')
  if (Number.isInteger(fromSelection) && fromSelection >= 0) return fromSelection

  if (Array.isArray(ctx.debugBlocks)) {
    const fromDebug = ctx.debugBlocks.find((b) => Number.isInteger(Number(b && b.sourceLine)))
    if (fromDebug) return Number(fromDebug.sourceLine)
    const inferred = inferSourceLineFromText(
      workingContent,
      ctx.debugBlocks.map((b) => (b && b.text ? b.text : '')).join(' ')
    )
    if (Number.isInteger(inferred) && inferred >= 0) return inferred
  }

  return -1
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

// TOC 생성
function buildToc() {
  const headings = markdownBody.querySelectorAll('h1, h2, h3, h4')
  tocList.innerHTML = ''
  tocItems = []
  focusedTocIndex = -1

  if (headings.length === 0) {
    tocPanel.style.display = 'none'
    return
  }

  headings.forEach((h, i) => {
    h.id = `heading-${i}-${slugify(h.textContent)}`
    const level = parseInt(h.tagName[1])  // 1~4

    const item = document.createElement('div')
    item.className = `toc-item toc-${h.tagName.toLowerCase()}`
    item.textContent = h.textContent
    item.title = h.textContent
    item.tabIndex = -1

    item.addEventListener('click', () => {
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

  // TOC에 키보드 포커스 가능하게
  tocList.tabIndex = 0

  // 스크롤 시 활성 헤딩 업데이트
  markdownView.addEventListener('scroll', updateActiveToc, { passive: true })
}

// 스크롤 위치에 따라 활성 TOC 항목 업데이트
function updateActiveToc() {
  if (!tocItems.length) return

  let activeIndex = 0
  const scrollTop = markdownView.scrollTop + 80

  tocItems.forEach(({ heading }, i) => {
    if (heading.offsetTop <= scrollTop) activeIndex = i
  })

  tocItems.forEach(({ el }, i) => {
    el.classList.toggle('active', i === activeIndex)
  })
}

function renderMarkdown(content) {
  if (markdownView.scrollHeight > 0) {
    scrollRatio = markdownView.scrollTop / markdownView.scrollHeight
  }

  markdownBody.innerHTML = marked.parse(decorateLabelsForDisplay(content))
  annotateSourceLines(content)
  buildToc()

  requestAnimationFrame(() => {
    if (markdownView.scrollHeight > 0) {
      markdownView.scrollTop = markdownView.scrollHeight * scrollRatio
    }
    updateActiveToc()
  })
}

function showFile(data) {
  dropzone.style.display = 'none'
  document.getElementById('mainLayout').style.display = 'flex'
  watchIndicator.style.display = 'flex'

  filePath.textContent = data.filePath
  filePath.title = data.filePath
  appTitle.textContent = `mdSee — ${data.fileName}`
  currentFilePath = data.filePath
  diskContent = data.content
  workingContent = data.content
  setDirty(false)

  renderMarkdown(workingContent)
}

setReadMode(false)
updateAdvancedMenuToggleUi()
updateReadMenuButtons()
loadUiSettings()

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

// TOC 토글
btnToc.addEventListener('click', () => {
  tocVisible = !tocVisible
  tocPanel.style.display = tocVisible ? 'flex' : 'none'
  btnToc.classList.toggle('active', tocVisible)
})

// IPC 이벤트
ipcRenderer.on('file:loaded', (_, data) => showFile(data))
ipcRenderer.on('file:changed', (_, data) => {
  if (isDirty) return
  diskContent = data.content
  workingContent = data.content
  setDirty(false)
  renderMarkdown(workingContent)
})
ipcRenderer.on('file:error', (_, msg) => {
  showErrorModal(msg)
})

// 버튼 이벤트
btnOpen.addEventListener('click', () => openFileDialogWithDirtyCheck())
btnOpenLarge.addEventListener('click', () => openFileDialogWithDirtyCheck())
btnSave.addEventListener('click', async () => {
  await saveCurrentFile()
})

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
    setTocFocus(Math.min(cur + 1, tocItems.length - 1))

  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setTocFocus(Math.max(cur - 1, 0))

  } else if (e.key === 'ArrowLeft') {
    // 부모 헤딩: 현재보다 레벨이 낮은(숫자 작은) 이전 항목
    e.preventDefault()
    for (let i = cur - 1; i >= 0; i--) {
      if (tocItems[i].level < curLevel) {
        setTocFocus(i)
        break
      }
    }

  } else if (e.key === 'ArrowRight') {
    // 첫 자식 헤딩: 현재보다 레벨이 높은(숫자 큰) 다음 항목
    e.preventDefault()
    for (let i = cur + 1; i < tocItems.length; i++) {
      if (tocItems[i].level > curLevel) {
        setTocFocus(i)
        break
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
  if (isReadMode) {
    e.preventDefault()
    hideTocContextMenu()
    showReadContextMenu(e.clientX, e.clientY)
    return
  }

  const labelEl = e.target && e.target.closest ? e.target.closest('.md-label') : null
  if (labelEl) {
    const lineInfo = getLineEditInfoFromTarget(labelEl)
    if (lineInfo && Number.isInteger(lineInfo.sourceLine)) {
      e.preventDefault()
      hideTocContextMenu()
      showLabelContextMenu(e.clientX, e.clientY, {
        sourceLine: lineInfo.sourceLine
      })
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
      e.preventDefault()
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
      return
    }
  }

  const selection = window.getSelection()
  const selectedText = selection ? selection.toString().trim() : ''
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  if (!selectedText || !range) {
    const lineInfo = getLineEditInfoFromTarget(e.target)
    if (lineInfo && Number.isInteger(lineInfo.sourceLine)) {
      e.preventDefault()
      showTocContextMenu(e.clientX, e.clientY, {
        kind: 'text',
        targetType: 'line',
        sourceLine: lineInfo.sourceLine,
        anchorElement: e.target.closest ? e.target.closest(BLOCK_SELECTORS) : null,
        selectedText: (e.target && e.target.textContent ? e.target.textContent : '').trim(),
        debugBlocks: [{ sourceLine: lineInfo.sourceLine, text: `line:${lineInfo.sourceLine + 1}` }],
        allowedActions: ['editContent']
      })
    }
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

  const intersectingHeadings = Array.from(markdownBody.querySelectorAll('h1, h2, h3, h4'))
    .filter((el) => range.intersectsNode(el))
  const heading = intersectingHeadings.length > 0 ? intersectingHeadings[0] : null
  if (heading && markdownBody.contains(heading)) {
    const targets = intersectingHeadings
      .map((h) => {
        const sourceLine = Number(h.dataset.srcLine)
        const tocIndex = tocItems.findIndex((item) => item.heading === h)
        if (tocIndex < 0) return null
        return {
          targetType: 'heading',
          tocIndex,
          sourceLine: Number.isInteger(sourceLine) ? sourceLine : undefined
        }
      })
      .filter(Boolean)
    if (!targets.length) return
    const debugBlocks = intersectingHeadings.map((h) => ({
      sourceLine: Number.isInteger(Number(h.dataset.srcLine)) ? Number(h.dataset.srcLine) : undefined,
      text: (h.textContent || '').trim()
    }))
    const needsConfirm = debugBlocks.some((b) => !Number.isInteger(b.sourceLine)) ||
      isSelectionNearElementEnd(selectedText, (heading.textContent || '').trim())

    const first = targets[0]
    const level = tocItems[first.tocIndex] ? tocItems[first.tocIndex].level : null
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
      allowedActions: ['editContent', 'shiftUp', 'shiftDown', 'toBullet']
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
        const fromDataset = Number(node.dataset.srcLine)
        const ownText = getListOwnText(node)
        const inferred = inferListSourceLine(workingContent, ownText)
        const sourceLine = Number.isInteger(fromDataset) ? fromDataset : inferred
        return {
          targetType: 'list',
          listIndex,
          sourceLine: Number.isInteger(sourceLine) ? sourceLine : undefined,
          listText: ownText
        }
      })
      .filter(Boolean)
    if (!targets.length) return
    const debugBlocks = targetLis.map((node) => {
      const fromDataset = Number(node.dataset.srcLine)
      const ownText = getListOwnText(node)
      const inferred = inferListSourceLine(workingContent, ownText)
      const sourceLine = Number.isInteger(fromDataset) ? fromDataset : inferred
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

  const lineInfo = getLineEditInfoFromTarget(e.target)
  if (lineInfo && Number.isInteger(lineInfo.sourceLine)) {
    e.preventDefault()
    showTocContextMenu(e.clientX, e.clientY, {
      kind: 'text',
      targetType: 'line',
      sourceLine: lineInfo.sourceLine,
      anchorElement: e.target.closest ? e.target.closest(BLOCK_SELECTORS) : null,
      selectedText,
      debugBlocks: [{ sourceLine: lineInfo.sourceLine, text: `line:${lineInfo.sourceLine + 1}` }],
      allowedActions: ['editContent']
    })
  }
})

markdownView.addEventListener('mouseup', () => {
  handleReadSelectionUpdate()
})

markdownView.addEventListener('keyup', () => {
  handleReadSelectionUpdate()
})

markdownView.addEventListener('dblclick', () => {
  if (!isReadMode) return
  clearReadSelection()
})

// TOC 우클릭 메뉴 동작
tocContextMenu.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]')
  if (!target) return

  const action = target.dataset.action
  if (!action) return
  if (!contextTarget) return

  if (action === 'editContent') {
    if (contextTarget.tableContext) {
      const tableContext = contextTarget.tableContext
      hideTocContextMenu()
      await editTableCellAtContext(tableContext)
      return
    }
    const line = resolveEditableLineFromContext(contextTarget)
    if (Number.isInteger(line) && line >= 0) {
      const anchorElement = contextTarget.anchorElement || null
      hideTocContextMenu()
      editLineBySourceLine(line, anchorElement)
      return
    }
    hideTocContextMenu()
    showErrorModal('편집할 내용을 찾지 못했습니다. 대상을 다시 선택한 뒤 시도해 주세요.')
    return
  }

  if (!currentFilePath) return

  const forcePromoteConfirm =
    action === 'shiftUp' &&
    (contextTarget.kind === 'bullet' || contextTarget.kind === 'numbered') &&
    contextTarget.bulletDepth === 1

  if (forcePromoteConfirm) {
    const level = Number.isInteger(contextTarget.promoteHeadingLevel) ? contextTarget.promoteHeadingLevel : 2
    const ok = await askConfirm(`최상위 블릿입니다. 헤더 H${level}로 이동합니다.`)
    if (!ok) {
      hideTocContextMenu()
      return
    }
  } else if (contextTarget.needsConfirm) {
    const actionLabelMap = {
      shiftUp: '위계 한 단계 위로',
      shiftDown: '위계 한 단계 아래로',
      toBullet: '헤더 -> 블릿',
      toHeading: '블릿 -> 헤더'
    }
    const modeLabel = contextTarget.scope === 'group' ? '그룹 이동' : '나혼자 이동'
    const ok = await askConfirm(
      `${actionLabelMap[action] || action}을(를) 진행할까요?\n현재 모드: ${modeLabel}`
    )
    if (!ok) {
      hideTocContextMenu()
      return
    }
  }

  const result = await ipcRenderer.invoke('file:transformTree', {
    filePath: currentFilePath,
    action,
    target: contextTarget,
    scope: contextTarget.scope || 'single',
    currentContent: workingContent
  })

  if (!result?.ok) {
    const msg = result?.message || '위계 변경 저장에 실패했습니다.'
    showErrorModal(msg)
  } else if (typeof result.updatedContent === 'string') {
    workingContent = result.updatedContent
    setDirty(workingContent !== diskContent)
    renderMarkdown(workingContent)
  }
  hideTocContextMenu()
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

document.addEventListener('click', (e) => {
  const inTocMenu = tocContextMenu.contains(e.target)
  const inReadMenu = readContextMenu.contains(e.target)
  const inLabelMenu = labelContextMenu.contains(e.target)
  if (!inTocMenu) hideTocContextMenu()
  if (!inReadMenu) hideReadContextMenu()
  if (!inLabelMenu) hideLabelContextMenu()
})

document.addEventListener('scroll', hideAllContextMenus, true)
window.addEventListener('resize', hideAllContextMenus)
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
  }
})

function getSelectedTables() {
  // lastReadSelectedBlocks 에 TABLE 이 있으면 우선 사용
  const fromBlocks = lastReadSelectedBlocks.filter((b) => b.tagName === 'TABLE')
  if (fromBlocks.length > 0) return fromBlocks

  // 수동 모드일 때: 현재 selection range 에서 교차하는 TABLE 탐색
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return []
  const range = selection.getRangeAt(0)
  return Array.from(markdownBody.querySelectorAll('table')).filter((t) => {
    try { return range.intersectsNode(t) } catch (_) { return false }
  })
}

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

  if (readHtmlClip) {
    // HTML 클립 켬: 선택된 모든 블록을 HTML로 복사
    const blocks = lastReadSelectedBlocks.length > 0
      ? lastReadSelectedBlocks
      : (() => {
          const sel = window.getSelection()
          if (!sel || sel.rangeCount === 0) return []
          const range = sel.getRangeAt(0)
          return uniqueDeepestBlocks(getIntersectingBlocks(range))
        })()
    if (blocks.length === 0) return
    e.preventDefault()
    const { clipboard } = require('electron')
    const htmlContent = blocks.map((b) => {
      const clone = b.cloneNode(true)
      clone.querySelectorAll('.md-label').forEach((el) => el.remove())
      return clone.outerHTML
    }).join('\n')
    const textContent = blocks.map((b) => {
      if (b.tagName === 'TABLE') return tableToPlainText(b)
      return getBlockTextWithoutLabels(b)
    }).filter(Boolean).join('\n')
    clipboard.write({ html: htmlContent, text: textContent })
    return
  }

  // HTML 클립 끔: 표만 HTML, 나머지는 텍스트
  const tables = getSelectedTables()
  if (tables.length > 0) {
    e.preventDefault()
    const { clipboard } = require('electron')
    const htmlContent = tables.map((t) => t.outerHTML).join('\n')
    const textContent = tables.map(tableToPlainText).join('\n\n')
    clipboard.write({ html: htmlContent, text: textContent })
    return
  }

  const text = getSelectionTextWithoutLabels()
  if (!text) return
  e.preventDefault()
  if (e.clipboardData) {
    e.clipboardData.setData('text/plain', text)
  }
})

btnErrorClose.addEventListener('click', hideErrorModal)
errorModal.addEventListener('click', (e) => {
  if (e.target === errorModal) hideErrorModal()
})
