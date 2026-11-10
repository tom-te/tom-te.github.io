(() => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const header = document.getElementById('top');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const el = e.target;
        if (e.isIntersecting) {
          el.classList.remove('above');
          el.classList.add('in');
        } else {
          el.classList.remove('in');
          el.classList.toggle('above', e.boundingClientRect.top < 0);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('in'));
  }

  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--x', `${e.clientX - r.left}px`);
      card.style.setProperty('--y', `${e.clientY - r.top}px`);
    });
  });

  // Orbe : sphère de particules en rotation continue ; au survol, elle "parle" (vagues, halo et barres pilotés par une voix simulée).
  const canvas = document.getElementById('orb');
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (ctx) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N = 1600;
    const BARS = 120;
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      pts.push([Math.cos(golden * i) * r, y, Math.sin(golden * i) * r]);
    }

    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const sctx = sprite.getContext('2d');
    const sg = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    sg.addColorStop(0, 'rgba(255,226,190,1)');
    sg.addColorStop(0.22, 'rgba(255,140,50,.9)');
    sg.addColorStop(1, 'rgba(255,90,10,0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 32, 32);

    let W = 0, H = 0, R = 0;
    let level = 0, target = 0, nextSyllable = 0, talking = false, phaseEnd = 0;
    let tiltX = 0, tiltY = 0, mouseX = 0, mouseY = 0;
    let hover = false, touchUntil = 0, now = 0, activity = 0;

    const voice = (t) => {
      if (t > phaseEnd) {
        talking = !talking;
        phaseEnd = t + (talking ? 1.6 + Math.random() * 2.6 : 0.6 + Math.random() * 1.2);
      }
      if (t > nextSyllable) {
        target = talking ? 0.3 + Math.random() * 0.7 : Math.random() * 0.05;
        nextSyllable = t + 0.07 + Math.random() * 0.13;
      }
      level += (target - level) * 0.16;
      return level;
    };

    const arcs = (r, rot, list, alpha, width) => {
      ctx.save();
      ctx.rotate(rot);
      ctx.lineWidth = width;
      ctx.strokeStyle = `rgba(255,140,60,${alpha})`;
      list.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(0, 0, r, a, b); ctx.stroke(); });
      ctx.restore();
    };

    const draw = (t) => {
      now = t;
      activity += ((hover || t < touchUntil ? 1 : 0) - activity) * 0.06;
      const v = reduce ? 0 : voice(t) * activity;
      tiltX += (mouseX * 0.7 - tiltX) * 0.04;
      tiltY += (mouseY * 0.5 - tiltY) * 0.04;
      const cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);

      const glowR = R * (2 + v * 0.45);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      cg.addColorStop(0, `rgba(255,122,26,${0.2 + v * 0.22})`);
      cg.addColorStop(0.45, `rgba(255,90,10,${0.07 + v * 0.07})`);
      cg.addColorStop(1, 'rgba(255,90,10,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(cx, cy);
      const pulse = 1 + v * 0.035;
      arcs(R * 1.52 * pulse, t * 0.22, [[0, 1.1], [1.5, 2.1], [2.7, 4.5], [4.9, 5.7]], 0.5, 1.5);
      ctx.setLineDash([1, 7]);
      arcs(R * 1.66 * pulse, -t * 0.12, [[0, Math.PI * 2]], 0.4, 1);
      ctx.setLineDash([]);
      arcs(R * 1.86, t * 0.07, [[0.3, 0.95], [2.2, 2.5], [3.5, 4.2]], 0.28, 1);
      for (let i = 0; i < BARS; i++) {
        const a = (i / BARS) * Math.PI * 2;
        const n = Math.abs(Math.sin(i * 1.7 + t * 7) * Math.sin(i * 0.41 - t * 3.3));
        const r0 = R * 1.2;
        const len = 2 + v * R * 0.24 * n;
        ctx.strokeStyle = `rgba(255,150,70,${0.18 + 0.6 * n * v})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len));
        ctx.stroke();
      }
      ctx.restore();

      ctx.globalCompositeOperation = 'lighter';
      const ry = t * 0.25 + tiltX, rx = -0.35 + tiltY;
      const cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);
      const fov = 3.2;
      for (let i = 0; i < N; i++) {
        let [x, y, z] = pts[i];
        const d = Math.sin(x * 3.1 + t * 1.7) * Math.sin(y * 2.7 - t * 1.3) * Math.sin(z * 3.4 + t * 2.1);
        const k = 1 + d * (0.05 * activity + v * 0.24) + v * 0.04;
        x *= k; y *= k; z *= k;
        const x1 = x * cY + z * sY;
        const z1 = -x * sY + z * cY;
        const y1 = y * cX - z1 * sX;
        const z2 = y * sX + z1 * cX;
        const s = fov / (fov + z2);
        const depth = Math.min(1, Math.max(0, (1 - z2) / 2));
        const size = (0.85 + depth * 1.9 + Math.max(d, 0) * v * 2.6) * s;
        ctx.globalAlpha = Math.min(1, 0.08 + depth * 0.8);
        ctx.drawImage(sprite, cx + x1 * R * s - size * 2, cy + y1 * R * s - size * 2, size * 4, size * 4);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height; R = Math.min(W, H) * 0.27;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(2);
    };
    resize();
    window.addEventListener('resize', resize);
    const hitOrb = (e) => {
      const r = canvas.getBoundingClientRect();
      return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < R * 1.6;
    };
    const wake = () => {
      talking = true;
      phaseEnd = now + 1.8 + Math.random() * 2;
      nextSyllable = 0;
    };
    window.addEventListener('pointermove', (e) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
      if (e.pointerType !== 'mouse') return;
      const inside = hitOrb(e);
      if (inside && !hover) wake();
      hover = inside;
    }, { passive: true });
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' && hitOrb(e)) { wake(); touchUntil = now + 4; }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { hover = false; });

    if (!reduce) {
      let raf = 0, inView = true;
      const t0 = performance.now();
      const loop = (now) => { draw((now - t0) / 1000); raf = requestAnimationFrame(loop); };
      const start = () => { if (!raf && inView && !document.hidden) raf = requestAnimationFrame(loop); };
      const stop = () => { cancelAnimationFrame(raf); raf = 0; };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }).observe(canvas);
      }
      document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
      start();
    }
  }
})();
