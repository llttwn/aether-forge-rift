# DEV_CHECKLIST (재귀개선 외부 기억)

## 보존 항목 (Preserve)
- `saveVersion` 호환성 및 `migrateSave(raw)` 깊은 병합
- 티어 `bought`(직접 구매) vs `amount`(총 보유) 분리 원칙
- `window.__GAME_DEBUG__.evaluatePacing(3600)` 인터페이스
- 매도 전용 교역소 공급 압력 규칙

## 해결 완료 (Done)
- [x] v1.0 코어 구현 및 14종 도트풍 에셋 분리 (`assets/`)
- [x] 7개 장기 확장 시스템(6티어, 4지역 원정, Lv.99 정령 숙련도, 4종 초월 시련, 갬빗 제어실)
- [x] `invariants.ok === true` 및 정적 오류 0건 검증

## 다음 RSI 백로그 (Backlog)
- [ ] Stage 1: `js/data.js` 미세 튜닝으로 1회차 환생 시간(12~20분) 및 교역소 수익 비중(10~25%) 정밀 보정
- [ ] Stage 2: Layer 2 영겁(Eternity) 특이점 및 별자리 연구 트리 구현 (`js/hooks.js` 활용)
