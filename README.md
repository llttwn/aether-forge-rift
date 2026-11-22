# 에테르 공방 & 차원 원정대 (Aether Forge & Rift)

16비트 도트풍 장기 방치형 웹 게임입니다. 외부 빌드 도구 없이 GitHub Pages에서 즉시 실행됩니다.

## GitHub Pages 배포 방법 (1분)
1. 이 폴더의 모든 파일(`index.html`, `styles.css`, `js/`, `assets/`)을 GitHub 저장소 루트에 업로드합니다.
2. 저장소의 **Settings > Pages**에서 Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 선택하고 저장합니다.
3. 잠시 후 생성되는 `https://<아이디>.github.io/<저장소명>/` 주소에서 바로 플레이할 수 있습니다.

## 재귀개선(RSI) 파일 구조
- `js/data.js`: 모든 물가, 티어, 정령, 원정 지역, 시련, 갬빗 상수
- `js/hooks.js`: 플러그인 확장 훅 (`ENGINE_HOOKS`)
- `js/math.js`: 순수 계산 함수 (`bought` / `amount` 분리)
- `js/engine.js`: 게임 상태, 틱 루프, 세이브 마이그레이션(`saveVersion`)
- `js/simulator.js`: 헤드리스 밸런스 채점기 (`window.__GAME_DEBUG__.evaluatePacing(3600)`)
- `js/ui.js`: 도트 캔버스, Web Audio SFX, UI 바인딩
- `assets/`: 16비트 도트풍 이미지 14종
