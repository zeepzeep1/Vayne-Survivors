(() => {
  const patchId = 'elitePatchV1';
  const existing = document.getElementById(patchId);
  if (existing) return;

  const style = document.createElement('style');
  style.id = patchId;
  style.textContent = `
    #eliteArrow {
      position: fixed;
      z-index: 40;
      width: 26px;
      height: 26px;
      display: none;
      pointer-events: none;
      color: #ffb85c;
      font: 900 20px/1 Inter, system-ui, sans-serif;
      text-shadow: 0 2px 0 #000, 0 0 12px rgba(255,184,92,.75);
      user-select: none;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    }
    .elite-bar-wrap {
      position: absolute;
      left: 50%;
      top: -24px;
      transform: translateX(-50%);
      width: 120px;
      height: 12px;
      border: 1px solid rgba(255,255,255,.6);
      background: rgba(0,0,0,.55);
      border-radius: 999px;
      overflow: hidden;
      box-shadow: 0 0 8px rgba(0,0,0,.7);
      pointer-events: none;
    }
    .elite-bar-fill {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #ff6b4a, #ffd166, #7ef0a6);
      border-radius: inherit;
      box-shadow: 0 0 10px rgba(255,184,92,.5);
    }
  `;
  document.head.appendChild(style);

  const eliteArrow = document.createElement('div');
  eliteArrow.id = 'eliteArrow';
  eliteArrow.textContent = '▲';
  document.body.appendChild(eliteArrow);

  const ensureArrow = () => {
    if (!document.body.contains(eliteArrow)) document.body.appendChild(eliteArrow);
  };

  function findNearestElite() {
    const hero = window.hero;
    const enemies = window.enemies || [];
    if (!hero || !enemies.length) return null;
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      const ud = e && e.userData;
      if (!ud || !ud.isElite || !ud.maxHp || !e.visible) continue;
      if ((ud.hp || 0) <= 0) continue;
      const d = e.position.distanceToSquared(hero.position);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  function updateEliteArrow() {
    const hero = window.hero;
    const target = findNearestElite();
    if (!hero || !target) {
      eliteArrow.style.display = 'none';
      return;
    }

    const v = target.position.clone().sub(hero.position);
    const d = Math.hypot(v.x, v.z) || 0.0001;
    const dx = v.x / d;
    const dz = v.z / d;

    const angle = Math.atan2(dz, dx) + Math.PI / 2;
    const px = window.innerWidth / 2 + Math.cos(angle) * 120;
    const py = window.innerHeight / 2 + Math.sin(angle) * 120;

    eliteArrow.style.display = 'flex';
    eliteArrow.style.left = `${px}px`;
    eliteArrow.style.top = `${py}px`;
    eliteArrow.style.transform = `translate(-50%, -50%) rotate(${(-Math.atan2(v.z, v.x) * 180 / Math.PI) + 90}deg)`;
    eliteArrow.style.color = target.userData?.big ? '#ffb85c' : '#8fe9ff';
  }

  function drawEliteBar(enemy) {
    const ud = enemy.userData;
    if (!ud || !ud.isElite || !ud.eliteUi) return;

    const { canvas, ctx, label, color } = ud.eliteUi;
    const hpRatio = Math.max(0, Math.min(1, (ud.hp || 0) / (ud.maxHp || 1)));
    canvas.width = 180;
    canvas.height = 26;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    ctx.fillStyle = color;
    ctx.fillRect(8, 7, (canvas.width - 16) * hpRatio, canvas.height - 14);

    ctx.fillStyle = '#f7f1d0';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 10, 18);

    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.max(0, Math.ceil((ud.hp || 0)))} / ${Math.ceil(ud.maxHp || 1)}`, canvas.width - 10, 18);

    ud.eliteUi.texture.needsUpdate = true;
  }

  function ensureEliteHUD(enemy) {
    const ud = enemy.userData;
    if (!ud || ud.eliteUi) return;
    if (!ud.isElite) return;

    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 26;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 2.7, 0);
    sprite.scale.set(3.2, 0.55, 1.0);
    sprite.renderOrder = 40;
    enemy.add(sprite);

    ud.eliteUi = {
      canvas,
      ctx,
      texture,
      label: ud.big ? 'SAPO' : (ud.mage ? 'GOLEM' : 'ELITE'),
      color: ud.big ? '#ffb85c' : '#8fe9ff',
      sprite,
    };

    drawEliteBar(enemy);
  }

  function awardHealDrop(enemy) {
    if (!enemy || !window.scene) return;
    const ud = enemy.userData;
    if (!ud || !ud.isElite) return;
    const roll = Math.random();
    if (roll > 0.28) return;

    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, 1),
      new THREE.MeshStandardMaterial({
        color: 0x67f7b2,
        emissive: 0x1aa35e,
        emissiveIntensity: 1.8,
        roughness: 0.3,
        metalness: 0.1,
      })
    );
    mesh.position.set(enemy.position.x, 1.0, enemy.position.z);
    mesh.scale.setScalar(1.25);
    scene.add(mesh);

    const drop = {
      mesh,
      type: 'heal',
      life: 18,
      bob: Math.random() * 6.28,
    };
    if (!window.pickups) window.pickups = [];
    window.pickups.push(drop);
  }

  function maybePatchPickups() {
    if (!window.pickups) return;
    for (let i = window.pickups.length - 1; i >= 0; i--) {
      const p = window.pickups[i];
      if (!p || !p.mesh) continue;
      if (p.type !== 'heal') continue;
      p.life -= 0.016;
      p.mesh.position.y = 0.9 + Math.sin((performance.now() * 0.006) + p.bob) * 0.2;
      p.mesh.rotation.y += 0.03;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        window.pickups.splice(i, 1);
      }
      if (p.mesh.position.distanceToSquared(window.hero.position) < 2.2) {
        const amount = Math.max(16, Math.round((window.maxHp || 100) * 0.22));
        window.hp = Math.min(window.maxHp || 100, (window.hp || 0) + amount);
        if (typeof window.num === 'function') window.num?.('+' + amount, window.hero.position, 's');
        if (typeof window.spark === 'function') window.spark?.(window.hero.position.x, 1, window.hero.position.z, 0x6dff9b, 20, 3, 4, 1.0);
        scene.remove(p.mesh);
        window.pickups.splice(i, 1);
      }
    }
  }

  function patchEnemyFactory() {
    const orig = window.makeEnemy;
    if (!orig || orig.__elitePatched) return;
    window.makeEnemy = function patchedMakeEnemy(x, z, big = false, mage = false) {
      const enemy = orig.call(this, x, z, big, mage);
      const ud = enemy && enemy.userData;
      if (!ud) return enemy;
      const isElite = !!big || !!mage || /gromp|sapo|elite|golem/i.test((enemy.userData && enemy.userData.file) || '');
      if (!isElite) return enemy;
      ud.isElite = true;
      ud.maxHp = Math.max(ud.maxHp || 2, (ud.big ? 7 : 6));
      ud.hp = Math.max(ud.hp || 1, ud.maxHp);
      ensureEliteHUD(enemy);
      drawEliteBar(enemy);
      if (typeof window.showMessage === 'function') {
        const label = (big ? 'SAPO' : (mage ? 'GOLEM' : 'ELITE'));
        window.showMessage(`¡ELITE ${label} ENTRANDO!`);
      }
      if (typeof window.ring === 'function') window.ring?.(x, z, ud.big ? 0xffb85c : 0x8fe9ff, 5.5, 0.8);
      return enemy;
    };
    window.makeEnemy.__elitePatched = true;
  }

  function patchKillEnemy() {
    const orig = window.killEnemy;
    if (!orig || orig.__elitePatched) return;
    window.killEnemy = function patchedKillEnemy(enemy) {
      if (enemy && enemy.userData && enemy.userData.isElite) {
        awardHealDrop(enemy);
      }
      return orig.call(this, enemy);
    };
    window.killEnemy.__elitePatched = true;
  }

  function patchUpdateLoop() {
    const orig = window.update;
    if (!orig || orig.__elitePatched) return;
    window.update = function patchedUpdate(dt) {
      maybePatchPickups();
      const enemies = window.enemies || [];
      for (const enemy of enemies) {
        const ud = enemy && enemy.userData;
        if (ud && ud.isElite) {
          ensureEliteHUD(enemy);
          drawEliteBar(enemy);
          enemy.position.y = 0.02 + (Math.sin((performance.now() * 0.004) + enemy.position.x) * 0.02);
        }
      }
      updateEliteArrow();

      if (window.spawnTimer !== undefined && window.elapsed !== undefined && window.elapsed > 16) {
        window.spawnTimer = Math.max(0.5, (window.spawnTimer || 1.25) - dt * 0.35);
      }

      return orig.call(this, dt);
    };
    window.update.__elitePatched = true;
  }

  function patchSpawns() {
    const orig = window.spawnTimer;
    if (typeof window.spawnTimer !== 'number') return;
    if (!window.__eliteSpawnBoost) {
      window.__eliteSpawnBoost = true;
    }
  }

  function start() {
    if (!window.hero || !window.makeEnemy || !window.update || !window.enemies || !window.scene) {
      requestAnimationFrame(start);
      return;
    }

    patchEnemyFactory();
    patchKillEnemy();
    patchUpdateLoop();
    patchSpawns();
  }

  start();
})();
