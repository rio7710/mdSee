# mdSee - GitHub Copilot 지침

## 프로젝트
Windows 전용 Markdown 뷰어 데스크탑 앱 (Electron)

## 실행
```bash
node launch.js    # 반드시 이 명령으로 실행
```

## 구조
- `main.js`: 메인 프로세스, IPC 핸들러
- `renderer.js`: UI 로직 (require('electron') 직접 사용)
- `index.html`: UI 마크업
- `styles.css`: 스타일

## 상세 문서
- [기능](doc/features.md) | [아키텍처](doc/architecture.md) | [표 변환](doc/table-conversion-guide.md)
