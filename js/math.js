// === [SECTION: MATH] ===
    // =========================================================================
    function softcap(val, limit = GAME_DATA.maxSafeNumber) {
      if (!Number.isFinite(val) || val < 0) return 0;
      return val > limit ? limit : val;
    }

    function formatNum(n, scientific = false) {
      if (!Number.isFinite(n)) return '0';
      if (Math.abs(n) < 1000) return Math.abs(n) < 10 && n !== Math.floor(n) ? n.toFixed(1) : Math.floor(n).toString();
      if (scientific || Math.abs(n) >= 1e21) return n.toExponential(2).replace('+', '');
      const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
      const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
      return (n / Math.pow(10, tier * 3)).toFixed(2) + suffixes[tier];
    }

    function formatTime(sec) {
      const s = Math.max(0, Math.floor(sec));
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
      return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    }

    function getMaxSpiritSlots(s) {
      return s.completedChallenges.c_solo ? 4 : 3;
    }

    function getEquippedMods(s) {
      const mods = {
        heatRate: 1, ventCrystal: 1, noClick: false, offlineMult: 1, milestoneBoost: 1,
        coolPenalty: 0, growthPenalty: 0, chainPer10: 1, marketMaxAdd: 0, supplyAdd: 0,
        prodPenalty: 1, bossAetherSec: 0, midTierMult: 1, t1Penalty: 1, crystalProdCap: 0,
        expAtkSpd: 1, expHpMult: 1, shardAdd: 0, ocPenalty: 0, highTierMult: 1, costMult: 1, tickBoost: 1
      };
      if (s.completedChallenges.c_inflation) mods.milestoneBoost *= 1.3;
      if (s.completedChallenges.c_silence) mods.offlineMult *= 2.0;
      if (s.completedChallenges.c_solo) mods.shardAdd += 0.5;
      if (s.activeChallenge === 'c_inflation') mods.growthPenalty += 0.06;
      if (s.activeChallenge === 'c_silence') mods.noClick = true;
      if (s.activeChallenge === 'c_solo') return mods;

      for (const sid of s.equippedSpirits) {
        if (!sid) continue;
        const sp = GAME_DATA.spirits.find(x => x.id === sid);
        if (!sp) continue;
        const m = sp.mod;
        if (m.heatRate) mods.heatRate *= m.heatRate;
        if (m.ventCrystal) mods.ventCrystal *= m.ventCrystal;
        if (m.noClick) mods.noClick = true;
        if (m.offlineMult) mods.offlineMult *= m.offlineMult;
        if (m.milestoneBoost) mods.milestoneBoost *= m.milestoneBoost;
        if (m.coolPenalty) mods.coolPenalty += m.coolPenalty;
        if (m.growthPenalty) mods.growthPenalty += m.growthPenalty;
        if (m.chainPer10) mods.chainPer10 *= m.chainPer10;
        if (m.marketMaxAdd) mods.marketMaxAdd += m.marketMaxAdd;
        if (m.supplyAdd) mods.supplyAdd += m.supplyAdd;
        if (m.prodPenalty) mods.prodPenalty *= m.prodPenalty;
        if (m.bossAetherSec) mods.bossAetherSec += m.bossAetherSec;
        if (m.midTierMult) mods.midTierMult *= m.midTierMult;
        if (m.t1Penalty) mods.t1Penalty *= m.t1Penalty;
        if (m.crystalProdCap) mods.crystalProdCap += m.crystalProdCap;
        if (m.expAtkSpd) mods.expAtkSpd *= m.expAtkSpd;
        if (m.expHpMult) mods.expHpMult *= m.expHpMult;
        if (m.shardAdd) mods.shardAdd += m.shardAdd;
        if (m.ocPenalty) mods.ocPenalty += m.ocPenalty;
        if (m.highTierMult) mods.highTierMult *= m.highTierMult;
        if (m.costMult) mods.costMult *= m.costMult;
        if (m.tickBoost) mods.tickBoost *= m.tickBoost;
      }
      return mods;
    }

    function getMasteryStage(level) {
      let st = 0;
      for (const lv of [5, 15, 35, 65, 99]) if (level >= lv) st++;
      return st;
    }

    function calcMasteryGlobalBonus(s) {
      let total = 0;
      for (const sid of Object.keys(s.spirits)) {
        const st = s.spirits[sid];
        if (st && st.caught) total += getMasteryStage(st.level) * 0.12;
      }
      return total;
    }

    function calcTierCost(s, tierIdx, boughtOverride) {
      const def = GAME_DATA.tiers[tierIdx];
      const mods = getEquippedMods(s);
      const bought = boughtOverride !== undefined ? boughtOverride : s.tiers[tierIdx].bought;
      return softcap(def.baseCost * mods.costMult * Math.pow(def.growthRate + mods.growthPenalty, bought));
    }

    function calcBulkCost(s, tierIdx, count) {
      if (count <= 0) return 0;
      const def = GAME_DATA.tiers[tierIdx];
      const mods = getEquippedMods(s);
      const r = def.growthRate + mods.growthPenalty;
      const first = calcTierCost(s, tierIdx);
      return count === 1 ? first : softcap(first * (Math.pow(r, count) - 1) / (r - 1));
    }

    function calcMaxBuy(s, tierIdx, budget) {
      const def = GAME_DATA.tiers[tierIdx];
      const mods = getEquippedMods(s);
      const r = def.growthRate + mods.growthPenalty;
      const first = calcTierCost(s, tierIdx);
      if (budget < first) return { count: 0, cost: first };
      let count = Math.max(1, Math.min(Math.floor(Math.log(1 + (budget * (r - 1)) / first) / Math.log(r)), 500));
      let cost = calcBulkCost(s, tierIdx, count);
      while (count > 1 && cost > budget) { count--; cost = calcBulkCost(s, tierIdx, count); }
      return { count, cost };
    }

    function getNextMilestone(bought) {
      for (const ms of GAME_DATA.milestones) if (bought < ms.count) return ms;
      return null;
    }

    function calcTierMilestoneMult(bought, mods) {
      let m = 1;
      for (const ms of GAME_DATA.milestones) if (bought >= ms.count) m *= 1 + (ms.mult - 1) * mods.milestoneBoost;
      return m;
    }

    function calcSynergyBonus(s, tierIdx) {
      let lowerBought = 0;
      for (let i = 0; i < tierIdx; i++) lowerBought += s.tiers[i].bought;
      return lowerBought * GAME_DATA.synergyPerBought;
    }

    function calcGlobalMult(s) {
      const mods = getEquippedMods(s);
      let m = 1;
      m *= 1 + s.totalShards * GAME_DATA.prestige.shardBaseBonus;
      if (s.prestigeUpgrades.p_auto3) m *= 2.0;
      const caughtCount = Object.values(s.spirits).filter(x => x.caught).length;
      m *= 1 + caughtCount * 0.08;
      m *= 1 + calcMasteryGlobalBonus(s);
      if (mods.crystalProdCap > 0) m *= 1 + Math.min(mods.crystalProdCap, Math.floor(s.crystals / 10) * 0.03);
      if (mods.chainPer10 > 1) {
        const totalBought = s.tiers.reduce((acc, t) => acc + t.bought, 0);
        m *= Math.pow(mods.chainPer10, Math.floor(totalBought / 10));
      }
      m *= mods.prodPenalty;
      if (s.overclock.active && s.overclock.cooldown <= 0 && s.activeChallenge !== 'c_silence') {
        m *= Math.max(1.2, GAME_DATA.overclock.prodMult - mods.ocPenalty);
      }
      if (s.overclock.buffTimer > 0) m *= GAME_DATA.overclock.ventBuffMult;
      m *= mods.tickBoost;
      for (const fn of ENGINE_HOOKS.calcProdMod) {
        const factor = fn(s, m);
        if (Number.isFinite(factor) && factor > 0) m *= factor;
      }
      return softcap(m);
    }

    function calcTierProduction(s, tierIdx) {
      const def = GAME_DATA.tiers[tierIdx];
      const t = s.tiers[tierIdx];
      if (t.amount <= 0) return 0;
      const mods = getEquippedMods(s);
      let mult = calcTierMilestoneMult(t.bought, mods) * (1 + calcSynergyBonus(s, tierIdx));
      if (tierIdx <= 2 && s.completedChallenges.c_nohigh) mult *= 2.5;
      if (tierIdx === 0) mult *= mods.t1Penalty;
      if (tierIdx === 1 || tierIdx === 2) mult *= mods.midTierMult;
      if (tierIdx >= 3) mult *= mods.highTierMult;
      const globalM = calcGlobalMult(s);
      const effectiveGlobal = tierIdx === 0 ? globalM : Math.pow(globalM, 0.65);
      return softcap(t.amount * def.baseProd * mult * effectiveGlobal);
    }

    function calcClickValue(s) {
      const mods = getEquippedMods(s);
      if (mods.noClick) return 0;
      return softcap(Math.max(1, 1 + calcTierProduction(s, 0) * 0.15));
    }

    function calcPrestigeGain(s) {
      if (s.runAether < GAME_DATA.prestige.threshold) return 0;
      const mods = getEquippedMods(s);
      const bonus = (s.prestigeUpgrades.p_shard_mult ? 0.5 : 0) + mods.shardAdd;
      return Math.floor(Math.pow(s.runAether / GAME_DATA.prestige.threshold, GAME_DATA.prestige.exponent) * (1 + bonus));
    }

    function calcMarketUnitPrice(s) {
      const aps = Math.max(5, calcTierProduction(s, 0));
      return softcap(aps * GAME_DATA.market.baseExchangeSeconds * s.market.currentMult);
    }

    function calcExpeditionStats(s) {
      const mods = getEquippedMods(s);
      const gearLv = s.expedition.gearLv, resLv = s.expedition.resonatorLv;
      return {
        atk: Math.floor((12 + gearLv * 9) * Math.pow(1.22, gearLv)),
        maxHp: Math.floor((100 + gearLv * 55) * Math.pow(1.2, gearLv) * mods.expHpMult),
        atkSpeed: (s.prestigeUpgrades.p_exp_spd ? 2.0 : 1.0) * mods.expAtkSpd,
        captureBonus: resLv * 4 + (s.prestigeUpgrades.p_exp_spd ? 10 : 0)
      };
    }

    function calcEnemyStats(regionIdx, stageIdx) {
      const reg = GAME_DATA.regions[regionIdx];
      const isBoss = stageIdx === 4;
      const stageMult = Math.pow(1.55, stageIdx) * (isBoss ? 2.1 : 1);
      return {
        name: isBoss ? `${reg.name} 수호자` : `${reg.name} 개체 #${stageIdx + 1}`,
        isBoss,
        maxHp: Math.floor(reg.baseHp * stageMult),
        atk: Math.floor(reg.baseAtk * Math.pow(1.38, stageIdx) * (isBoss ? 1.5 : 1)),
        crystalReward: Math.floor(reg.crystalReward * (isBoss ? 3 : 1))
      };
    }

    function calcWinRatePreview(s) {
      const p = calcExpeditionStats(s), e = calcEnemyStats(s.expedition.regionIdx, s.expedition.stageIdx);
      const ttk = e.maxHp / Math.max(1, p.atk * p.atkSpeed);
      const ttd = p.maxHp / Math.max(1, e.atk);
      const ratio = ttd / Math.max(0.1, ttk);
      return { winPct: Math.max(0, Math.min(100, Math.round(ratio >= 1.25 ? 100 : (ratio / 1.25) * 100))), kps: 1 / Math.max(0.25, ttk) };
    }

    function calcGearCost(lv) { return Math.floor(GAME_DATA.expeditionUpgrades.gearBaseCost * Math.pow(GAME_DATA.expeditionUpgrades.gearGrowth, lv)); }
    function calcResonatorCost(lv) { return Math.floor(GAME_DATA.expeditionUpgrades.resonatorBaseCost * Math.pow(GAME_DATA.expeditionUpgrades.resonatorGrowth, lv)); }
