# 메타 가이드

## 범위
과정/렉처/챕터 및 수집 품질 메타를 표준화한다.

## 파일 단위 메타 원칙
- M-001 과정명/과목명은 파일명이 아니라 메타 필드에서 관리한다.
- M-002 메타는 렉처 단위(`1 파일 = 1 렉처`)로 기록한다.
- M-003 `refined.md`는 실무 파일명 `*_최종.md`와 동치로 취급한다.

## 필수 메타 필드
- M-010 `id`
- M-011 `title`
- M-012 `category`
- M-013 `course`
- M-014 `lecture`
- M-015 `pattern` (`위계구조형/흐름형/문제해결형/사례중심형`)
- M-016 `target.level` (`입문/중급/고급`)
- M-017 `target.role` (`실무자/관리자/임원/일반`)
- M-018 `target.industry`
- M-019 `target.age_group`
- M-020 `target.vocab_grade` (1~3)
- M-021 `source_format` (`HWP/PPTX/DOCX/PDF/TXT`)
- M-022 `source_file`
- M-023 `guide_version`
- M-024 `quality_score` (1~5)
- M-025 `notes`
- M-026 `created_at`
- M-027 `converter`
- M-028 `chapter_map`

## 품질 점수 기준
- 5: 완벽, 수정 없음
- 4: 양호, 경미한 수정
- 3: 보통, 일부 보강 필요
- 2: 미흡, 상당한 수정 필요
- 1: 불량, 재작업 필요

## 저장 구조 권장
- 폴더명: `{번호}_{강의주제}_{레벨}_{직군}`
- 기본 파일: `raw.txt`, `*_최종.md`, `meta.json`

## 체크리스트
- M-040 raw 저장 완료(원문 보존)
- M-041 최종 md 저장 완료(라벨 포함)
- M-042 meta 필수 항목 기입 완료
- M-043 라벨 누락 없음
- M-044 quality_score 기입 완료

## 변경 이력
- 2026-02-24: `ML_DATA_COLLECTION_GUIDE.md` 메타/품질 규칙 반영
