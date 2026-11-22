// === [SECTION: DATA] ===
    // Single source of truth for all assets, economy constants, spirits, challenges, and gambits.
    // =========================================================================
    const GAME_DATA = {
      saveVersion: 2,
      saveKey: 'aether_forge_rift_save_v2',
      maxSafeNumber: 1e300,
      assets: {
        forge: "assets/forge.jpg",
        sanctuary: "assets/sanctuary.jpg",
        market: "assets/market.jpg",
        prestige: "assets/prestige.jpg",
        challenges: "assets/challenges.jpg",
        gambit: "assets/gambit.jpg",
        regions: [
          "assets/region_0.jpg",
          "assets/region_1.jpg",
          "assets/region_2.jpg",
          "assets/region_3.jpg"
        ],
        spiritPortraits: {
          arcane: "assets/spirit_arcane.jpg",
          ember: "assets/spirit_ember.jpg",
          emerald: "assets/spirit_emerald.jpg",
          void: "assets/spirit_void.jpg"
        }
      },
      unlocks: [
        { id: 'expedition', label: '차원 원정대', reqAether: 500 },
        { id: 'market', label: '차원 교역소', reqAether: 5000 },
        { id: 'prestige', label: '차원 붕괴 (환생)', reqAether: 1e10 }
      ],
      tiers: [
        { id: 0, name: '에테르 집속기', desc: '초당 에테르 직접 연성', baseCost: 10, growthRate: 1.15, baseProd: 0.6, produces: 'aether', color: '#3ef2ff' },
        { id: 1, name: '공명 증폭로', desc: '집속기를 자동 복제 생산', baseCost: 350, growthRate: 1.24, baseProd: 0.0045, produces: 0, color: '#58c4ff' },
        { id: 2, name: '연금 변환탑', desc: '증폭로를 자동 복제 생산', baseCost: 50000, growthRate: 1.32, baseProd: 0.0016, produces: 1, color: '#a87dff' },
        { id: 3, name: '시공 압축핵', desc: '변환탑을 자동 복제 생산', baseCost: 1.2e7, growthRate: 1.40, baseProd: 0.0007, produces: 2, color: '#ff8c38' },
        { id: 4, name: '차원 특이점', desc: '압축핵을 자동 복제 생산', baseCost: 4.0e9, growthRate: 1.48, baseProd: 0.00035, produces: 3, color: '#ffd24d' },
        { id: 5, name: '영겁 항성로', desc: '특이점을 복제 (1차 붕괴 후 해금)', baseCost: 1.0e13, growthRate: 1.58, baseProd: 0.0002, produces: 4, color: '#ff5266', reqPrestige: 1 }
      ],
      milestones: [
        { count: 10, mult: 2 },
        { count: 25, mult: 3 },
        { count: 50, mult: 4 },
        { count: 100, mult: 6 },
        { count: 200, mult: 10 }
      ],
      synergyPerBought: 0.02,
      overclock: {
        prodMult: 2.5,
        heatPerSec: 6.0,
        coolPerSec: 8.0,
        goldenMin: 75,
        goldenMax: 95,
        overheatCoolSec: 15,
        ventBuffSec: 15,
        ventBuffMult: 1.5,
        ventCrystalBase: 4
      },
      market: {
        periodSec: 45,
        minMult: 0.6,
        maxMult: 2.2,
        baseExchangeSeconds: 0.14,
        supplyImpact: 0.35
      },
      prestige: {
        threshold: 1e10,
        exponent: 0.5,
        shardBaseBonus: 2.5,
        upgrades: [
          { id: 'p_start', name: '초기 공방 시동', cost: 1, desc: '붕괴 직후 에테르 500과 집속기 5개로 시작', effect: 'startBoost' },
          { id: 'p_auto1', name: '자동 연성기 I', cost: 1, desc: 'Tier 1~2를 매초 자동 구매 (비용 ≤ 보유 20%)', effect: 'autoT12' },
          { id: 'p_exp_spd', name: '신속 원정 기어', cost: 2, desc: '원정 전투 속도 2배 및 기본 포획률 +10%p', effect: 'expSpeed2' },
          { id: 'p_auto_sell', name: '자동 지정가 매도', cost: 2, desc: '교역소 시세 ≥ 1.80x 시 결정 파편 50% 자동 매도 해금', effect: 'autoSell' },
          { id: 'p_auto3', name: '자동 연성기 II', cost: 4, desc: 'Tier 3~4 자동 구매 및 전체 생산 ×2', effect: 'autoT34' },
          { id: 'p_shard_mult', name: '특이점 공명', cost: 6, desc: '차원 조각 획득량 +50% 및 정령 숙련도 속도 2배', effect: 'shardBoost' }
        ]
      },
      challenges: [
        { id: 'c_nohigh', name: '시련 I: 무중력 연성', goalAether: 2e7, rule: 'Tier 4~6 구매 불가', rewardDesc: '영구 보상: Tier 1~3 생산 ×2.5' },
        { id: 'c_inflation', name: '시련 II: 인플레이션 폭주', goalAether: 1e7, rule: '모든 티어 비용 성장률 +0.06', rewardDesc: '영구 보상: 마일스톤 배수 +30% 강화' },
        { id: 'c_silence', name: '시련 III: 침묵의 공방', goalAether: 3e7, rule: '수동 추출 및 과부하 비활성화', rewardDesc: '영구 보상: 오프라인 정산 효율 2배' },
        { id: 'c_solo', name: '시련 IV: 고립된 차원', goalAether: 8e7, rule: '정령 배치 효과 및 교역소 비활성화', rewardDesc: '영구 보상: 정령 슬롯 +1 (최대 4슬롯) & 조각 +50%' }
      ],
      gambitConditions: [
        { id: 'none', label: '비활성' },
        { id: 'heat_gold', label: '열기가 골든 존(75~95%)일 때' },
        { id: 'oc_ready', label: '과부하 대기 중이고 열기 < 20%일 때' },
        { id: 'market_high', label: '교역 시세 ≥ 1.8x & 파편 ≥ 5개일 때' },
        { id: 'prestige_double', label: '획득 조각 ≥ 누적 조각의 50%일 때' },
        { id: 'always', label: '항상 (매초 실행)' }
      ],
      gambitActions: [
        { id: 'none', label: '행동 없음' },
        { id: 'vent', label: '열기 방출 실행' },
        { id: 'oc_on', label: '과부하 ON' },
        { id: 'sell_50', label: '결정 파편 50% 매도' },
        { id: 'buy_max_all', label: '전 티어 최대 구매' },
        { id: 'prestige', label: '자동 차원 붕괴' }
      ],
      regions: [
        { id: 0, name: '잿빛 균열', baseHp: 60, baseAtk: 4, crystalReward: 2, spiritIds: ['s_ember', 's_mist', 's_clock'], color: '#38e59a' },
        { id: 1, name: '수정 동굴', baseHp: 420, baseAtk: 18, crystalReward: 6, spiritIds: ['s_chain', 's_prism', 's_raider'], color: '#3ef2ff' },
        { id: 2, name: '태엽 성채', baseHp: 3200, baseAtk: 85, crystalReward: 18, spiritIds: ['s_gear', 's_vault', 's_spark'], color: '#ff8c38' },
        { id: 3, name: '공허의 심연', baseHp: 28000, baseAtk: 420, crystalReward: 55, spiritIds: ['s_void', 's_echo', 's_chrono'], color: '#c078ff' }
      ],
      spirits: [
        { id: 's_ember', name: '화염 정령', region: 0, portrait: 'ember', color: '#ff6b35', trait: '과부하 열기 상승 2배, 대신 골든 존 방출 시 결정 파편 3배', passiveDesc: '전역 생산 +12%/단계', mod: { heatRate: 2, ventCrystal: 3 } },
        { id: 's_mist', name: '침묵 정령', region: 0, portrait: 'arcane', color: '#63d2ff', trait: '수동 클릭 수익 0, 대신 오프라인 및 비활성 효율 3배', passiveDesc: '전역 생산 +12%/단계', mod: { noClick: true, offlineMult: 3 } },
        { id: 's_clock', name: '태엽 정령', region: 0, portrait: 'ember', color: '#ffd24d', trait: '마일스톤 배수 +25% 강화, 대신 과부하 냉각 +5초', passiveDesc: '전역 생산 +12%/단계', mod: { milestoneBoost: 1.25, coolPenalty: 5 } },
        { id: 's_chain', name: '연쇄 정령', region: 1, portrait: 'arcane', color: '#b57aff', trait: '전체 비용 성장률 +0.015, 대신 10구매마다 생산 ×1.25', passiveDesc: '전역 생산 +12%/단계', mod: { growthPenalty: 0.015, chainPer10: 1.25 } },
        { id: 's_prism', name: '프리즘 정령', region: 1, portrait: 'arcane', color: '#3ef2ff', trait: '교역소 시세 상한 +0.5x, 대신 공급 압력 +10%p', passiveDesc: '전역 생산 +12%/단계', mod: { marketMaxAdd: 0.5, supplyAdd: 0.1 } },
        { id: 's_raider', name: '약탈 정령', region: 1, portrait: 'emerald', color: '#38e59a', trait: '공방 기본 생산 -25%, 대신 보스 처치 시 90초치 에테르 즉시 획득', passiveDesc: '전역 생산 +12%/단계', mod: { prodPenalty: 0.75, bossAetherSec: 90 } },
        { id: 's_gear', name: '증기 정령', region: 2, portrait: 'ember', color: '#ff9f43', trait: 'Tier 2~3 생산 ×2.2, 대신 Tier 1 기본 생산 -30%', passiveDesc: '전역 생산 +12%/단계', mod: { midTierMult: 2.2, t1Penalty: 0.7 } },
        { id: 's_vault', name: '금고 정령', region: 2, portrait: 'emerald', color: '#ffe066', trait: '결정 파편 보유량 10개당 전역 생산 +3% (최대 +150%)', passiveDesc: '전역 생산 +12%/단계', mod: { crystalProdCap: 1.5 } },
        { id: 's_spark', name: '섬광 정령', region: 2, portrait: 'emerald', color: '#ff5266', trait: '원정 공격 속도 1.8배, 대신 원정대 최대 체력 -25%', passiveDesc: '전역 생산 +12%/단계', mod: { expAtkSpd: 1.8, expHpMult: 0.75 } },
        { id: 's_void', name: '공허 정령', region: 3, portrait: 'void', color: '#c078ff', trait: '환생 조각 획득량 +40%, 대신 과부하 배수 -0.5x', passiveDesc: '전역 생산 +12%/단계', mod: { shardAdd: 0.4, ocPenalty: 0.5 } },
        { id: 's_echo', name: '메아리 정령', region: 3, portrait: 'void', color: '#48dbfb', trait: 'Tier 4~6 생산 ×2.5, 대신 초기 비용 +20%', passiveDesc: '전역 생산 +12%/단계', mod: { highTierMult: 2.5, costMult: 1.2 } },
        { id: 's_chrono', name: '시간 정령', region: 3, portrait: 'void', color: '#feca57', trait: '게임 틱 효율 ×1.35 (공방·숙련도 가속), 대신 열기 상승 +30%', passiveDesc: '전역 생산 +12%/단계', mod: { tickBoost: 1.35, heatRate: 1.3 } }
      ],
      expeditionUpgrades: { gearBaseCost: 220, gearGrowth: 1.48, resonatorBaseCost: 350, resonatorGrowth: 1.65 }
    };
