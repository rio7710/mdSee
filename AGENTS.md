# mdSee - AI Agent 작업 가이드

> 공통 규칙은 [doc/conventions.md](doc/conventions.md) 참조.

## 프로젝트 개요

Windows 전용 Markdown 파일 뷰어 데스크탑 앱 (Electron 기반)

## 실행 방법

```bash
node launch.js        # 앱 실행 (기본 권장 명령)
npm run build         # 배포 빌드
```

> **주의**: `electron .` 직접 실행 금지.
> `node launch.js`를 기본으로 사용하고, `npm start`는 `node launch.js`와 동일하게 동작함.

## 주요 파일

| 파일 | 역할 |
| --- | --- |
| `launch.js` | 실행 진입점 (환경변수 우회) |
| `main.js` | 메인 프로세스, IPC 핸들러, 파일 I/O |
| `renderer.js` | UI 전체 로직, 마크다운 렌더링 |
| `index.html` | UI 구조 |
| `styles.css` | 스타일 |

## Electron 핵심 설정

- `nodeIntegration: true`, `contextIsolation: false`
- `frame: false` (커스텀 타이틀바)
- renderer.js에서 `require('electron')` 직접 사용

## IPC 채널 요약

상세 내용은 [doc/architecture.md](doc/architecture.md) 참조.

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

## 상세 문서

- [공통 규칙](doc/conventions.md)
- [프로젝트 개요](doc/overview.md)
- [기능 목록](doc/features.md)
- [기술 아키텍처](doc/architecture.md)
- [표 변환 가이드](doc/table-conversion-guide.md)
