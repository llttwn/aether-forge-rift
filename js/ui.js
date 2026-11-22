// === [SECTION: UI] ===
    // =========================================================================
    const SFX = (() => {
      let ctx = null;
      function ensure() {
        if (!state.sfxEnabled) return null;
        if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return ctx;
      }
      function tone(freq, dur, type = 'square', vol = 0.055, slideTo = null) {
        const c = ensure(); if (!c) return;
        const osc = c.createOscillator(), gain = c.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, c.currentTime);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
        gain.gain.setValueAtTime(vol, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        osc.connect(gain); gain.connect(c.destination); osc.start(); osc.stop(c.currentTime + dur);
      }
      return {
        play(kind) {
          if (!state.sfxEnabled) return;
          if (kind === 'click') tone(520, 0.05, 'square', 0.04, 740);
          else if (kind === 'buy') tone(380, 0.07, 'triangle', 0.06, 560);
          else if (kind === 'milestone') { tone(523, 0.09); setTimeout(() => tone(659, 0.09), 80); setTimeout(() => tone(784, 0.16), 160); }
          else if (kind === 'vent') { tone(240, 0.15, 'sawtooth', 0.05, 880); setTimeout(() => tone(880, 0.14, 'triangle', 0.06, 1174), 110); }
          else if (kind === 'sell') { tone(740, 0.06); setTimeout(() => tone(987, 0.1), 60); }
          else if (kind === 'capture') { tone(440, 0.08, 'triangle'); setTimeout(() => tone(660, 0.08, 'triangle'), 80); setTimeout(() => tone(880, 0.18), 160); }
          else if (kind === 'unlock') { tone(392, 0.09); setTimeout(() => tone(523, 0.09), 90); setTimeout(() => tone(784, 0.2), 180); }
          else if (kind === 'prestige') { tone(180, 0.35, 'sawtooth', 0.06, 720); setTimeout(() => tone(720, 0.3, 'triangle', 0.06, 1200), 220); }
        }
      };
    })();

    const TIER_PATTERNS = [
      ['..1111..', '.122221.', '12233221', '12333321', '12233221', '.122221.', '..1111..', '...11...'],
      ['.11..11.', '12211221', '12322321', '.123321.', '.123321.', '12322321', '12211221', '.11..11.'],
      ['...11...', '..1221..', '.123321.', '12333321', '.122221.', '.123321.', '11222211', '11111111'],
      ['.111111.', '12222221', '12133121', '12333321', '12333321', '12133121', '12222221', '.111111.'],
      ['..1221..', '.123321.', '12311321', '23133132', '23133132', '12311321', '.123321.', '..1221..'],
      ['11.11.11', '.123321.', '12322321', '13233231', '13233231', '12322321', '.123321.', '11.11.11']
    ];

    function drawPixelIcon(canvas, pattern, primaryColor) {
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cell = Math.floor(canvas.width / 8);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const ch = pattern[y][x];
        if (ch === '.') continue;
        ctx.fillStyle = ch === '1' ? '#0b0e14' : ch === '2' ? primaryColor : '#ffffff';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    const forgeParticles = Array.from({ length: 24 }, () => ({ x: Math.random(), y: Math.random(), vy: 0.08 + Math.random() * 0.16, size: Math.random() > 0.5 ? 3 : 2 }));
    let forgeFlash = 0;
    const battleFloats = [];

    function spawnBattleFloat(text, color, onEnemy) {
      if (battleFloats.length > 14) battleFloats.shift();
      battleFloats.push({ text, color, x: onEnemy ? 0.68 + (Math.random() - 0.5) * 0.08 : 0.28 + (Math.random() - 0.5) * 0.08, y: 0.48, life: 0.85 });
    }

    function sizeCanvasToBox(canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height))) {
        canvas.width = Math.floor(rect.width); canvas.height = Math.floor(rect.height);
      }
    }

    function renderForgeCanvas(dt) {
      const cv = document.getElementById('forge-canvas');
      if (!cv || state.activeTab !== 'forge') return;
      sizeCanvasToBox(cv);
      const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      const speedMult = state.overclock.active ? 2.6 : 1.0;
      const col = state.overclock.active ? '#ff8c38' : '#3ef2ff';
      for (const p of forgeParticles) {
        p.y -= p.vy * speedMult * dt;
        if (p.y < 0) { p.y = 1; p.x = 0.25 + Math.random() * 0.5; }
        ctx.fillStyle = col;
        ctx.fillRect(Math.floor(p.x * w), Math.floor(p.y * h), p.size, p.size);
      }
      if (forgeFlash > 0) {
        ctx.fillStyle = `rgba(255,210,77,${forgeFlash * 0.35})`;
        ctx.fillRect(0, 0, w, h);
        forgeFlash = Math.max(0, forgeFlash - dt * 2.2);
      }
    }

    function renderBattleCanvas(dt, nowMs) {
      const cv = document.getElementById('battle-canvas');
      if (!cv || state.activeTab !== 'expedition') return;
      sizeCanvasToBox(cv);
      const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      const bob = Math.sin(nowMs / 240) * 4;
      const lunge = state.expedition.atkTimer > 0.8 ? 10 : 0;
      const hx = Math.floor(w * 0.25 + lunge), hy = Math.floor(h * 0.52 + bob);
      ctx.fillStyle = '#0b0e14'; ctx.fillRect(hx - 20, hy - 20, 40, 40);
      ctx.fillStyle = '#38e59a'; ctx.fillRect(hx - 16, hy - 16, 32, 32);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(hx + 2, hy - 8, 8, 8);
      ctx.fillStyle = '#3ef2ff'; ctx.fillRect(hx - 12, hy + 6, 24, 6);

      const reg = GAME_DATA.regions[state.expedition.regionIdx];
      const sz = state.expedition.stageIdx === 4 ? 52 : 38;
      const ex = Math.floor(w * 0.72), ey = Math.floor(h * 0.50 - bob);
      ctx.fillStyle = '#0b0e14'; ctx.fillRect(ex - sz / 2, ey - sz / 2, sz, sz);
      ctx.fillStyle = reg.color; ctx.fillRect(ex - sz / 2 + 4, ey - sz / 2 + 4, sz - 8, sz - 8);
      ctx.fillStyle = '#ff5266'; ctx.fillRect(ex - 10, ey - 8, 7, 7); ctx.fillRect(ex + 3, ey - 8, 7, 7);

      ctx.font = 'bold 14px Consolas, monospace'; ctx.textAlign = 'center';
      for (let i = battleFloats.length - 1; i >= 0; i--) {
        const f = battleFloats[i]; f.y -= dt * 0.22; f.life -= dt;
        if (f.life <= 0) { battleFloats.splice(i, 1); continue; }
        ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x * w + 1, f.y * h + 1);
        ctx.fillStyle = f.color; ctx.fillText(f.text, f.x * w, f.y * h);
      }
    }

    function showToast(msg, type = 'cyan') {
      const el = document.createElement('div');
      el.className = `toast ${type}`; el.textContent = msg;
      document.getElementById('toast-stack').appendChild(el);
      setTimeout(() => el.remove(), 3400);
    }

    function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add('open'); }
    function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }

    function buildInitialDOM() {
      // Bind generated pixel-art scenes
      document.getElementById('brand-emblem-img').src = GAME_DATA.assets.spiritPortraits.arcane;
      document.getElementById('scene-forge-img').src = GAME_DATA.assets.forge;
      document.getElementById('scene-battle-img').src = GAME_DATA.assets.regions[0];
      document.getElementById('scene-spirits-img').src = GAME_DATA.assets.sanctuary;
      document.getElementById('scene-market-img').src = GAME_DATA.assets.market;
      document.getElementById('scene-prestige-img').src = GAME_DATA.assets.prestige;
      document.getElementById('scene-challenges-img').src = GAME_DATA.assets.challenges;
      document.getElementById('scene-gambit-img').src = GAME_DATA.assets.gambit;

      // Tiers
      const tierList = document.getElementById('tier-list');
      tierList.innerHTML = '';
      GAME_DATA.tiers.forEach((def, idx) => {
        const row = document.createElement('div');
        row.className = 'px-card tier-row'; row.id = `tier-row-${idx}`;
        row.innerHTML = `
          <div class="tier-icon-box"><canvas width="32" height="32" id="tier-icon-${idx}"></canvas></div>
          <div class="tier-meta">
            <div class="tier-name-line">
              <span class="tier-name">${def.name}</span>
              <span class="tag-chip">구매 <span id="t-bought-${idx}" class="num">0</span></span>
              <span class="tag-chip gold">총 <span id="t-amount-${idx}" class="num">0</span></span>
              <span class="tag-chip purple" id="t-ms-tag-${idx}">×1</span>
            </div>
            <div class="tier-sub">
              <span>${def.desc}</span>
              <span>생산: <strong id="t-prod-${idx}" class="num" style="color:${def.color}">0</strong>/s</span>
            </div>
            <div class="tier-ms-bar"><div id="t-ms-fill-${idx}" class="tier-ms-fill"></div></div>
          </div>
          <div class="tier-buy-col">
            <button class="px-btn cyan sm" id="btn-buy-tier-${idx}">
              구매 (<span id="t-buy-cnt-${idx}" class="num">1</span>)<br/><span id="t-cost-${idx}" class="num">10</span>
            </button>
          </div>
        `;
        tierList.appendChild(row);
        drawPixelIcon(document.getElementById(`tier-icon-${idx}`), TIER_PATTERNS[idx], def.color);
      });

      // Regions
      const regTabs = document.getElementById('region-tabs');
      regTabs.innerHTML = '';
      GAME_DATA.regions.forEach((reg, idx) => {
        const btn = document.createElement('button');
        btn.className = 'px-btn sm'; btn.id = `btn-region-${idx}`; btn.textContent = `${idx + 1}. ${reg.name}`;
        btn.addEventListener('click', () => {
          if (idx > state.expedition.maxRegionUnlocked) return;
          state.expedition.regionIdx = idx; state.expedition.stageIdx = 0; state.expedition.killsInStage = 0;
          state.expedition.enemyHp = calcEnemyStats(idx, 0).maxHp;
          SFX.play('click'); renderAll();
        });
        regTabs.appendChild(btn);
      });

      // Spirits Codex (using 4 elemental pixel-art portraits!)
      const codex = document.getElementById('spirit-codex-grid');
      codex.innerHTML = '';
      GAME_DATA.spirits.forEach(sp => {
        const card = document.createElement('div');
        card.className = 'px-card spirit-card uncaught'; card.id = `spirit-card-${sp.id}`;
        const portraitUrl = GAME_DATA.assets.spiritPortraits[sp.portrait];
        card.innerHTML = `
          <div class="spirit-head">
            <div class="tier-icon-box" style="width:44px;height:44px;"><img src="${portraitUrl}" alt="${sp.name}" /></div>
            <div>
              <strong style="color:${sp.color}">${sp.name}</strong>
              <div class="muted" id="sp-lv-${sp.id}">미포획</div>
            </div>
          </div>
          <div style="font-size:12px;">${sp.trait}</div>
          <div class="muted">영구 패시브: ${sp.passiveDesc}</div>
          <button class="px-btn sm purple" id="btn-equip-${sp.id}" disabled>슬롯에 배치</button>
        `;
        codex.appendChild(card);
        document.getElementById(`btn-equip-${sp.id}`).addEventListener('click', () => {
          const st = state.spirits[sp.id];
          if (!st || !st.caught) return;
          const lim = getMaxSpiritSlots(state);
          const existing = state.equippedSpirits.slice(0, lim).indexOf(sp.id);
          if (existing !== -1) state.equippedSpirits[existing] = null;
          else {
            const empty = state.equippedSpirits.slice(0, lim).indexOf(null);
            state.equippedSpirits[empty !== -1 ? empty : 0] = sp.id;
          }
          SFX.play('buy'); renderAll();
        });
      });

      // Prestige Upgrades
      const pGrid = document.getElementById('prestige-upg-grid');
      pGrid.innerHTML = '';
      GAME_DATA.prestige.upgrades.forEach(u => {
        const card = document.createElement('div');
        card.className = 'px-card upg-card'; card.id = `pupg-${u.id}`;
        card.innerHTML = `<div><strong style="color:var(--purple)">${u.name}</strong><div class="muted mt-8">${u.desc}</div></div><button class="px-btn sm purple" id="btn-pupg-${u.id}">구매 (${u.cost} 조각)</button>`;
        pGrid.appendChild(card);
        document.getElementById(`btn-pupg-${u.id}`).addEventListener('click', () => { if (buyPrestigeUpgrade(state, u.id)) renderAll(); });
      });

      // Challenges
      const cGrid = document.getElementById('challenge-grid');
      cGrid.innerHTML = '';
      GAME_DATA.challenges.forEach(ch => {
        const card = document.createElement('div');
        card.className = 'px-card upg-card'; card.id = `chal-card-${ch.id}`;
        card.innerHTML = `
          <div>
            <strong style="color:var(--gold)">${ch.name}</strong>
            <div class="muted mt-8">제약: ${ch.rule}</div>
            <div class="muted">목표: <span class="num" style="color:var(--cyan)">${formatNum(ch.goalAether)}</span> 에테르</div>
            <div style="font-size:12px;color:var(--emerald);margin-top:4px;">${ch.rewardDesc}</div>
          </div>
          <button class="px-btn sm gold" id="btn-chal-${ch.id}">시련 시작</button>
        `;
        cGrid.appendChild(card);
        document.getElementById(`btn-chal-${ch.id}`).addEventListener('click', () => { startChallenge(state, ch.id); renderAll(); });
      });

      // Gambits
      const gList = document.getElementById('gambit-list');
      gList.innerHTML = '';
      state.gambits.forEach((_, idx) => {
        const row = document.createElement('div');
        row.className = 'px-card gambit-row';
        row.innerHTML = `
          <span class="tag-chip">#${idx + 1}</span>
          <span>IF</span>
          <select class="px-select" id="gambit-cond-${idx}">${GAME_DATA.gambitConditions.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}</select>
          <span>THEN</span>
          <select class="px-select" id="gambit-act-${idx}">${GAME_DATA.gambitActions.map(a => `<option value="${a.id}">${a.label}</option>`).join('')}</select>
        `;
        gList.appendChild(row);
        document.getElementById(`gambit-cond-${idx}`).addEventListener('change', (e) => { state.gambits[idx].cond = e.target.value; });
        document.getElementById(`gambit-act-${idx}`).addEventListener('change', (e) => { state.gambits[idx].act = e.target.value; });
      });
    }

    function renderAll() {
      const sci = state.scientific, aps = calcTierProduction(state, 0);
      document.getElementById('res-aether').textContent = formatNum(state.aether, sci);
      document.getElementById('res-aether-ps').textContent = formatNum(aps, sci);
      document.getElementById('res-crystal').textContent = formatNum(state.crystals, sci);
      document.getElementById('res-shards').textContent = formatNum(state.shards, sci);
      document.getElementById('btn-sound').textContent = `SFX: ${state.sfxEnabled ? 'ON' : 'OFF'}`;
      document.getElementById('btn-notation').textContent = `표기: ${sci ? '1e9' : 'K/M'}`;

      const nextU = GAME_DATA.unlocks.find(u => !state.unlocked[u.id]);
      if (nextU) {
        const pct = Math.min(100, (state.runAether / nextU.reqAether) * 100);
        document.getElementById('next-unlock-label').textContent = `다음 해금: ${nextU.label} (${formatNum(nextU.reqAether, sci)} 에테르)`;
        document.getElementById('next-unlock-fill').style.width = `${pct.toFixed(1)}%`;
        document.getElementById('next-unlock-text').textContent = `${pct.toFixed(1)}%`;
      } else {
        const pGain = calcPrestigeGain(state);
        const pct = Math.min(100, (state.runAether / GAME_DATA.prestige.threshold) * 100);
        document.getElementById('next-unlock-label').textContent = pGain > 0 ? `차원 붕괴 가능! (+${formatNum(pGain)} 조각)` : '다음 목표: 초월 시련 & 영겁 특이점';
        document.getElementById('next-unlock-fill').style.width = `${pct.toFixed(1)}%`;
        document.getElementById('next-unlock-text').textContent = pGain > 0 ? `+${formatNum(pGain)} 조각 대기` : `${pct.toFixed(1)}%`;
      }

      ['expedition', 'spirits', 'market', 'prestige', 'challenges', 'gambit'].forEach(tab => {
        const btn = document.getElementById(`tab-btn-${tab}`);
        const isOpen = state.unlocked[tab] || (tab === 'spirits' && state.unlocked.expedition);
        btn.classList.toggle('locked', !isOpen);
      });
      document.getElementById('badge-prestige').classList.toggle('show', calcPrestigeGain(state) >= 1);
      document.getElementById('badge-market').classList.toggle('show', state.unlocked.market && state.crystals >= 5 && state.market.currentMult >= 1.75);

      document.getElementById('run-count').textContent = state.runCount;
      document.getElementById('global-mult').textContent = `x${formatNum(calcGlobalMult(state), sci)}`;
      const cBanner = document.getElementById('active-chal-banner');
      if (state.activeChallenge) {
        const ch = GAME_DATA.challenges.find(c => c.id === state.activeChallenge);
        cBanner.style.display = 'inline-block';
        cBanner.textContent = `${ch.name} 진행 중 (${Math.min(100, (state.runAether / ch.goalAether) * 100).toFixed(1)}%)`;
      } else cBanner.style.display = 'none';

      const clickVal = calcClickValue(state);
      document.getElementById('click-val').textContent = formatNum(clickVal, sci);
      document.getElementById('btn-manual-extract').disabled = clickVal <= 0;

      const mods = getEquippedMods(state);
      GAME_DATA.tiers.forEach((def, idx) => {
        const t = state.tiers[idx];
        const row = document.getElementById(`tier-row-${idx}`);
        const buyable = isTierBuyable(state, idx);
        row.style.opacity = buyable ? '1' : '0.45';
        document.getElementById(`t-bought-${idx}`).textContent = t.bought;
        document.getElementById(`t-amount-${idx}`).textContent = formatNum(t.amount, sci);
        document.getElementById(`t-prod-${idx}`).textContent = formatNum(calcTierProduction(state, idx), sci);
        const msMult = calcTierMilestoneMult(t.bought, mods);
        document.getElementById(`t-ms-tag-${idx}`).textContent = `×${msMult.toFixed(msMult % 1 === 0 ? 0 : 1)}`;
        const nextMs = getNextMilestone(t.bought);
        const msFill = document.getElementById(`t-ms-fill-${idx}`);
        if (nextMs) {
          const prevCount = GAME_DATA.milestones.filter(m => m.count < nextMs.count).pop()?.count || 0;
          msFill.style.width = `${Math.max(0, Math.min(100, ((t.bought - prevCount) / (nextMs.count - prevCount)) * 100))}%`;
          row.classList.toggle('milestone-near', nextMs.count - t.bought <= 3 && t.bought > 0);
        } else { msFill.style.width = '100%'; row.classList.remove('milestone-near'); }

        let buyCnt = 1, cost = calcTierCost(state, idx);
        if (state.buyMode === '10') { buyCnt = 10; cost = calcBulkCost(state, idx, 10); }
        else if (state.buyMode === 'ms') { buyCnt = nextMs ? nextMs.count - t.bought : 10; cost = calcBulkCost(state, idx, buyCnt); }
        else if (state.buyMode === 'max') { const r = calcMaxBuy(state, idx, state.aether); buyCnt = Math.max(1, r.count); cost = r.cost; }
        document.getElementById(`t-buy-cnt-${idx}`).textContent = buyCnt;
        document.getElementById(`t-cost-${idx}`).textContent = formatNum(cost, sci);
        document.getElementById(`btn-buy-tier-${idx}`).disabled = !buyable || state.aether < cost;
      });

      // Overclock
      const oc = state.overclock;
      const ocStatus = document.getElementById('overclock-status');
      const inGold = oc.heat >= GAME_DATA.overclock.goldenMin && oc.heat <= GAME_DATA.overclock.goldenMax && oc.cooldown <= 0;
      if (state.activeChallenge === 'c_silence') { ocStatus.textContent = '시련 잠금'; ocStatus.className = 'tag-chip danger'; }
      else if (oc.cooldown > 0) { ocStatus.textContent = `냉각 ${Math.ceil(oc.cooldown)}s`; ocStatus.className = 'tag-chip'; }
      else if (inGold) { ocStatus.textContent = '골든 존!'; ocStatus.className = 'tag-chip gold'; }
      else if (oc.active) { ocStatus.textContent = '과부하 가동'; ocStatus.className = 'tag-chip gold'; }
      else { ocStatus.textContent = '대기'; ocStatus.className = 'tag-chip'; }

      document.getElementById('heat-fill').style.width = `${Math.min(100, oc.heat).toFixed(1)}%`;
      document.getElementById('heat-label').textContent = oc.cooldown > 0 ? `냉각 중 (${Math.ceil(oc.cooldown)}s)` : `열기 ${Math.floor(oc.heat)}%`;
      const btnOc = document.getElementById('btn-overclock');
      btnOc.textContent = oc.active ? '과부하 OFF (O)' : '과부하 ON (O)';
      btnOc.disabled = oc.cooldown > 0 || state.activeChallenge === 'c_silence';
      const btnVent = document.getElementById('btn-vent');
      btnVent.disabled = oc.cooldown > 0 || oc.heat < 25 || state.activeChallenge === 'c_silence';
      btnVent.classList.toggle('active', inGold);
      document.getElementById('vent-buff-line').textContent = oc.buffTimer > 0 ? `골든 방출 버프: 생산 ×1.5 (${Math.ceil(oc.buffTimer)}s)` : '';

      // Equipped spirit slots
      const maxSlots = getMaxSpiritSlots(state);
      document.getElementById('max-spirit-slots').textContent = maxSlots;
      const slotGrid = document.getElementById('spirit-slots-grid');
      slotGrid.innerHTML = '';
      for (let idx = 0; idx < maxSlots; idx++) {
        const sid = state.equippedSpirits[idx];
        const box = document.createElement('div');
        box.className = `px-card spirit-slot ${sid ? 'filled' : ''}`;
        if (sid) {
          const def = GAME_DATA.spirits.find(x => x.id === sid);
          const st = state.spirits[sid];
          box.innerHTML = `<img src="${GAME_DATA.assets.spiritPortraits[def.portrait]}" alt="${def.name}" /><strong style="font-size:12px;color:${def.color}">${def.name}</strong><span class="muted">Lv.${st.level}</span>`;
          box.addEventListener('click', () => { state.equippedSpirits[idx] = null; SFX.play('click'); renderAll(); });
        } else {
          box.innerHTML = `<span class="muted">빈 슬롯 #${idx + 1}</span><span class="muted" style="font-size:11px;">성소에서 배치</span>`;
          box.addEventListener('click', () => switchTab('spirits'));
        }
        slotGrid.appendChild(box);
      }

      // Expedition + dynamic Region battlefield image!
      const pStats = calcExpeditionStats(state), eStats = calcEnemyStats(state.expedition.regionIdx, state.expedition.stageIdx);
      const prev = calcWinRatePreview(state), reg = GAME_DATA.regions[state.expedition.regionIdx];
      const battleImg = document.getElementById('scene-battle-img');
      const targetRegionSrc = GAME_DATA.assets.regions[state.expedition.regionIdx];
      if (battleImg.getAttribute('data-reg') !== String(state.expedition.regionIdx)) {
        battleImg.src = targetRegionSrc;
        battleImg.setAttribute('data-reg', String(state.expedition.regionIdx));
      }
      document.getElementById('battle-stage-name').textContent = `${reg.name} ${state.expedition.regionIdx + 1}-${state.expedition.stageIdx + 1}`;
      document.getElementById('battle-winrate').textContent = `${prev.winPct}%`;
      document.getElementById('battle-kps').textContent = prev.kps.toFixed(2);
      document.getElementById('btn-auto-advance').textContent = `자동 돌파: ${state.expedition.autoAdvance ? 'ON' : 'OFF'}`;
      document.getElementById('exp-atk').textContent = formatNum(pStats.atk, sci);
      document.getElementById('exp-hp').textContent = formatNum(pStats.maxHp, sci);
      document.getElementById('exp-capture').textContent = pStats.captureBonus;
      const gCost = calcGearCost(state.expedition.gearLv), rCost = calcResonatorCost(state.expedition.resonatorLv);
      document.getElementById('cost-upg-gear').textContent = formatNum(gCost, sci);
      document.getElementById('btn-upg-gear').disabled = state.aether < gCost;
      document.getElementById('cost-upg-resonator').textContent = formatNum(rCost, sci);
      document.getElementById('btn-upg-resonator').disabled = state.aether < rCost;
      document.getElementById('enemy-name').textContent = eStats.name;
      document.getElementById('enemy-boss-tag').style.display = eStats.isBoss ? 'inline-block' : 'none';
      document.getElementById('enemy-reward').textContent = formatNum(eStats.crystalReward, sci);
      document.getElementById('enemy-hp-fill').style.width = `${Math.max(0, Math.min(100, (state.expedition.enemyHp / eStats.maxHp) * 100))}%`;
      document.getElementById('enemy-hp-text').textContent = `${formatNum(Math.max(0, state.expedition.enemyHp))} / ${formatNum(eStats.maxHp)}`;
      document.getElementById('party-hp-text').textContent = `${formatNum(Math.max(0, state.expedition.partyHp))} / ${formatNum(pStats.maxHp)}`;
      document.getElementById('stage-kills').textContent = `${state.expedition.killsInStage} / ${eStats.isBoss ? 1 : 5}`;
      GAME_DATA.regions.forEach((_, idx) => {
        const b = document.getElementById(`btn-region-${idx}`);
        b.disabled = idx > state.expedition.maxRegionUnlocked;
        b.classList.toggle('active', idx === state.expedition.regionIdx);
      });
      document.getElementById('region-spirits-preview').textContent = '출현 정령: ' + reg.spiritIds.map(sid => {
        const sp = GAME_DATA.spirits.find(x => x.id === sid), st = state.spirits[sid];
        return st.caught ? `${sp.name}(포획완료)` : `${sp.name}(천장 +${st.pity * 5}%)`;
      }).join(' · ');

      // Spirit Codex
      let caughtCnt = 0;
      GAME_DATA.spirits.forEach(sp => {
        const st = state.spirits[sp.id]; if (st.caught) caughtCnt++;
        document.getElementById(`spirit-card-${sp.id}`).classList.toggle('uncaught', !st.caught);
        document.getElementById(`sp-lv-${sp.id}`).textContent = st.caught
          ? `Lv.${st.level}/99 (패시브 ${getMasteryStage(st.level)}/5단계)`
          : `미포획 · ${GAME_DATA.regions[sp.region].name} (천장 +${st.pity * 5}%)`;
        const btn = document.getElementById(`btn-equip-${sp.id}`);
        const isEq = state.equippedSpirits.slice(0, maxSlots).includes(sp.id);
        btn.disabled = !st.caught;
        btn.textContent = isEq ? '배치 해제' : '슬롯에 배치';
        btn.className = `px-btn sm ${isEq ? 'emerald' : 'purple'}`;
      });
      document.getElementById('codex-count').textContent = caughtCnt;

      // Market
      document.getElementById('market-price').textContent = formatNum(calcMarketUnitPrice(state), sci);
      document.getElementById('market-mult-badge').textContent = `${state.market.currentMult.toFixed(2)}x`;
      document.getElementById('market-timer').textContent = `${Math.ceil(state.market.timer)}s`;
      const noCrys = state.crystals < 1 || state.activeChallenge === 'c_solo';
      document.getElementById('btn-sell-25').disabled = noCrys;
      document.getElementById('btn-sell-50').disabled = noCrys;
      document.getElementById('btn-sell-100').disabled = noCrys;
      const btnAutoSell = document.getElementById('btn-auto-sell');
      if (state.prestigeUpgrades.p_auto_sell) {
        btnAutoSell.disabled = false;
        btnAutoSell.textContent = `자동 매도(≥1.8x): ${state.market.autoSell ? 'ON' : 'OFF'}`;
        btnAutoSell.className = `px-btn sm ${state.market.autoSell ? 'emerald' : ''}`;
      }
      renderMarketSparkline();

      // Prestige
      const pGain = calcPrestigeGain(state);
      document.getElementById('prestige-owned').textContent = formatNum(state.shards, sci);
      document.getElementById('prestige-bonus').textContent = `+${formatNum(state.totalShards * GAME_DATA.prestige.shardBaseBonus * 100, sci)}%`;
      document.getElementById('prestige-gain').textContent = formatNum(pGain, sci);
      document.getElementById('btn-do-prestige').disabled = pGain <= 0;
      GAME_DATA.prestige.upgrades.forEach(u => {
        const bought = Boolean(state.prestigeUpgrades[u.id]);
        document.getElementById(`pupg-${u.id}`).classList.toggle('bought', bought);
        const btn = document.getElementById(`btn-pupg-${u.id}`);
        btn.disabled = bought || state.shards < u.cost;
        btn.textContent = bought ? '보유 중' : `구매 (${u.cost} 조각)`;
      });

      // Challenges
      const doneCnt = Object.keys(state.completedChallenges).length;
      document.getElementById('chal-done-count').textContent = doneCnt;
      document.getElementById('btn-exit-challenge').style.display = state.activeChallenge ? 'inline-flex' : 'none';
      GAME_DATA.challenges.forEach(ch => {
        const card = document.getElementById(`chal-card-${ch.id}`);
        const done = Boolean(state.completedChallenges[ch.id]);
        const active = state.activeChallenge === ch.id;
        card.classList.toggle('bought', done);
        card.classList.toggle('active-chal', active);
        const btn = document.getElementById(`btn-chal-${ch.id}`);
        btn.disabled = active;
        btn.textContent = active ? '진행 중' : done ? '재도전 (완료됨)' : '시련 시작';
      });

      // Gambits & Eternity
      document.getElementById('btn-gambit-master').textContent = `갬빗 엔진: ${state.gambitEnabled ? 'ON' : 'OFF'}`;
      state.gambits.forEach((g, idx) => {
        const cEl = document.getElementById(`gambit-cond-${idx}`), aEl = document.getElementById(`gambit-act-${idx}`);
        if (cEl && cEl.value !== g.cond) cEl.value = g.cond;
        if (aEl && aEl.value !== g.act) aEl.value = g.act;
      });
      document.getElementById('eternity-progress').textContent = `${formatNum(state.totalShards, sci)} / 1,000 조각 (시련 ${doneCnt}/4)`;

      // Telemetry
      document.getElementById('stat-run-aether').textContent = formatNum(state.runAether, sci);
      document.getElementById('stat-run-time').textContent = formatTime(state.runTime);
      const totalBought = state.tiers.reduce((a, t) => a + t.bought, 0);
      document.getElementById('stat-synergy').textContent = `+${Math.round(totalBought * GAME_DATA.synergyPerBought * 100)}%`;
      document.getElementById('stat-mastery-bonus').textContent = `+${Math.round(calcMasteryGlobalBonus(state) * 100)}%`;
      const mRatio = state.totalAether > 0 ? ((state.marketEarnedAether / state.totalAether) * 100).toFixed(1) : '0.0';
      document.getElementById('stat-market-ratio').textContent = `${mRatio}%`;
    }

    function renderMarketSparkline() {
      const svg = document.getElementById('market-svg'), hist = state.market.history;
      if (!svg || hist.length < 2) return;
      const w = 360, h = 80, minV = 0.5, maxV = 2.7;
      const pts = hist.map((v, i) => `${((i / (hist.length - 1)) * w).toFixed(1)},${(h - ((v - minV) / (maxV - minV)) * (h - 10) - 5).toFixed(1)}`).join(' ');
      const yBase = h - ((1.0 - minV) / (maxV - minV)) * (h - 10) - 5;
      const yHigh = h - ((1.8 - minV) / (maxV - minV)) * (h - 10) - 5;
      svg.innerHTML = `<line x1="0" y1="${yBase.toFixed(1)}" x2="${w}" y2="${yBase.toFixed(1)}" stroke="#2e3b55" stroke-dasharray="4 3" /><line x1="0" y1="${yHigh.toFixed(1)}" x2="${w}" y2="${yHigh.toFixed(1)}" stroke="#ffd24d" stroke-opacity="0.45" stroke-dasharray="3 3" /><polyline fill="none" stroke="#ffd24d" stroke-width="2.5" points="${pts}" />`;
    }

    function switchTab(tabId) {
      const open = tabId === 'forge' || state.unlocked[tabId] || (tabId === 'spirits' && state.unlocked.expedition);
      if (!open) {
        const msg = tabId === 'challenges' || tabId === 'gambit' ? '첫 차원 붕괴(환생)를 완료하면 해금됩니다.' : '누적 에테르 목표를 달성하면 해금됩니다.';
        showToast(msg, 'cyan');
        return;
      }
      state.activeTab = tabId;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${tabId}`));
      renderAll();
    }

    function saveGame(silent = true) {
      state.lastSavedAt = Date.now();
      try {
        localStorage.setItem(GAME_DATA.saveKey, JSON.stringify(state));
        if (!silent) showToast('로컬 저장소에 저장되었습니다.', 'emerald');
      } catch (e) {
        if (!silent) showToast('로컬 저장소 접근이 제한되어 있습니다. 코드를 복사해 백업하세요.', 'cyan');
      }
    }

    function loadGame() {
      try {
        const raw = localStorage.getItem(GAME_DATA.saveKey);
        if (!raw) return;
        state = migrateSave(JSON.parse(raw));
        const report = runOfflineProgress(state, (Date.now() - state.lastSavedAt) / 1000);
        if (report) {
          document.getElementById('offline-summary-body').innerHTML = `
            <p>부재 시간: <strong class="num">${formatTime(report.elapsedSec)}</strong> (적용 시간: <strong class="num">${formatTime(report.effectiveSec)}</strong>)</p>
            <p class="mt-8">획득 에테르: <strong class="num" style="color:var(--cyan)">+${formatNum(report.gainedAether, state.scientific)}</strong></p>
            <p>획득 결정 파편: <strong class="num" style="color:var(--gold)">+${formatNum(report.gainedCrystals, state.scientific)}</strong></p>
          `;
          openModal('modal-offline');
        }
      } catch (e) { state = createInitialState(); }
    }

    function bindEvents() {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => { SFX.play('click'); switchTab(btn.dataset.tab); }));
      document.getElementById('btn-manual-extract').addEventListener('click', () => { const v = calcClickValue(state); if (v > 0) { addAether(state, v, false); SFX.play('click'); renderAll(); } });
      document.querySelectorAll('#buy-mode-group button').forEach(btn => btn.addEventListener('click', () => {
        state.buyMode = btn.dataset.buy;
        document.querySelectorAll('#buy-mode-group button').forEach(b => b.classList.toggle('active', b === btn));
        SFX.play('click'); renderAll();
      }));
      GAME_DATA.tiers.forEach((_, idx) => document.getElementById(`btn-buy-tier-${idx}`).addEventListener('click', () => { if (buyTier(state, idx)) renderAll(); }));
      document.getElementById('btn-overclock').addEventListener('click', () => { if (state.overclock.cooldown <= 0 && state.activeChallenge !== 'c_silence') { state.overclock.active = !state.overclock.active; SFX.play('click'); renderAll(); } });
      document.getElementById('btn-vent').addEventListener('click', () => { if (ventHeat(state)) renderAll(); });
      document.getElementById('btn-auto-advance').addEventListener('click', () => { state.expedition.autoAdvance = !state.expedition.autoAdvance; SFX.play('click'); renderAll(); });
      document.getElementById('btn-upg-gear').addEventListener('click', () => {
        const c = calcGearCost(state.expedition.gearLv); if (state.aether < c) return;
        state.aether -= c; state.expedition.gearLv += 1; state.expedition.partyHp = calcExpeditionStats(state).maxHp; SFX.play('buy'); renderAll();
      });
      document.getElementById('btn-upg-resonator').addEventListener('click', () => {
        const c = calcResonatorCost(state.expedition.resonatorLv); if (state.aether < c) return;
        state.aether -= c; state.expedition.resonatorLv += 1; SFX.play('buy'); renderAll();
      });
      document.getElementById('btn-sell-25').addEventListener('click', () => { if (sellCrystal(state, 0.25)) renderAll(); });
      document.getElementById('btn-sell-50').addEventListener('click', () => { if (sellCrystal(state, 0.5)) renderAll(); });
      document.getElementById('btn-sell-100').addEventListener('click', () => { if (sellCrystal(state, 1.0)) renderAll(); });
      document.getElementById('btn-auto-sell').addEventListener('click', () => { if (state.prestigeUpgrades.p_auto_sell) { state.market.autoSell = !state.market.autoSell; SFX.play('click'); renderAll(); } });
      document.getElementById('btn-do-prestige').addEventListener('click', () => { const g = calcPrestigeGain(state); if (g > 0) { document.getElementById('modal-prestige-gain').textContent = formatNum(g, state.scientific); openModal('modal-prestige'); } });
      document.getElementById('btn-confirm-prestige').addEventListener('click', () => { closeModal('modal-prestige'); if (doPrestige(state)) { saveGame(true); renderAll(); } });
      document.getElementById('btn-exit-challenge').addEventListener('click', () => { state.activeChallenge = null; resetRunResources(state); showToast('시련을 중단했습니다.', 'cyan'); renderAll(); });
      document.getElementById('btn-gambit-master').addEventListener('click', () => { state.gambitEnabled = !state.gambitEnabled; SFX.play('click'); renderAll(); });
      document.getElementById('btn-sound').addEventListener('click', () => { state.sfxEnabled = !state.sfxEnabled; renderAll(); });
      document.getElementById('btn-notation').addEventListener('click', () => { state.scientific = !state.scientific; renderAll(); });
      document.getElementById('btn-warp-5m').addEventListener('click', () => { window.__GAME_DEBUG__.timeWarp(300); showToast('테스트용 5분 가속 완료!', 'cyan'); });
      document.getElementById('btn-save-modal').addEventListener('click', () => { saveGame(true); document.getElementById('save-code-area').value = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); openModal('modal-save'); });
      document.getElementById('btn-export-save').addEventListener('click', () => {
        const code = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
        const area = document.getElementById('save-code-area'); area.value = code; area.select();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).catch(() => document.execCommand('copy'));
        else document.execCommand('copy');
        showToast('세이브 코드가 복사되었습니다.', 'emerald');
      });
      document.getElementById('btn-import-save').addEventListener('click', () => {
        const raw = document.getElementById('save-code-area').value.trim(); if (!raw) return;
        try { state = migrateSave(JSON.parse(decodeURIComponent(escape(atob(raw))))); saveGame(true); closeModal('modal-save'); showToast('세이브를 불러왔습니다.', 'emerald'); renderAll(); }
        catch (e) { showToast('올바르지 않은 세이브 코드입니다.', 'cyan'); }
      });
      document.getElementById('btn-hard-reset').addEventListener('click', () => { closeModal('modal-save'); openModal('modal-reset'); });
      document.getElementById('btn-confirm-hard-reset').addEventListener('click', () => { try { localStorage.removeItem(GAME_DATA.saveKey); } catch (e) {} state = createInitialState(); closeModal('modal-reset'); showToast('초기화되었습니다.', 'cyan'); renderAll(); });

      let lastSimReport = null;
      document.getElementById('btn-rsi').addEventListener('click', () => openModal('modal-rsi'));
      document.getElementById('btn-run-sim').addEventListener('click', () => {
        const rep = evaluatePacing(3600); lastSimReport = rep;
        const gates = [
          { name: '첫 환생 시간 (720~1200s)', val: rep.firstPrestigeSec !== null ? `${rep.firstPrestigeSec}s` : '미도달', pass: rep.firstPrestigeSec >= 720 && rep.firstPrestigeSec <= 1200 },
          { name: '2회차 가속비 (0.20~0.40)', val: rep.accelRatio !== null ? `${rep.accelRatio}` : 'N/A', pass: rep.accelRatio !== null && rep.accelRatio >= 0.20 && rep.accelRatio <= 0.40 },
          { name: '최장 공백 시간 (≤ 90s)', val: `${rep.maxDeadTimeSec}s`, pass: rep.maxDeadTimeSec <= 90 },
          { name: '교역소 수익 비중 (0.10~0.25)', val: `${(rep.marketShareRatio * 100).toFixed(1)}%`, pass: rep.marketShareRatio >= 0.10 && rep.marketShareRatio <= 0.25 },
          { name: '불변식 검사 (invariants.ok)', val: String(rep.invariants.ok), pass: rep.invariants.ok }
        ];
        document.getElementById('rsi-kpi-wrap').innerHTML = `<table class="kpi-table"><thead><tr><th>검증 지표</th><th>결과</th><th>판정</th></tr></thead><tbody>${gates.map(g => `<tr><td>${g.name}</td><td class="num">${g.val}</td><td class="${g.pass ? 'kpi-pass' : 'kpi-fail'}">${g.pass ? 'PASS' : 'CHECK'}</td></tr>`).join('')}</tbody></table>`;
        document.getElementById('rsi-json-out').textContent = JSON.stringify(rep, null, 2);
      });
      document.getElementById('btn-copy-sim').addEventListener('click', () => { if (lastSimReport && navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(lastSimReport, null, 2)).catch(() => {}); showToast('JSON 복사 완료', 'emerald'); });
      document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));

      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
        const k = e.key.toLowerCase();
        const tabs = ['forge', 'expedition', 'spirits', 'market', 'prestige', 'challenges', 'gambit'];
        if (k >= '1' && k <= '7') switchTab(tabs[Number(k) - 1]);
        else if (k === 'o' && state.overclock.cooldown <= 0 && state.activeChallenge !== 'c_silence') { state.overclock.active = !state.overclock.active; renderAll(); }
        else if (k === 'r') { if (ventHeat(state)) renderAll(); }
        else if (k === 'm') { for (let i = GAME_DATA.tiers.length - 1; i >= 0; i--) buyTier(state, i, 'max'); renderAll(); }
      });
      window.addEventListener('resize', () => { renderForgeCanvas(0); renderBattleCanvas(0, performance.now()); });
    }

    let rafId = null, saveIntervalId = null, lastFrameMs = 0, uiAccum = 0;
    function mainLoop(nowMs) {
      const dt = Math.min(0.25, Math.max(0, (nowMs - lastFrameMs) / 1000));
      lastFrameMs = nowMs;
      tick(state, dt, false);
      renderForgeCanvas(dt);
      renderBattleCanvas(dt, nowMs);
      uiAccum += dt;
      if (uiAccum >= 0.1) { uiAccum = 0; renderAll(); }
      rafId = requestAnimationFrame(mainLoop);
    }

    window.addEventListener('load', () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (saveIntervalId) clearInterval(saveIntervalId);
      buildInitialDOM();
      loadGame();
      bindEvents();
      renderAll();
      lastFrameMs = performance.now();
      rafId = requestAnimationFrame(mainLoop);
      saveIntervalId = setInterval(() => saveGame(true), 10000);
    });
