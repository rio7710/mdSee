const { contextBridge, ipcRenderer } = require('electron')
const { marked } = require('marked')
const hljs = require('highlight.js')

// marked 설정
marked.setOptions({
  breaks: true,
  gfm: true
})

// 커스텀 렌더러 - 코드 하이라이팅
const renderer = new marked.Renderer()
renderer.code = (code, language) => {
  let highlighted
  if (language && hljs.getLanguage(language)) {
    highlighted = hljs.highlight(code, { language }).value
  } else {
    highlighted = hljs.highlightAuto(code).value
  }
  const lang = language ? ` class="language-${language}"` : ''
  return `<pre><code${lang}>${highlighted}</code></pre>`
}

marked.use({ renderer })

contextBridge.exposeInMainWorld('mdAPI', {
  // 파일 작업
  openFile: () => ipcRenderer.invoke('file:open'),
  loadPath: (filePath) => ipcRenderer.invoke('file:loadPath', filePath),

  // 마크다운 렌더링
  renderMd: (content) => marked.parse(content),
  highlightBlock: (block) => hljs.highlightElement(block),

  // IPC 이벤트 리스너
  onFileLoaded: (callback) => {
    ipcRenderer.on('file:loaded', (event, data) => callback(data))
  },
  onFileChanged: (callback) => {
    ipcRenderer.on('file:changed', (event, data) => callback(data))
  },
  onFileError: (callback) => {
    ipcRenderer.on('file:error', (event, msg) => callback(msg))
  },

  // 윈도우 컨트롤
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close')
})
