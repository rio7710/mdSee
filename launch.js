/**
 * ELECTRON_RUN_AS_NODE 환경변수를 제거하고 Electron 앱을 실행하는 래퍼
 * Claude Code 환경에서 ELECTRON_RUN_AS_NODE=1이 자동 설정되는 문제 해결
 */
const { spawn } = require('child_process')
const path = require('path')

const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

// 파일 연결(더블클릭)로 전달된 인자를 Electron 앱으로 그대로 전달한다.
const passthroughArgs = process.argv.slice(2)

const child = spawn(electronExe, ['.', ...passthroughArgs], {
  cwd: __dirname,
  stdio: 'inherit',
  env
})

child.on('close', (code) => process.exit(code || 0))
child.on('error', (err) => {
  console.error('Failed to launch Electron:', err)
  process.exit(1)
})
