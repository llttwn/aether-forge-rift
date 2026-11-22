// === [SECTION: SIMULATOR] ===
    // =========================================================================
    function verifyInvariants(s = state) {
      const errors = [];
      for (const n of [s.aether, s.runAether, s.totalAether, s.crystals, s.shards, s.overclock.heat, s.market.currentMult]) {
        if (!Number.isFinite(n) || n < 0) errors.push(`Invalid scalar: ${n}`);
      }
      s.tiers.forEach((t, idx) => {
        if (!Number.isFinite(t.bought) || !Number.isFinite(t.amount)) errors.push(`Tier ${idx} NaN/Inf`);
        if (t.bought > t.amount + 1e-6) errors.push(`Tier ${idx} bought > amount`);
      });
      return { ok: errors.length === 0, errors };
    }

    function simulateRunBot(simState, maxSeconds) {
      let elapsed = 0, lastActionAt = 0, maxDeadTime = 0, prestigeReachedAt = null;
      while (elapsed < maxSeconds) {
        tick(simState, 1.0, true);
        elapsed += 1.0;
        let acted = false;
        if (elapsed < 60 && !getEquippedMods(simState).noClick) addAether(simState, calcClickValue(simState) * 2, false);
        if (!simState.overclock.active && simState.overclock.cooldown <= 0 && simState.overclock.heat < 20) simState.overclock.active = true;
        if (simState.overclock.heat >= GAME_DATA.overclock.goldenMin && simState.overclock.heat <= GAME_DATA.overclock.goldenMax) {
          if (ventHeat(simState, true)) acted = true;
        }
        if (simState.unlocked.market && simState.crystals >= 5 && simState.market.currentMult >= 1.75) {
          if (sellCrystal(simState, 0.5, true) > 0) acted = true;
        }
        if (simState.unlocked.expedition) {
          const gCost = calcGearCost(simState.expedition.gearLv);
          if (simState.aether >= gCost * 1.4 && simState.expedition.gearLv < 12) { simState.aether -= gCost; simState.expedition.gearLv += 1; acted = true; }
          const rCost = calcResonatorCost(simState.expedition.resonatorLv);
          if (simState.aether >= rCost * 2.2 && simState.expedition.resonatorLv < 6) { simState.aether -= rCost; simState.expedition.resonatorLv += 1; acted = true; }
        }
        const slotLim = getMaxSpiritSlots(simState);
        for (const sp of GAME_DATA.spirits) {
          if (sp.id === 's_mist') continue;
          if (simState.spirits[sp.id].caught && !simState.equippedSpirits.slice(0, slotLim).includes(sp.id)) {
            const idx = simState.equippedSpirits.slice(0, slotLim).indexOf(null);
            if (idx !== -1) { simState.equippedSpirits[idx] = sp.id; acted = true; }
          }
        }
        for (let i = GAME_DATA.tiers.length - 1; i >= 0; i--) {
          if (buyTier(simState, i, '1', true)) { acted = true; break; }
        }
        if (acted) { maxDeadTime = Math.max(maxDeadTime, elapsed - lastActionAt); lastActionAt = elapsed; }
        if (calcPrestigeGain(simState) >= 1) { prestigeReachedAt = elapsed; break; }
      }
      return { prestigeReachedAt, maxDeadTime: Math.max(maxDeadTime, elapsed - lastActionAt) };
    }

    function evaluatePacing(maxSeconds = 3600) {
      const sim = createInitialState();
      const r1 = simulateRunBot(sim, maxSeconds);
      const marketShareRatio = sim.totalAether > 0 ? Number((sim.marketEarnedAether / sim.totalAether).toFixed(3)) : 0;
      const tierContribution = sim.tiers.map((t, idx) => ({ tier: idx + 1, bought: t.bought, amount: Math.floor(t.amount), prodPerSec: Number(calcTierProduction(sim, idx).toFixed(2)) }));
      let secondPrestigeSec = null;
      if (r1.prestigeReachedAt !== null) {
        doPrestige(sim, true);
        buyPrestigeUpgrade(sim, 'p_start', true);
        buyPrestigeUpgrade(sim, 'p_auto1', true);
        secondPrestigeSec = simulateRunBot(sim, maxSeconds).prestigeReachedAt;
      }
      return {
        firstPrestigeSec: r1.prestigeReachedAt,
        secondPrestigeSec,
        accelRatio: r1.prestigeReachedAt && secondPrestigeSec ? Number((secondPrestigeSec / r1.prestigeReachedAt).toFixed(3)) : null,
        maxDeadTimeSec: Math.round(r1.maxDeadTime),
        marketShareRatio,
        tierContribution,
        invariants: verifyInvariants(sim)
      };
    }

    window.__GAME_DEBUG__ = {
      evaluatePacing,
      verifyInvariants: () => verifyInvariants(state),
      timeWarp: (sec) => {
        const steps = Math.min(300, Math.max(10, Math.ceil(sec / 2)));
        for (let i = 0; i < steps; i++) tick(state, sec / steps, true);
        renderAll();
        return window.__GAME_DEBUG__.exportState();
      },
      exportState: () => ({ runCount: state.runCount, runTime: Math.round(state.runTime), aether: state.aether, aetherPerSec: calcTierProduction(state, 0), crystals: state.crystals, shards: state.shards, totalShards: state.totalShards, unlocked: state.unlocked })
    };
