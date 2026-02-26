# mdSee 프로젝트 개요

> AI 에이전트(Claude, GPT)가 이 프로젝트를 이해하고 작업하기 위한 문서

## 무엇인가

Windows 전용 Markdown 파일 뷰어 데스크탑 앱.
Electron 기반으로 .md 파일을 실시간으로 렌더링하고, 문서 편집·탐색 기능을 제공한다.

## 기술 스택

| 항목 | 내용 |
|------|------|
| 런타임 | Electron (nodeIntegration: true) |
| 마크다운 파서 | marked v12 (GFM, breaks 활성화) |
| 코드 하이라이팅 | highlight.js |
| 패키징 | electron-builder + PowerShell zip |
| 플랫폼 | Windows 전용 |

## 폴더 구조

```
mdSee/
├── launch.js              # 실행 진입점 (ELECTRON_RUN_AS_NODE 우회)
├── main.js                # 메인 프로세스
├── renderer.js            # 렌더러 프로세스 (UI 전체 로직)
├── index.html             # UI 마크업
├── styles.css             # 스타일
├── package.json           # 의존성 및 빌드 설정
├── CLAUDE.md              # Claude Code용 작업 가이드
└── doc/                   # AI/개발자 문서
    ├── overview.md        # 이 파일 - 프로젝트 개요
    ├── features.md        # 기능 상세 설명
    ├── architecture.md    # 기술 아키텍처
    └── table-conversion-guide.md  # 표 변환 가이드
```

## 실행 방법

```bash
node launch.js    # 개발 실행
npm run build     # 배포 빌드
```

## 문서 목록

| 문서 | 내용 |
|------|------|
| [CLAUDE.md](../CLAUDE.md) | Claude Code 전용 작업 지침 |
| [doc/features.md](features.md) | 전체 기능 목록 및 사용법 |
| [doc/architecture.md](architecture.md) | 기술 구조 및 IPC API |
| [doc/table-conversion-guide.md](table-conversion-guide.md) | MD 표 변환 규칙 및 검증 플로우 |
