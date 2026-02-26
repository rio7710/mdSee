# 공통 규칙 및 컨벤션

> CLAUDE.md, AGENTS.md 등 모든 AI 에이전트 지침에서 공유하는 규칙.
> 이 파일만 수정하면 모든 에이전트에 동일하게 적용된다.

## 에이전트 운영 원칙

- Claude Code와 Codex를 병행 사용한다.
- 실행/아키텍처 관련 핵심 규칙은 `CLAUDE.md`, `AGENTS.md`에 동일 의미로 유지한다.
- 공통 정책 변경 시 `doc/conventions.md`를 먼저 수정한 뒤 각 에이전트 문서에 반영한다.

## 버전 관리 (SemVer)

```text
MAJOR.MINOR.PATCH

MAJOR: 하위 호환 불가 변경 (breaking change)
MINOR: 하위 호환 새 기능 추가
PATCH: 버그 수정
```

## 작업 완료 후 문서 업데이트 규칙 (필수)

| 작업 종류 | 업데이트할 파일 |
| --- | --- |
| 새 기능 추가 | `CHANGELOG.md` (Added), `doc/features.md` |
| 기능 변경 | `CHANGELOG.md` (Changed), 해당 doc 파일 |
| 버그 수정 | `CHANGELOG.md` (Fixed) |
| IPC 채널 추가/변경 | `CHANGELOG.md`, `doc/architecture.md` |
| 설정 항목 추가 | `CHANGELOG.md`, `doc/architecture.md`, `doc/features.md` |
| UI 요소 추가 | `CHANGELOG.md`, `doc/features.md` |

## CHANGELOG.md 작성 규칙

- 미완료 작업은 `## [Unreleased]` 섹션에 기록
- 버전 확정 시 날짜와 함께 새 섹션으로 이동: `## [1.2.0] - YYYY-MM-DD`
- 섹션 종류: `Added` `Changed` `Deprecated` `Removed` `Fixed` `Security`

## 커밋 메시지 규칙 (Conventional Commits)

```text
feat: 새 기능
fix: 버그 수정
docs: 문서 변경
chore: 빌드/설정 변경
refactor: 리팩토링
```

## 코드 수정 시 공통 주의사항

- IPC 채널 추가 시 `main.js`와 `renderer.js` 양쪽 모두 수정 필요
- 설정 항목 추가 시 `main.js`의 `defaultUiSettings`, `sanitizeSettings` 함께 수정
- 읽기모드 옵션 추가 시 `collectUiSettings()`, `applyUiSettings()`, `updateReadMenuButtons()` 함께 수정
- renderer.js 수정 후 반드시 `node launch.js`로 실행 확인

## 표 변환 마커 규칙

MD 표에서 병합 셀 표현 시 사용. 상세 내용은 [표 변환 가이드](table-conversion-guide.md) 참조.

| 마커 | 의미 |
| --- | --- |
| `=RS=` | 위 셀의 rowspan 연속 (대소문자 무관) |
| `=CS=` | 왼쪽 셀의 colspan 연속 (대소문자 무관) |

ML 학습 데이터 생성 시 대문자 `=RS=` / `=CS=` 로 통일.

## 문서 인덱스

| 파일 | 대상 | 내용 |
| --- | --- | --- |
| `CLAUDE.md` | Claude Code | Claude 전용 실행/작업 지침 |
| `AGENTS.md` | OpenAI Codex / ChatGPT | GPT 계열 에이전트 지침 |
| `.github/copilot-instructions.md` | GitHub Copilot | Copilot 지침 |
| `CHANGELOG.md` | 전체 | 버전별 변경 이력 |
| `.markdownlint.json` | 전체 | 마크다운 린트 규칙 설정 |
| `doc/conventions.md` | 전체 | 이 파일 (공통 규칙) |
| `doc/overview.md` | 전체 | 프로젝트 개요 |
| `doc/features.md` | 전체 | 기능 목록 |
| `doc/architecture.md` | 전체 | IPC API, 기술 구조 |
| `doc/table-conversion-guide.md` | 전체 | 표 변환 가이드 |
