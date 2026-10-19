/* De la Peña Studio — shared motion engine (scroll, cursor, page transitions) */
(function () {
  if (window.DLPMotion) return;
  var W = window, D = document;
  var reduce = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = W.matchMedia('(pointer: fine)').matches;
  var EASE = 'cubic-bezier(.16,1,.3,1)';
  var WINE = '#9B2242';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function whenBody(fn) { if (D.body) fn(); else D.addEventListener('DOMContentLoaded', fn); }
  function all(root, sel) { return [].slice.call(root.querySelectorAll(sel)); }

  /* ---------- page curtain ---------- */
  var curtain = null, covering = false;
  function makeCurtain() {
    if (curtain) return curtain;
    curtain = D.createElement('div');
    curtain.setAttribute('aria-hidden', 'true');
    curtain.style.cssText = 'position:fixed;inset:0;z-index:10000;background:' + WINE + ';display:flex;align-items:center;justify-content:center;transform:translateY(100%);pointer-events:none;will-change:transform;';
    curtain.innerHTML = '<span style="font-family:\'Playfair Display\',Georgia,serif;font-style:italic;font-size:clamp(44px,7vw,104px);color:#F4EFEA;letter-spacing:-.02em;">De la Peña</span>';
    D.body.appendChild(curtain);
    return curtain;
  }
  function cover(cb) {
    var c = makeCurtain();
    c.style.transition = 'none'; c.style.transform = 'translateY(100%)'; c.offsetHeight;
    c.style.transition = 'transform .75s ' + EASE; c.style.transform = 'translateY(0)';
    covering = true; if (cb) setTimeout(cb, 700);
  }
  function lift() {
    if (!curtain || !covering) return;
    covering = false;
    curtain.style.transition = 'transform 1s ' + EASE; curtain.style.transform = 'translateY(-100%)';
  }
  var transit = false;
  try { transit = sessionStorage.getItem('dlp-transit') === '1'; sessionStorage.removeItem('dlp-transit'); } catch (e) {}
  if (transit && !reduce) whenBody(function () { var c = makeCurtain(); c.style.transition = 'none'; c.style.transform = 'translateY(0)'; covering = true; setTimeout(lift, 1800); });

  /* ---------- mobile menu ---------- */
  var menuOpen = false;
  function setMenu(open) {
    var m = D.getElementById('dlp-menu'); if (!m) return;
    menuOpen = open;
    m.style.clipPath = open ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)';
    m.style.pointerEvents = open ? 'auto' : 'none';
    all(m, '[data-mi]').forEach(function (el, i) {
      el.style.transitionDelay = open ? (0.25 + i * 0.06) + 's' : '0s';
      el.style.transform = open ? 'translateY(0)' : 'translateY(40px)';
      el.style.opacity = open ? '1' : '0';
    });
    all(D, '[data-ml1]').forEach(function (l) { l.style.transform = open ? 'translateY(3px) rotate(45deg)' : 'none'; });
    all(D, '[data-ml2]').forEach(function (l) { l.style.transform = open ? 'translateY(-3px) rotate(-45deg)' : 'none'; });
    D.documentElement.style.overflow = open ? 'hidden' : '';
  }
  function closeMenu() { if (menuOpen) setMenu(false); }

  /* ---------- global clicks: menu, anchors, page transitions ---------- */
  D.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var tog = t.closest('[data-menu-toggle]');
    if (tog) { e.preventDefault(); setMenu(!menuOpen); return; }
    var a = t.closest('a[href]'); if (!a) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#') {
      var el = D.getElementById(href.slice(1));
      if (el) { e.preventDefault(); closeMenu(); W.scrollTo({ top: el.getBoundingClientRect().top + W.scrollY, behavior: reduce ? 'auto' : 'smooth' }); }
      return;
    }
    // non-http protocols (mailto:, tel:, ...) — let the browser handle them
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) return;
    var dest; try { dest = new URL(href, location.href); } catch (err) { return; }
    if (dest.origin !== location.origin) return; // external site — normal navigation
    e.preventDefault(); closeMenu();
    if (dest.pathname === location.pathname) { // same page (maybe with a hash)
      if (dest.hash) { var he = D.getElementById(dest.hash.slice(1)); if (he) W.scrollTo({ top: he.getBoundingClientRect().top + W.scrollY, behavior: reduce ? 'auto' : 'smooth' }); }
      return;
    }
    try { sessionStorage.setItem('dlp-transit', '1'); } catch (err) {}
    if (reduce) { location.href = href; return; }
    cover(function () { location.href = href; });
  });

  /* ---------- custom cursor ---------- */
  var ring = null, dot = null, curOn = true, mx = -200, my = -200, rx = -200, ry = -200;
  function setRing(s, bg, bc, txt) {
    if (!ring) return;
    ring.style.width = s + 'px'; ring.style.height = s + 'px';
    ring.style.background = bg; ring.style.borderColor = bc;
    if (ring.textContent !== txt) ring.textContent = txt;
  }
  function buildCursor() {
    if (!fine || reduce || ring) return;
    ring = D.createElement('div'); dot = D.createElement('div');
    ring.style.cssText = 'position:fixed;left:0;top:0;width:38px;height:38px;border:1px solid rgba(244,239,234,.45);border-radius:50%;pointer-events:none;z-index:9990;display:flex;align-items:center;justify-content:center;font:500 10px/1 "Geist Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#F4EFEA;transition:width .5s ' + EASE + ',height .5s ' + EASE + ',background .35s,border-color .35s,opacity .3s;will-change:transform;';
    dot.style.cssText = 'position:fixed;left:0;top:0;width:6px;height:6px;border-radius:50%;background:' + WINE + ';pointer-events:none;z-index:9991;will-change:transform;transition:opacity .3s;';
    D.body.appendChild(ring); D.body.appendChild(dot);
    D.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    D.addEventListener('mouseover', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t) return;
      var lab = t.closest('[data-cursor]');
      if (lab) setRing(92, WINE, 'transparent', lab.getAttribute('data-cursor'));
      else if (t.closest('a,button,[data-magnetic]')) setRing(58, 'rgba(244,239,234,.06)', 'rgba(244,239,234,.7)', '');
      else setRing(38, 'transparent', 'rgba(244,239,234,.45)', '');
    });
    D.documentElement.addEventListener('mouseleave', function () { ring.style.opacity = '0'; dot.style.opacity = '0'; });
    D.documentElement.addEventListener('mouseenter', function () { if (curOn) { ring.style.opacity = '1'; dot.style.opacity = '1'; } });
    (function loop() {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0) translate(-50%,-50%)';
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
  }
  function setCursor(on) {
    curOn = on !== false;
    if (ring) { ring.style.display = curOn ? 'flex' : 'none'; dot.style.display = curOn ? 'block' : 'none'; }
  }

  /* ---------- per-page init ---------- */
  function init(root, opts) {
    if (!root) return function () {};
    opts = opts || {};
    whenBody(buildCursor);
    setCursor(opts.cursor !== false);
    var alive = true, offs = [], vh = W.innerHeight;
    function on(t, ev, fn, o) { t.addEventListener(ev, fn, o || false); offs.push(function () { t.removeEventListener(ev, fn, o || false); }); }

    all(root, 'video').forEach(function (v) { v.muted = true; v.playsInline = true; var p = v.play && v.play(); if (p && p.catch) p.catch(function () {}); });

    var nav = D.getElementById('dlp-nav'), bar = D.getElementById('dlp-progress');
    if (nav) {
      var norm = function (p) {
        p = decodeURIComponent((p || '').split('#')[0].split('?')[0]);
        try { p = new URL(p, location.href).pathname; } catch (e) {}
        p = p.replace(/\.html$/, '').replace(/\/index$/, '/');
        if (p.length > 1) p = p.replace(/\/$/, '');
        return p || '/';
      };
      var here = norm(location.pathname);
      all(nav, 'a[data-link]').forEach(function (a) {
        if (norm(a.getAttribute('href')) === here) { a.style.color = '#F4EFEA'; a.style.boxShadow = 'inset 0 -1px 0 ' + WINE; }
      });
    }

    /* reveals + split words */
    var revs = all(root, '[data-reveal]'), splits = all(root, '[data-split]');
    if (!reduce) {
      revs.forEach(function (el) {
        var k = el.getAttribute('data-reveal') || 'up', d = parseFloat(el.getAttribute('data-delay') || 0);
        el.style.transition = 'none';
        if (k === 'clip') el.style.clipPath = 'inset(0 0 100% 0 round 24px)';
        else if (k === 'clipx') el.style.clipPath = 'inset(0 100% 0 0)';
        else { el.style.opacity = '0'; el.style.transform = k === 'scale' ? 'scale(.92)' : k === 'fade' ? 'none' : 'translateY(56px)'; }
        el.offsetHeight;
        el.style.transition = 'opacity 1.2s ' + EASE + ' ' + d + 's, transform 1.4s ' + EASE + ' ' + d + 's, clip-path 1.6s ' + EASE + ' ' + d + 's';
      });
      splits.forEach(function (el) {
        var d = parseFloat(el.getAttribute('data-delay') || 0);
        all(el, '[data-w]').forEach(function (w, i) {
          w.style.display = 'inline-block'; w.style.transition = 'none';
          w.style.transform = 'translateY(115%) rotate(5deg)'; w.style.transformOrigin = '0 100%'; w.offsetHeight;
          w.style.transition = 'transform 1.35s ' + EASE + ' ' + (d + i * 0.075).toFixed(3) + 's';
        });
      });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        if (el.hasAttribute('data-split')) all(el, '[data-w]').forEach(function (w) { w.style.transform = 'translateY(0) rotate(0deg)'; });
        else { el.style.opacity = '1'; el.style.transform = 'none'; el.style.clipPath = 'inset(0 0 0 0 round 0px)'; }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    if (!reduce) revs.concat(splits).forEach(function (el) { io.observe(el); });

    /* scrub text */
    var scrubs = all(root, '[data-scrub]').map(function (el) {
      if (!el.__dlpSplit) {
        var words = el.textContent.trim().split(/\s+/);
        el.innerHTML = words.map(function (w) { return '<span style="opacity:.14;transition:opacity .5s ease">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>'; }).join(' ');
        el.__dlpSplit = true;
      }
      return { el: el, ws: [].slice.call(el.children), lit: -1 };
    });

    var pars = all(root, '[data-parallax]').map(function (el) { return { el: el, s: parseFloat(el.getAttribute('data-parallax')) || 0 }; });
    var zooms = all(root, '[data-zoom]');
    var mqs = all(root, '[data-marquee]').map(function (el) { return { el: el, x: 0, dir: 1, sp: parseFloat(el.getAttribute('data-marquee')) || 1 }; });

    /* hero frame */
    var hf = root.querySelector('[data-heroframe]'), H = null;
    if (hf) H = { sec: hf, frame: hf.querySelector('[data-frame]'), media: hf.querySelector('[data-frame-media]'), shade: hf.querySelector('[data-frame-shade]'), glow: hf.querySelector('[data-frame-glow]'), hint: hf.querySelector('[data-frame-hint]'), cap: hf.querySelector('[data-frame-caption]'), p: 0 };

    /* horizontal pinned track */
    var hs = all(root, '[data-hscroll]').map(function (sec) { return { sec: sec, sticky: sec.querySelector('[data-hsticky]'), track: sec.querySelector('[data-htrack]'), prog: sec.querySelector('[data-hprog]'), p: 0, dist: 0, off: true }; });
    function layout() {
      vh = W.innerHeight;
      var mob = W.innerWidth < 900 || reduce;
      hs.forEach(function (h) {
        var cards = all(h.track, '[data-hcard]');
        if (mob) {
          h.off = true; h.sec.style.height = 'auto';
          h.sticky.style.position = 'relative'; h.sticky.style.height = 'auto';
          h.track.style.transform = 'none'; h.track.style.flexDirection = 'column'; h.track.style.width = 'auto';
          cards.forEach(function (c) { if (c.dataset.w == null) c.dataset.w = c.style.width; c.style.width = '100%'; });
        } else {
          h.off = false;
          cards.forEach(function (c) { if (c.dataset.w != null) c.style.width = c.dataset.w; });
          h.sticky.style.position = 'sticky'; h.sticky.style.height = '100vh';
          h.track.style.flexDirection = 'row'; h.track.style.width = 'max-content';
          h.dist = Math.max(0, h.track.scrollWidth - W.innerWidth);
          h.sec.style.height = (h.dist + vh) + 'px';
        }
      });
    }
    layout();
    on(W, 'resize', layout);
    var lt = setTimeout(layout, 700); offs.push(function () { clearTimeout(lt); });

    /* pointer effects */
    if (fine && !reduce) {
      all(root, '[data-tilt]').forEach(function (el) {
        var img = el.querySelector('[data-tilt-img]');
        el.style.transition = 'transform .9s ' + EASE; if (img) img.style.transition = 'transform .9s ' + EASE;
        on(el, 'mousemove', function (e) {
          var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = 'perspective(1400px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg)';
          if (img) img.style.transform = 'scale(1.08) translate3d(' + (-x * 18).toFixed(1) + 'px,' + (-y * 18).toFixed(1) + 'px,0)';
        });
        on(el, 'mouseleave', function () { el.style.transform = 'perspective(1400px) rotateY(0deg) rotateX(0deg)'; if (img) img.style.transform = 'scale(1)'; });
      });
      all(D, '[data-magnetic]').forEach(function (el) {
        if (el.__dlpMag) return; el.__dlpMag = true;
        el.style.transition = 'transform .7s ' + EASE + ', background .3s, color .3s';
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          el.style.transform = 'translate3d(' + ((e.clientX - r.left - r.width / 2) * 0.28).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.38).toFixed(1) + 'px,0)';
        });
        el.addEventListener('mouseleave', function () { el.style.transform = 'translate3d(0,0,0)'; });
      });
      all(root, '[data-spot]').forEach(function (el) {
        on(el, 'mousemove', function (e) { var r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
      });
    }
    all(root, '[data-row]').forEach(function (el) {
      var f = el.querySelector('[data-row-fill]'), t = el.querySelector('[data-row-title]'), a = el.querySelector('[data-row-arrow]');
      on(el, 'mouseenter', function () { if (f) f.style.transform = 'scaleY(1)'; if (t) t.style.transform = 'translateX(18px)'; if (a) a.style.transform = 'rotate(-45deg)'; });
      on(el, 'mouseleave', function () { if (f) f.style.transform = 'scaleY(0)'; if (t) t.style.transform = 'none'; if (a) a.style.transform = 'none'; });
    });

    function heroTick(iw) {
      var r = H.sec.getBoundingClientRect(), span = r.height - vh, p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      H.p = lerp(H.p, p, 0.12);
      var e = smooth(clamp(H.p * 1.2, 0, 1)), mob = iw < 900, t, ri, b, l, rad;
      if (mob) { t = e * 84; ri = e * 14; b = e * vh * 0.5; l = ri; rad = e * 22; }
      else { t = e * vh * 0.14; ri = e * iw * 0.035; b = e * vh * 0.12; l = e * iw * 0.42; rad = e * 28; }
      if (H.frame) H.frame.style.clipPath = 'inset(' + t.toFixed(1) + 'px ' + ri.toFixed(1) + 'px ' + b.toFixed(1) + 'px ' + l.toFixed(1) + 'px round ' + rad.toFixed(1) + 'px)';
      if (H.glow) { H.glow.style.top = t + 'px'; H.glow.style.right = ri + 'px'; H.glow.style.bottom = b + 'px'; H.glow.style.left = l + 'px'; H.glow.style.opacity = e.toFixed(3); }
      if (H.media) H.media.style.transform = 'scale(' + (1.14 - 0.14 * e).toFixed(4) + ')';
      if (H.shade) H.shade.style.opacity = (1 - e * 0.72).toFixed(3);
      if (H.hint) H.hint.style.opacity = clamp(1 - H.p * 5, 0, 1).toFixed(3);
      if (H.cap) { H.cap.style.transform = 'translate3d(' + l.toFixed(1) + 'px,' + (-b).toFixed(1) + 'px,0)'; H.cap.style.opacity = e.toFixed(3); }
    }

    var lastY = W.scrollY, navSolid = null, navHidden = false;
    function tick() {
      if (!alive) return;
      var y = W.scrollY, vel = y - lastY, iw = W.innerWidth, i;
      if (bar) { var mxs = D.documentElement.scrollHeight - vh; bar.style.transform = 'scaleX(' + (mxs > 0 ? clamp(y / mxs, 0, 1) : 0).toFixed(4) + ')'; }
      if (nav) {
        var solid = y > 40;
        if (solid !== navSolid) {
          navSolid = solid;
          nav.style.background = solid ? 'rgba(7,7,8,.72)' : 'transparent';
          nav.style.backdropFilter = nav.style.webkitBackdropFilter = solid ? 'blur(18px) saturate(150%)' : 'none';
          nav.style.borderBottomColor = solid ? 'rgba(244,239,234,.08)' : 'transparent';
        }
        if (y > vh * 0.6 && vel > 4 && !menuOpen && !navHidden) { navHidden = true; nav.style.transform = 'translateY(-110%)'; }
        else if ((vel < -4 || y < vh * 0.6) && navHidden) { navHidden = false; nav.style.transform = 'translateY(0)'; }
      }
      if (!reduce) {
        for (i = 0; i < pars.length; i++) {
          var P = pars[i], pr = P.el.parentElement.getBoundingClientRect();
          if (pr.bottom < -300 || pr.top > vh + 300) continue;
          P.el.style.transform = 'translate3d(0,' + ((pr.top + pr.height / 2 - vh / 2) * -P.s).toFixed(1) + 'px,0)';
        }
        for (i = 0; i < zooms.length; i++) {
          var z = zooms[i], zr = z.parentElement.getBoundingClientRect();
          if (zr.bottom < 0 || zr.top > vh) continue;
          var zp = clamp((vh - zr.top) / (vh + zr.height), 0, 1);
          z.style.transform = 'translate3d(0,' + ((zp - 0.5) * -zr.height * 0.07).toFixed(1) + 'px,0) scale(' + (1.2 - 0.1 * zp).toFixed(4) + ')';
        }
        if (H) heroTick(iw);
        hs.forEach(function (h) {
          if (h.off) return;
          var r = h.sec.getBoundingClientRect(), span = r.height - vh, p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
          h.p = lerp(h.p, p, 0.1);
          h.track.style.transform = 'translate3d(' + (-h.p * h.dist).toFixed(1) + 'px,0,0)';
          if (h.prog) h.prog.style.transform = 'scaleX(' + h.p.toFixed(4) + ')';
        });
        mqs.forEach(function (m) {
          if (vel < 0) m.dir = -1; else if (vel > 0) m.dir = 1;
          m.x += (m.sp * 0.6 + Math.min(Math.abs(vel), 80) * 0.3) * m.dir;
          var half = m.el.scrollWidth / 2;
          if (half > 0) { if (m.x > half) m.x -= half; if (m.x < 0) m.x += half; }
          m.el.style.transform = 'translate3d(' + (-m.x).toFixed(1) + 'px,0,0)';
        });
      }
      scrubs.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        var p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.3), 0, 1);
        var lit = Math.round(p * s.ws.length);
        if (lit !== s.lit) { for (var k = 0; k < s.ws.length; k++) s.ws[k].style.opacity = k < lit ? '1' : '.14'; s.lit = lit; }
      });
      lastY = y;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    if (location.hash) {
      var ht = setTimeout(function () { var t = D.getElementById(location.hash.slice(1)); if (t) W.scrollTo(0, t.getBoundingClientRect().top + W.scrollY); }, 450);
      offs.push(function () { clearTimeout(ht); });
    }
    setTimeout(lift, 150);

    return function () { alive = false; io.disconnect(); offs.forEach(function (f) { f(); }); };
  }

  window.DLPMotion = { init: init, setCursor: setCursor };
})();
