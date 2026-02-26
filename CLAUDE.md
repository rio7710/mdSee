# mdSee - Claude Code 작업 가이드

> 공통 규칙은 [doc/conventions.md](doc/conventions.md) 참조.

## 핵심 실행 방법

```bash
node launch.js        # 앱 실행 (기본 권장 명령)
npm run build         # 빌드 (electron-builder --dir + PowerShell zip)
```

> **Claude Code 전용 주의**: 이 환경은 `ELECTRON_RUN_AS_NODE=1`을 자동 설정함.
> `electron .` 직접 실행 시 앱이 정상 동작하지 않음.
> `node launch.js`를 기본으로 사용하고, `npm start`는 `node launch.js`와 동일하게 동작함.
> `launch.js`가 해당 환경변수를 제거한 뒤 Electron을 실행함.

## 주요 파일

| 파일 | 역할 |
| --- | --- |
| `launch.js` | ELECTRON_RUN_AS_NODE 우회 실행 래퍼 |
| `main.js` | Electron 메인 프로세스, IPC 핸들러, 파일 I/O |
| `renderer.js` | 렌더러 프로세스, UI 로직, 마크다운 렌더링 |
| `index.html` | UI 구조 |
| `styles.css` | 스타일 |

## Electron 설정

- `nodeIntegration: true`, `contextIsolation: false`
- renderer.js에서 `require('electron')` 직접 사용 가능
- `preload.js` 파일은 현재 미사용 (레거시/실험 용도)

## IPC 채널 목록

| 채널 | 설명 |
| --- | --- |
| `file:open` | 파일 열기 다이얼로그 |
| `file:loadPath` | 경로로 파일 로드 |
| `file:save` | 파일 저장 |
| `file:transformTree` | 헤딩/리스트 위계 변환 |
| `file:updateHeadingLevel` | 헤딩 레벨 변경 |
| `file:undo` | 되돌리기 |
| `settings:get` | 설정 읽기 |
| `settings:set` | 설정 저장 |

## 설정 저장 위치

`%APPDATA%/mdSee/config.json`

## 빌드 주의사항

- Windows에서 electron-builder NSIS 빌드 시 winCodeSign 심볼릭 링크 오류 발생
- 빌드는 `--dir` 타겟 후 PowerShell Compress-Archive로 zip 생성
- 파일 저장 전 undo 스냅샷 최대 2개 유지
