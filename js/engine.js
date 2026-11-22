// === [SECTION: ENGINE] ===
    // =========================================================================
    function createInitialState() {
      const spirits = {};
      for (const sp of GAME_DATA.spirits) spirits[sp.id] = { caught: false, level: 1, xp: 0, pity: 0 };
      return {
        saveVersion: GAME_DATA.saveVersion,
        lastSavedAt: Date.now(),
        scientific: false,
        sfxEnabled: true,
        buyMode: '1',
        activeTab: 'forge',
        runCount: 1,
        runTime: 0,
        aether: 10,
        runAether: 10,
        totalAether: 10,
        crystals: 0,
        shards: 0,
        totalShards: 0,
        marketEarnedAether: 0,
        tiers: GAME_DATA.tiers.map(() => ({ bought: 0, amount: 0 })),
        unlocked: { expedition: false, spirits: false, market: false, prestige: false, challenges: false, gambit: false },
        overclock: { active: false, heat: 0, cooldown: 0, buffTimer: 0 },
        market: {
          timer: GAME_DATA.market.periodSec, phase: 0, currentMult: 1.0,
          history: [1.0, 1.08, 1.15, 1.05, 0.94, 0.88, 0.98, 1.12, 1.24, 1.18, 1.02, 1.0],
          autoSell: false
        },
        expedition: {
          regionIdx: 0, stageIdx: 0, maxRegionUnlocked: 0, killsInStage: 0,
          partyHp: 100, enemyHp: 60, autoAdvance: true, gearLv: 0, resonatorLv: 0, atkTimer: 0
        },
        spirits,
        equippedSpirits: [null, null, null, null],
        prestigeUpgrades: {},
        activeChallenge: null,
        completedChallenges: {},
        gambitEnabled: true,
        gambitTimer: 0,
        gambits: [
          { cond: 'heat_gold', act: 'vent' },
          { cond: 'oc_ready', act: 'oc_on' },
          { cond: 'market_high', act: 'sell_50' },
          { cond: 'none', act: 'none' }
        ]
      };
    }

    function migrateSave(raw) {
      const base = createInitialState();
      if (!raw || typeof raw !== 'object') return base;
      const merged = Object.assign({}, base, raw);
      merged.saveVersion = GAME_DATA.saveVersion;
      merged.unlocked = Object.assign({}, base.unlocked, raw.unlocked || {});
      merged.overclock = Object.assign({}, base.overclock, raw.overclock || {});
      merged.market = Object.assign({}, base.market, raw.market || {});
      merged.expedition = Object.assign({}, base.expedition, raw.expedition || {});
      merged.prestigeUpgrades = Object.assign({}, raw.prestigeUpgrades || {});
      merged.completedChallenges = Object.assign({}, raw.completedChallenges || {});
      if (Array.isArray(raw.tiers)) {
        merged.tiers = GAME_DATA.tiers.map((_, i) => {
          const src = raw.tiers[i] || { bought: 0, amount: 0 };
          const b = Math.max(0, Math.floor(Number(src.bought) || 0));
          return { bought: b, amount: Math.max(b, Number(src.amount) || 0) };
        });
      }
      merged.spirits = {};
      for (const sp of GAME_DATA.spirits) {
        const src = raw.spirits && raw.spirits[sp.id] ? raw.spirits[sp.id] : {};
        merged.spirits[sp.id] = {
          caught: Boolean(src.caught),
          level: Math.max(1, Math.min(99, Math.floor(Number(src.level) || 1))),
          xp: Math.max(0, Number(src.xp) || 0),
          pity: Math.max(0, Number(src.pity) || 0)
        };
      }
      merged.equippedSpirits = [0, 1, 2, 3].map(i => {
        const id = Array.isArray(raw.equippedSpirits) ? raw.equippedSpirits[i] : null;
        return id && merged.spirits[id] && merged.spirits[id].caught ? id : null;
      });
      if (!Array.isArray(raw.gambits) || raw.gambits.length !== 4) merged.gambits = base.gambits;
      return merged;
    }

    let state = createInitialState();

    function checkUnlocks(s, silent = false) {
      for (const u of GAME_DATA.unlocks) {
        if (!s.unlocked[u.id] && (s.runAether >= u.reqAether || s.totalAether >= u.reqAether)) {
          s.unlocked[u.id] = true;
          if (!silent) { showToast(`신규 시스템 해금: ${u.label}!`, 'gold'); SFX.play('unlock'); }
        }
      }
      if (!s.unlocked.spirits && Object.values(s.spirits).some(x => x.caught)) s.unlocked.spirits = true;
      if (s.totalShards >= 1 && (!s.unlocked.challenges || !s.unlocked.gambit)) {
        s.unlocked.challenges = true;
        s.unlocked.gambit = true;
        if (!silent) { showToast('초월 시련 & 갬빗 제어실이 개방되었습니다!', 'purple'); SFX.play('unlock'); }
      }
    }

    function addAether(s, amt, fromMarket = false) {
      if (!Number.isFinite(amt) || amt <= 0) return;
      s.aether = softcap(s.aether + amt);
      s.runAether = softcap(s.runAether + amt);
      s.totalAether = softcap(s.totalAether + amt);
      if (fromMarket) s.marketEarnedAether = softcap(s.marketEarnedAether + amt);
    }

    function isTierBuyable(s, tierIdx) {
      const def = GAME_DATA.tiers[tierIdx];
      if (def.reqPrestige && s.runCount <= def.reqPrestige) return false;
      if (s.activeChallenge === 'c_nohigh' && tierIdx >= 3) return false;
      return true;
    }

    function buyTier(s, tierIdx, modeOverride, silent = false) {
      if (!isTierBuyable(s, tierIdx)) return false;
      const mode = modeOverride || s.buyMode;
      let count = 1, cost = 0;
      if (mode === '1') { count = 1; cost = calcTierCost(s, tierIdx); }
      else if (mode === '10') { count = 10; cost = calcBulkCost(s, tierIdx, 10); }
      else if (mode === 'ms') {
        const nextMs = getNextMilestone(s.tiers[tierIdx].bought);
        count = nextMs ? nextMs.count - s.tiers[tierIdx].bought : 10;
        cost = calcBulkCost(s, tierIdx, count);
      } else {
        const res = calcMaxBuy(s, tierIdx, s.aether);
        count = res.count; cost = res.cost;
      }
      if (count <= 0 || s.aether < cost) return false;
      const mods = getEquippedMods(s);
      const prevMs = calcTierMilestoneMult(s.tiers[tierIdx].bought, mods);
      s.aether = Math.max(0, s.aether - cost);
      s.tiers[tierIdx].bought += count;
      s.tiers[tierIdx].amount = softcap(s.tiers[tierIdx].amount + count);
      const nextMsMult = calcTierMilestoneMult(s.tiers[tierIdx].bought, mods);
      if (!silent) {
        if (nextMsMult > prevMs) { showToast(`${GAME_DATA.tiers[tierIdx].name} 마일스톤 돌파!`, 'gold'); SFX.play('milestone'); }
        else SFX.play('buy');
      }
      for (const fn of ENGINE_HOOKS.onBuy) fn(s, tierIdx, count);
      return true;
    }

    function ventHeat(s, silent = false) {
      if (s.activeChallenge === 'c_silence') return false;
      const oc = GAME_DATA.overclock;
      if (s.overclock.cooldown > 0 || s.overclock.heat < 25) return false;
      const inGolden = s.overclock.heat >= oc.goldenMin && s.overclock.heat <= oc.goldenMax;
      const mods = getEquippedMods(s);
      const aps = calcTierProduction(s, 0);
      const gain = inGolden
        ? Math.max(oc.ventCrystalBase, Math.floor((oc.ventCrystalBase + Math.log10(Math.max(10, aps)) * 2.5) * mods.ventCrystal))
        : Math.max(1, Math.floor(oc.ventCrystalBase * 0.35));
      s.crystals = softcap(s.crystals + gain);
      s.overclock.heat = 0;
      if (inGolden) {
        s.overclock.buffTimer = oc.ventBuffSec;
        if (!silent) { showToast(`골든 존 방출! 파편 +${formatNum(gain)} & 생산 ×1.5`, 'gold'); SFX.play('vent'); forgeFlash = 1.0; }
      } else if (!silent) {
        showToast(`열기 방출: 결정 파편 +${formatNum(gain)}`, 'cyan'); SFX.play('buy');
      }
      return true;
    }

    function sellCrystal(s, ratio, silent = false) {
      if (s.activeChallenge === 'c_solo' || s.crystals < 1) return 0;
      const qty = Math.max(1, Math.floor(s.crystals * ratio));
      if (qty <= 0 || qty > s.crystals) return 0;
      const revenue = softcap(qty * calcMarketUnitPrice(s));
      s.crystals -= qty;
      addAether(s, revenue, true);
      const mods = getEquippedMods(s);
      s.market.currentMult = Math.max(GAME_DATA.market.minMult, s.market.currentMult * (1 - (GAME_DATA.market.supplyImpact + mods.supplyAdd) * ratio));
      if (!silent) { showToast(`파편 ${formatNum(qty)}개 매도 → +${formatNum(revenue, s.scientific)} 에테르`, 'gold'); SFX.play('sell'); }
      return revenue;
    }

    function updateMarket(s, dt, silent = false) {
      s.market.timer -= dt;
      if (s.market.timer <= 0) {
        s.market.timer = GAME_DATA.market.periodSec;
        s.market.phase += 0.85;
        const mods = getEquippedMods(s);
        const maxM = GAME_DATA.market.maxMult + mods.marketMaxAdd;
        const minM = GAME_DATA.market.minMult;
        const wave = (Math.sin(s.market.phase) + 1) * 0.5;
        const jitter = ((Math.sin(s.market.phase * 3.7) + 1) * 0.5 - 0.5) * 0.35;
        s.market.currentMult = Number(Math.max(minM, Math.min(maxM, minM + (maxM - minM) * Math.max(0, Math.min(1, wave + jitter)))).toFixed(2));
        s.market.history.push(s.market.currentMult);
        if (s.market.history.length > 20) s.market.history.shift();
        if (s.market.autoSell && s.prestigeUpgrades.p_auto_sell && s.market.currentMult >= 1.8 && s.crystals >= 4) sellCrystal(s, 0.5, silent);
      }
    }

    function updateExpedition(s, dt, silent = false) {
      if (!s.unlocked.expedition) return;
      const pStats = calcExpeditionStats(s), eStats = calcEnemyStats(s.expedition.regionIdx, s.expedition.stageIdx);
      if (s.expedition.partyHp > pStats.maxHp) s.expedition.partyHp = pStats.maxHp;
      s.expedition.atkTimer += dt * pStats.atkSpeed;
      while (s.expedition.atkTimer >= 1.0) {
        s.expedition.atkTimer -= 1.0;
        s.expedition.enemyHp -= pStats.atk;
        if (!silent) spawnBattleFloat(`-${formatNum(pStats.atk)}`, '#3ef2ff', true);
        if (s.expedition.enemyHp <= 0) {
          s.crystals = softcap(s.crystals + eStats.crystalReward);
          const mods = getEquippedMods(s);
          if (eStats.isBoss && mods.bossAetherSec > 0) addAether(s, calcTierProduction(s, 0) * mods.bossAetherSec, false);
          const reg = GAME_DATA.regions[s.expedition.regionIdx];
          const targetSid = reg.spiritIds[s.expedition.killsInStage % reg.spiritIds.length];
          const spState = s.spirits[targetSid];
          if (spState && !spState.caught) {
            const chance = Math.min(100, 12 + pStats.captureBonus + spState.pity * 5);
            const roll = silent ? (spState.pity * 19 + s.expedition.killsInStage * 23) % 100 : Math.random() * 100;
            if (roll < chance) {
              spState.caught = true; spState.pity = 0; s.unlocked.spirits = true;
              if (!silent) {
                const spDef = GAME_DATA.spirits.find(x => x.id === targetSid);
                showToast(`정령 포획 성공: ${spDef.name}!`, 'purple'); SFX.play('capture');
              }
            } else spState.pity += 1;
          }
          s.expedition.killsInStage += 1;
          if (s.expedition.killsInStage >= (eStats.isBoss ? 1 : 5)) {
            s.expedition.killsInStage = 0;
            if (s.expedition.autoAdvance) {
              if (s.expedition.stageIdx < 4) s.expedition.stageIdx += 1;
              else if (s.expedition.regionIdx < GAME_DATA.regions.length - 1) {
                s.expedition.regionIdx += 1; s.expedition.stageIdx = 0;
                s.expedition.maxRegionUnlocked = Math.max(s.expedition.maxRegionUnlocked, s.expedition.regionIdx);
                if (!silent) showToast(`신규 전장 해금: ${GAME_DATA.regions[s.expedition.regionIdx].name}!`, 'emerald');
              }
            }
          }
          const nextE = calcEnemyStats(s.expedition.regionIdx, s.expedition.stageIdx);
          s.expedition.enemyHp = nextE.maxHp;
          s.expedition.partyHp = Math.min(pStats.maxHp, s.expedition.partyHp + pStats.maxHp * 0.25);
        } else {
          s.expedition.partyHp -= eStats.atk;
          if (!silent) spawnBattleFloat(`-${formatNum(eStats.atk)}`, '#ff5266', false);
          if (s.expedition.partyHp <= 0) {
            if (s.expedition.stageIdx > 0) {
              s.expedition.stageIdx -= 1; s.expedition.autoAdvance = false;
              if (!silent) showToast('이전 스테이지로 안전 후퇴했습니다.', 'cyan');
            }
            s.expedition.killsInStage = 0;
            s.expedition.enemyHp = calcEnemyStats(s.expedition.regionIdx, s.expedition.stageIdx).maxHp;
            s.expedition.partyHp = pStats.maxHp;
          }
        }
      }
    }

    function updateSpiritMastery(s, dt) {
      const mods = getEquippedMods(s);
      const speed = (s.prestigeUpgrades.p_shard_mult ? 2 : 1) * mods.tickBoost;
      const limit = getMaxSpiritSlots(s);
      for (let i = 0; i < limit; i++) {
        const sid = s.equippedSpirits[i];
        if (!sid) continue;
        const st = s.spirits[sid];
        if (!st || !st.caught || st.level >= 99) continue;
        st.xp += dt * speed;
        const need = 25 * Math.pow(1.18, st.level - 1);
        if (st.xp >= need) { st.xp -= need; st.level += 1; }
      }
    }

    function runGambits(s, dt, silent) {
      if (!s.unlocked.gambit || !s.gambitEnabled) return;
      s.gambitTimer += dt;
      if (s.gambitTimer < 1.0) return;
      s.gambitTimer -= 1.0;
      for (const g of s.gambits) {
        if (g.cond === 'none' || g.act === 'none') continue;
        let ok = false;
        if (g.cond === 'always') ok = true;
        else if (g.cond === 'heat_gold') ok = s.overclock.heat >= GAME_DATA.overclock.goldenMin && s.overclock.heat <= GAME_DATA.overclock.goldenMax && s.overclock.cooldown <= 0;
        else if (g.cond === 'oc_ready') ok = !s.overclock.active && s.overclock.cooldown <= 0 && s.overclock.heat < 20;
        else if (g.cond === 'market_high') ok = s.market.currentMult >= 1.8 && s.crystals >= 5;
        else if (g.cond === 'prestige_double') ok = calcPrestigeGain(s) >= Math.max(1, Math.floor(s.totalShards * 0.5));
        if (!ok) continue;
        if (g.act === 'vent') ventHeat(s, silent);
        else if (g.act === 'oc_on' && s.overclock.cooldown <= 0 && s.activeChallenge !== 'c_silence') s.overclock.active = true;
        else if (g.act === 'sell_50') sellCrystal(s, 0.5, silent);
        else if (g.act === 'buy_max_all') { for (let i = GAME_DATA.tiers.length - 1; i >= 0; i--) buyTier(s, i, 'max', true); }
        else if (g.act === 'prestige' && calcPrestigeGain(s) >= 1) doPrestige(s, silent);
      }
    }

    function tick(s, dt, silent = false) {
      if (dt <= 0) return;
      s.runTime += dt;
      const mods = getEquippedMods(s);

      if (s.overclock.buffTimer > 0) s.overclock.buffTimer = Math.max(0, s.overclock.buffTimer - dt);
      if (s.overclock.cooldown > 0) {
        s.overclock.cooldown = Math.max(0, s.overclock.cooldown - dt);
        s.overclock.heat = Math.max(0, s.overclock.heat - dt * (100 / Math.max(1, GAME_DATA.overclock.overheatCoolSec + mods.coolPenalty)));
      } else if (s.overclock.active && s.activeChallenge !== 'c_silence') {
        s.overclock.heat += dt * GAME_DATA.overclock.heatPerSec * mods.heatRate;
        if (s.overclock.heat >= 100) {
          s.overclock.heat = 100; s.overclock.active = false;
          s.overclock.cooldown = GAME_DATA.overclock.overheatCoolSec + mods.coolPenalty;
          if (!silent) showToast('과열 도달! 안전 냉각 모드로 전환됩니다.', 'cyan');
        }
      } else if (s.overclock.heat > 0) {
        s.overclock.heat = Math.max(0, s.overclock.heat - dt * GAME_DATA.overclock.coolPerSec);
      }

      addAether(s, calcTierProduction(s, 0) * dt, false);
      for (let i = 1; i < GAME_DATA.tiers.length; i++) {
        const prod = calcTierProduction(s, i) * dt;
        if (prod > 0) s.tiers[i - 1].amount = softcap(s.tiers[i - 1].amount + prod);
      }

      if (s.prestigeUpgrades.p_auto1) {
        for (let i = 0; i <= 1; i++) if (s.aether * 0.2 >= calcTierCost(s, i)) buyTier(s, i, '1', true);
      }
      if (s.prestigeUpgrades.p_auto3) {
        for (let i = 2; i <= 3; i++) if (s.aether * 0.2 >= calcTierCost(s, i)) buyTier(s, i, '1', true);
      }

      updateMarket(s, dt, silent);
      updateExpedition(s, dt, silent);
      updateSpiritMastery(s, dt);
      runGambits(s, dt, silent);

      // Check active challenge completion
      if (s.activeChallenge) {
        const ch = GAME_DATA.challenges.find(c => c.id === s.activeChallenge);
        if (ch && s.runAether >= ch.goalAether) {
          s.completedChallenges[ch.id] = true;
          s.activeChallenge = null;
          if (!silent) { showToast(`초월 시련 완료: ${ch.name}! 영구 특전 해금`, 'gold'); SFX.play('prestige'); }
        }
      }

      checkUnlocks(s, silent);
      for (const fn of ENGINE_HOOKS.onTick) fn(s, dt);
    }

    function resetRunResources(s) {
      s.runTime = 0;
      s.aether = s.prestigeUpgrades.p_start ? 500 : 10;
      s.runAether = s.aether;
      s.tiers = GAME_DATA.tiers.map((_, idx) => ({
        bought: idx === 0 && s.prestigeUpgrades.p_start ? 5 : 0,
        amount: idx === 0 && s.prestigeUpgrades.p_start ? 5 : 0
      }));
      s.overclock = { active: false, heat: 0, cooldown: 0, buffTimer: 0 };
    }

    function doPrestige(s, silent = false) {
      const gain = calcPrestigeGain(s);
      if (gain <= 0) return false;
      s.shards = softcap(s.shards + gain);
      s.totalShards = softcap(s.totalShards + gain);
      s.runCount += 1;
      s.activeChallenge = null;
      resetRunResources(s);
      checkUnlocks(s, silent);
      if (!silent) { showToast(`차원 붕괴 완료! 차원 조각 +${formatNum(gain)}`, 'purple'); SFX.play('prestige'); }
      for (const fn of ENGINE_HOOKS.onPrestige) fn(s, gain);
      return true;
    }

    function startChallenge(s, chalId) {
      if (s.activeChallenge === chalId) return;
      s.activeChallenge = chalId;
      resetRunResources(s);
      const ch = GAME_DATA.challenges.find(c => c.id === chalId);
      showToast(`시련 돌입: ${ch.name} (목표 ${formatNum(ch.goalAether)} 에테르)`, 'gold');
      SFX.play('unlock');
    }

    function buyPrestigeUpgrade(s, upgId, silent = false) {
      const def = GAME_DATA.prestige.upgrades.find(x => x.id === upgId);
      if (!def || s.prestigeUpgrades[upgId] || s.shards < def.cost) return false;
      s.shards -= def.cost;
      s.prestigeUpgrades[upgId] = true;
      if (upgId === 'p_auto_sell') s.market.autoSell = true;
      if (!silent) { showToast(`차원 업그레이드 획득: ${def.name}`, 'purple'); SFX.play('unlock'); }
      return true;
    }

    function runOfflineProgress(s, elapsedSec) {
      const capped = Math.min(86400, Math.max(0, elapsedSec));
      if (capped < 15) return null;
      const effectiveSec = capped * getEquippedMods(s).offlineMult;
      const steps = 120, stepDt = effectiveSec / steps;
      const beforeAether = s.aether, beforeCrystals = s.crystals;
      for (let i = 0; i < steps; i++) tick(s, stepDt, true);
      return { elapsedSec: capped, effectiveSec, gainedAether: Math.max(0, s.aether - beforeAether), gainedCrystals: Math.max(0, s.crystals - beforeCrystals) };
    }
