# mdSee 기술 아키텍처

## 프로세스 구조

```text
launch.js
  └─ electron.exe (ELECTRON_RUN_AS_NODE 제거 후 실행)
       ├─ main.js (메인 프로세스)
       │    ├─ BrowserWindow 생성
       │    ├─ IPC 핸들러
       │    ├─ 파일 I/O (fs)
       │    ├─ 파일 감시 (fs.watch)
       │    └─ 설정 관리 (config.json)
       └─ renderer.js (렌더러 프로세스)
            ├─ require('electron').ipcRenderer
            ├─ require('marked')
            ├─ require('highlight.js')
            └─ UI 전체 로직
```

## 핵심 설계 결정

### nodeIntegration: true

- contextIsolation: false
- renderer.js에서 Node.js require() 직접 사용
- preload.js 미사용
- 이유: Claude Code 환경의 ELECTRON_RUN_AS_NODE=1 이슈로 contextBridge 방식 실패

### launch.js 필요 이유

```javascript
// Claude Code가 ELECTRON_RUN_AS_NODE=1 자동 설정
// → process.type이 undefined가 됨
// → require('electron')이 경로 문자열 반환
// → ipcMain/ipcRenderer 모두 undefined
// 해결: launch.js에서 해당 환경변수 삭제 후 electron.exe 직접 spawn
delete env.ELECTRON_RUN_AS_NODE
spawn(electronPath, ['.'], { env })
```

## IPC API 레퍼런스

### file:open

```javascript
// 파일 열기 다이얼로그 표시
const result = await ipcRenderer.invoke('file:open')
// result: { filePath, content } | null
```

### file:loadPath

```javascript
// 경로로 직접 파일 로드
const result = await ipcRenderer.invoke('file:loadPath', filePath)
// result: { filePath, content } | { error }
```

### file:save

```javascript
// 파일 저장
const result = await ipcRenderer.invoke('file:save', { filePath, content })
// result: { ok: true } | { error }
```

### file:transformTree

```javascript
// 헤딩/리스트 위계 변환
const result = await ipcRenderer.invoke('file:transformTree', {
  filePath,
  content,
  action,      // 'shiftUp' | 'shiftDown' | 'toBullet' | 'toHeading'
  targetLine   // 0-based 줄 번호
})
// result: { content } | { error }
```

### file:updateHeadingLevel

```javascript
// 특정 헤딩 레벨 변경
const result = await ipcRenderer.invoke('file:updateHeadingLevel', {
  filePath,
  content,
  targetLine,
  newLevel    // 1~6
})
// result: { content } | { error }
```

### file:undo

```javascript
// 되돌리기 (파일당 최대 2단계)
const result = await ipcRenderer.invoke('file:undo', { filePath })
// result: { content } | { error: 'no_history' }
```

### settings:get

```javascript
// 설정 읽기
const settings = await ipcRenderer.invoke('settings:get')
// result: { readMode, readHideLabels, readAutoCopy, readAutoBlockSelect, readHtmlClip, ... }
```

### settings:set

```javascript
// 설정 저장
await ipcRenderer.invoke('settings:set', {
  readMode, readHideLabels, readAutoCopy, readAutoBlockSelect, readHtmlClip
})
```

## 주요 상태 변수 (renderer.js)

| 변수 | 타입 | 설명 |
| --- | --- | --- |
| `currentFilePath` | string | 현재 열린 파일 경로 |
| `diskContent` | string | 디스크에 저장된 원본 내용 |
| `workingContent` | string | 현재 작업 중인 내용 |
| `isDirty` | boolean | 미저장 변경사항 여부 |
| `isReadMode` | boolean | 읽기모드 활성 여부 |
| `readHideLabels` | boolean | 라벨 숨김 여부 |
| `readAutoCopy` | boolean | 자동 복사 여부 |
| `readAutoBlockSelect` | boolean | 자동 블록 선택 여부 |
| `readHtmlClip` | boolean | HTML 클립 모드 여부 |
| `lastReadSelectedBlocks` | Element[] | 현재 선택된 블록 DOM 요소 |
| `tocItems` | Array | TOC 항목 {el, level, heading} |
| `contextTarget` | object/null | 우클릭 컨텍스트 메뉴 대상 (줄/셀/위계변환 대상) |

## 블록 선택 구조 (읽기모드)

```text
BLOCK_SELECTORS = 'h1~h6, p, li, blockquote, pre, table, hr'

mouseup/keyup 이벤트
  → handleReadSelectionUpdate()
    → readAutoBlockSelect ? expandSelectionToBlocks() : skip
    → syncReadSelectionAutoCopy()

expandSelectionToBlocks()
  → getIntersectingBlocks(range)    // selection과 교차하는 블록 탐색
  → uniqueDeepestBlocks(blocks)     // 중복 제거, 최하위 블록 선택
  → DOM selection 재설정
  → lastReadSelectedBlocks 업데이트
```

## 편집모드 우클릭 분기

- 공통 편집 액션: `editContent` (메뉴명: 내용 편집)
- 표 셀(`td`,`th`) 우클릭: `editContent`가 선택 셀 편집으로 분기
- 일반 텍스트/헤딩/리스트 우클릭: `editContent`가 소스 줄 기준 편집으로 분기
- 헤딩/리스트는 기존 위계변환(`shiftUp`,`shiftDown`,`toBullet`,`toHeading`) 유지
- 라벨(`.md-label`) 우클릭: 라벨 전용 컨텍스트 메뉴 표시 후 라벨 토큰만 교체
- 전역 `advancedMenu` 설정으로 우클릭 메뉴 표시 전략 전환
  - `false`: `allowedActions`만 표시
  - `true`: 모든 액션 표시 + 불가 항목 비활성

## 미저장 변경 확인

- `isDirty === true`인 상태에서 파일 열기/드래그 로드/창 닫기 시 `askConfirm()` 모달로 저장 여부 확인
- 저장 선택 시 `file:save` IPC 호출 후 동작 진행

## 줄 편집 라벨 분리

- 줄 편집은 소스 라인을 `구조 prefix` + `라벨 토큰` + `본문`으로 분리한다.
- 편집 UI에는 `본문`만 노출하고, 저장 시 기존 `prefix`/`라벨 토큰`을 재결합해 의미 보존.

## 설정 파일 스키마

```json
{
  "configVersion": 1,
  "readMode": false,
  "readHideLabels": false,
  "readAutoCopy": false,
  "readAutoBlockSelect": true,
  "readHtmlClip": false
}
```

저장 위치: `%APPDATA%/mdSee/config.json`

## 빌드 이슈 및 해결

### winCodeSign 심볼릭 링크 오류

- Windows에서 Developer Mode 없이 electron-builder NSIS 빌드 시 발생
- 해결: `--dir` 타겟으로 압축 해제 후 PowerShell `Compress-Archive`로 zip 생성

```json
// package.json build 스크립트
"build": "electron-builder --win nsis"
```

## 자동업데이트 흐름

- `main.js`에서 `electron-updater` 초기화 후 앱 시작 시 `checkForUpdates()` 실행
- 배포 앱에서만 동작(`app.isPackaged === true`)
- 새 버전 다운로드 완료 시 재시작 확인 대화상자 표시 후 `quitAndInstall()`
- `MDSEE_UPDATE_URL` 환경변수가 있으면 generic feed URL로 업데이트 확인

## GitHub 배포 설정 (내부팀용)

`package.json`의 `build.publish` 설정:

```json
{
  "publish": {
    "provider": "github",
    "owner": "rio7710",
    "repo": "mdSee",
    "private": true
  }
}
```

### 배포 절차 (GitHub Actions 자동화)

1. `package.json`의 `version` 필드를 새 버전으로 수정
2. git commit 후 태그 생성 및 push:

```bash
git tag v1.4.0
git push origin v1.4.0
```

1. GitHub Actions (`release.yml`)가 자동으로 빌드 + Release 생성 + 설치파일 업로드
2. 팀원이 앱 실행 시 자동으로 업데이트 감지

### 로컬 수동 빌드/배포

```bash
set GH_TOKEN=ghp_...
npm run release
```

### 환경변수

| 변수 | 설명 |
| --- | --- |
| `GH_TOKEN` | GitHub Personal Access Token (`repo` + `workflow` 권한 필요) |
| `MDSEE_UPDATE_URL` | Generic 피드 URL (GitHub 외 배포 서버 사용 시) |

### GitHub Secrets 등록

repo → Settings → Secrets and variables → Actions → `GH_TOKEN` 등록
