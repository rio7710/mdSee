# Changelog

모든 주요 변경사항을 이 파일에 기록합니다.
형식: [keepachangelog.com](https://keepachangelog.com) | 버전: [semver.org](https://semver.org)

---

## [Unreleased]

---

## [1.0.4] - 2026-02-26

### Added

- 앱 시작 시 마지막 스크롤 위치 복원 (`lastScrollRatio` 설정 저장/복원)
- 디버그 콘솔에 스크롤 저장/복원 로그 출력 (`[스크롤] 복원 예약`, `[스크롤] 복원 완료`, `[스크롤] 위치 저장`)

### Fixed

- HTML 클립 ON 모드에서 텍스트 블록이 HTML로 복사되어 PPT에 embedded object로 붙여넣기되던 문제 수정 → 표만 HTML, 텍스트는 plain text
- 복사 텍스트 줄바꿈 개선: Windows 클립보드 표준 `\r\n` 적용 (`toCRLF` 헬퍼 추가)
- 블록 내부 소스 줄바꿈이 복사 텍스트에 그대로 포함되던 문제 수정 (단일 블록 내부는 공백으로 이어붙임)
- 블록 간 이중 줄바꿈(`\n\n`) → 단일 줄바꿈(`\n`)으로 변경하여 PPT 붙여넣기 시 불필요한 빈 줄 제거
- 복사 텍스트 앞뒤 빈 줄/줄바꿈 자동 제거 (`toCRLF`에서 `trim()` 처리)
- 디버그 콘솔 복사 로그에서 `↵` 기호 대신 실제 줄바꿈으로 표시 (`white-space: pre-wrap` 활용)
- 앱 시작 시 `renderMarkdown` 첫 호출이 저장된 `scrollRatio`를 덮어쓰던 타이밍 버그 수정 (`pendingRestoreRatio` 분리)

---

## [1.0.3] - 2026-02-26

### Fixed

- 자동업데이트: `releaseType: "release"` 설정 추가로 GitHub Actions 빌드 시 자동 published 상태로 배포

---

## [1.0.2] - 2026-02-26

### Fixed

- 자동업데이트: `package.json` publish 설정에서 `private: true` 제거 (공개 레포 인증 없이 업데이트 가능)

---

## [1.0.1] - 2026-02-26

### Fixed

- 우클릭 메뉴 사용 후 메뉴가 다시 열리지 않는 버그 수정 (디버그 콘솔 스크롤 이벤트가 메뉴를 닫던 문제)
- 흐린 텍스트(`--text-dim`) 명도 개선으로 가독성 향상 (`#6c7086` → `#9399b2`)
- 비활성 토글 스위치 테두리 강화로 활성/비활성 구분 명확화
- 비활성 버튼 및 메뉴 항목 투명도 조정 (`opacity 0.45` → `0.55`)
- 툴바 상태 표시 텍스트 `실시간 감시 중` → `자동 동기화 중` 변경
- 편집모드 우클릭 메뉴에 `블록 편집(editBlock)` 추가
- 표 우클릭 시 선택 셀 기준으로 표 편집 메뉴만 활성화되도록 분기 추가
- 일반 텍스트 우클릭 시 해당 줄 기준 편집 활성화 (선택 영역 없어도 동작)
- 미저장 변경이 있을 때 파일 열기/드래그 로드/닫기 전에 저장 여부 확인 모달 표시
- 라벨 우클릭 시 라벨 전용 메뉴 추가 (`[정의] [해설] [사례] [근거] [인용] [질문] [실습] [요약] [전환]`)
- `electron-updater` 기반 자동업데이트 체크/다운로드/재시작 적용 로직 추가
- 환경변수 `MDSEE_UPDATE_URL`로 generic 업데이트 피드 주소 지정 지원
- `package.json` build에 GitHub Releases publish 설정 추가 (내부팀 배포용 Private Repo)
- `package.json`에 `release` 스크립트 추가 (`electron-builder --publish always`)
- `.github/workflows/release.yml` 추가: 태그 push 시 자동 빌드 및 GitHub Release 생성

### Changed

- 헤딩/리스트 위계 변경 메뉴에서 기존 기능을 유지하면서 `줄 편집` 메뉴를 함께 제공
- 줄 편집 시 구조 태그와 라벨은 편집 대상에서 제외하고 본문만 편집하도록 변경(저장 시 재결합)
- 셀 편집 입력 방식을 `window.prompt`에서 앱 내 모달 편집으로 변경
- 편집모드 메뉴 용어를 `내용 편집(editContent)`으로 통일하고 `블록 편집` 메뉴를 제거
- 툴바에 전역 `고급메뉴` 토글 추가: 우클릭 메뉴를 `가능 항목만 표시`/`전체 표시(비활성 포함)`로 전환
- 타이틀바에 앱 버전 배지 표시 추가 및 툴바 버튼/토글 가독성 개선
- 편집모드에서 좌측 라인 거터(라인 번호) 표시 추가 및 `줄 이동`(Ctrl+G) 전역 기능 추가
- 빌드 타겟을 자동업데이트 가능한 Windows NSIS 설치형으로 전환

---

## [1.3.1] - 2026-02-26

### Fixed

- `readAutoBlockSelect`, `readHtmlClip` 설정이 main.js `defaultUiSettings` / `sanitizeSettings`에 누락되어 앱 재시작 시 초기화되던 버그 수정
- `package.json` 빌드 파일 목록에서 미사용 `preload.js` 제거

---

## [1.3.0] - 2026-02-26

### Added

- 읽기모드 블럭지정 자동/수동 옵션 (`readAutoBlockSelect`)
- HTML 클립 모드 (`readHtmlClip`): 선택 콘텐츠를 HTML 형식으로 클립보드 복사
  - 끔: 표만 HTML 복사 (Word/PPT 표 붙여넣기)
  - 켬: 모든 선택 블록 HTML 복사 (서식 유지)
- AI/개발자용 문서 폴더 (`doc/`)
  - `doc/conventions.md` — 공통 규칙 (단일 소스)
  - `doc/overview.md` — 프로젝트 개요
  - `doc/features.md` — 기능 목록
  - `doc/architecture.md` — IPC API 및 기술 구조
  - `doc/table-conversion-guide.md` — MD 표 변환 가이드 (`=RS=`/`=CS=` 마커 규칙)
- AI 에이전트 지침 파일: `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`
- `CHANGELOG.md` — 버전 변경 이력 (keepachangelog 표준)
- `.markdownlint.json` — 마크다운 린트 설정

---

## [1.2.0] - 2026-02-25

### Added

- 읽기모드 (편집모드 ↔ 읽기모드 토글 스위치)
- 읽기모드 블록 선택: 마우스 선택 시 블록 단위 자동 확장
- 읽기모드 우클릭 컨텍스트 메뉴
- 라벨 감추기 옵션 (`readHideLabels`)
- 자동 복사 옵션 (`readAutoCopy`)
- 헤딩/리스트 라벨 표시 (`decorateLabelsForDisplay`)
- 복사 시 라벨 텍스트 자동 제외 (`getSelectionTextWithoutLabels`)
- 설정 영속화 (`settings:get` / `settings:set` IPC, `config.json`)
- 오류 모달 / 확인 모달

### Changed

- 컨텍스트 메뉴 분리: TOC용 / 읽기모드용

---

## [1.1.0] - 2026-02-20

### Added

- 목차(TOC) 사이드바 패널
- TOC 키보드 탐색 (↑↓←→ Enter)
- 스크롤 연동 (현재 헤딩 TOC 자동 하이라이트)
- TOC 우클릭 컨텍스트 메뉴 (shiftUp / shiftDown / toBullet / toHeading)
- 파일당 되돌리기 (`file:undo`, 최대 2단계)
- 소스 라인 어노테이션 (`annotateSourceLines`)
- 보기 메뉴 헤더별 컬러/사이즈/폰트 패밀리 설정
- 문서 기본 폰트 설정(본문/목차/로케이션 동기 적용)
- 보기 설정 템플릿 저장/로드 (`settingTemplates`, `activeTemplateName`)
- 보기 메뉴 초기화 4종(헤더폰트/로케이션/컬러/사이즈)
- 보기 메뉴 하단 토글(비활성메뉴(고급메뉴), 콘솔)

### Changed

- 보기 메뉴 구조 재정렬(기본폰트 → 헤더설정 그리드 → 초기화 그리드 → 토글)
- 설정 변경 시 즉시 저장/복원 흐름 강화

---

## [1.0.0] - 2026-02-15

### Added

- Electron 데스크탑 앱 초기 구축
- Markdown 파일 렌더링 (marked v12, GFM)
- 코드 블록 문법 하이라이팅 (highlight.js)
- 파일 열기 (다이얼로그 / 드래그 앤 드롭)
- 실시간 파일 감시 (`fs.watch`)
- 커스텀 타이틀바 (최소화/최대화/닫기)
- 파일 저장 (`Ctrl+S`)
- 단축키: `Ctrl+O` (열기), `Ctrl+S` (저장), `Ctrl+Z` (되돌리기)
- `launch.js`: `ELECTRON_RUN_AS_NODE` 환경변수 우회 실행
- electron-builder + PowerShell zip 패키징
