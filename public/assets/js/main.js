/* Kuma Kennels — site behaviour: header, menu, reveals, lightbox, prefetch. */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Header: solid after scroll, hides on scroll down ---------- */
  var header = document.querySelector('.site-header');
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 24);
      var menuOpen = body.classList.contains('menu-open');
      var hide = !menuOpen && y > 420 && y > lastY + 4;
      var show = y < lastY - 4 || y < 420;
      if (hide) header.classList.add('is-hidden');
      else if (show) header.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('menu');

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-toggle__label').textContent = open ? 'Close' : 'Menu';
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if ('inert' in menu) menu.inert = !open;
    body.classList.toggle('menu-open', open);
    if (header) { header.classList.toggle('menu-active', open); header.classList.remove('is-hidden'); }
    if (open) {
      var first = menu.querySelector('a');
      if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    }
  }

  if (toggle && menu) {
    if ('inert' in menu) menu.inert = true;
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 1040px)').addEventListener('change', function (mq) { if (mq.matches) setMenu(false); });
  }

  /* ---------- Scroll reveals ---------- */
  document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
    Array.prototype.forEach.call(group.querySelectorAll('[data-reveal]'), function (el, i) {
      el.style.setProperty('--i', String(i % 6));
    });
  });

  var revealEls = document.querySelectorAll('[data-reveal]');
  if (reduce.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Lightbox for galleries ---------- */
  var galleries = document.querySelectorAll('[data-gallery]');
  if (galleries.length) {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<div class="lightbox__bar"><span class="lb-count" aria-live="polite"></span>' +
      '<button class="lb-btn lb-close" type="button" aria-label="Close"><svg class="icon" aria-hidden="true"><use href="' + iconHref('i-x') + '"/></svg></button></div>' +
      '<div class="lightbox__stage">' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo"><svg class="icon" aria-hidden="true"><use href="' + iconHref('i-chevron-left') + '"/></svg></button>' +
      '<img alt="">' +
      '<button class="lb-btn lb-next" type="button" aria-label="Next photo"><svg class="icon" aria-hidden="true"><use href="' + iconHref('i-chevron-right') + '"/></svg></button>' +
      '</div><p class="lightbox__caption"></p>';
    body.appendChild(lb);
    if ('inert' in lb) lb.inert = true;

    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lightbox__caption');
    var lbCount = lb.querySelector('.lb-count');
    var lbPrev = lb.querySelector('.lb-prev');
    var lbNext = lb.querySelector('.lb-next');
    var items = [];
    var index = 0;
    var opener = null;

    function show(i) {
      index = (i + items.length) % items.length;
      var item = items[index];
      lbImg.classList.remove('is-ready');
      lbImg.onload = function () { lbImg.classList.add('is-ready'); };
      lbImg.src = item.dataset.full;
      lbImg.alt = item.dataset.alt || '';
      if (lbImg.complete) lbImg.classList.add('is-ready');
      lbCap.textContent = item.dataset.caption || '';
      lbCount.textContent = items.length > 1 ? (index + 1) + ' / ' + items.length : '';
      lbPrev.hidden = lbNext.hidden = items.length < 2;
    }
    function open(gallery, start) {
      items = Array.prototype.slice.call(gallery.querySelectorAll('[data-full]'));
      opener = document.activeElement;
      show(start);
      lb.classList.add('is-open');
      if ('inert' in lb) lb.inert = false;
      body.classList.add('menu-open');
      lb.querySelector('.lb-close').focus();
    }
    function close() {
      lb.classList.remove('is-open');
      if ('inert' in lb) lb.inert = true;
      body.classList.remove('menu-open');
      if (opener) opener.focus();
    }

    galleries.forEach(function (g) {
      g.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-full]');
        if (!btn) return;
        var list = Array.prototype.slice.call(g.querySelectorAll('[data-full]'));
        open(g, list.indexOf(btn));
      });
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lbPrev.addEventListener('click', function () { show(index - 1); });
    lbNext.addEventListener('click', function () { show(index + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox__stage')) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(lb.querySelectorAll('button'), function (b) { return !b.hidden; });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var touchX = null;
    lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50 && items.length > 1) show(index + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }

  function iconHref(id) {
    var any = document.querySelector('svg.icon use');
    var base = any ? any.getAttribute('href').split('#')[0] : 'assets/img/icons.svg';
    return base + '#' + id;
  }

  /* ---------- Prefetch internal pages on intent ---------- */
  var prefetched = {};
  function prefetch(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.origin !== location.origin || a.pathname === location.pathname) return;
    if (prefetched[a.pathname]) return;
    prefetched[a.pathname] = true;
    var l = document.createElement('link');
    l.rel = 'prefetch'; l.href = a.href;
    document.head.appendChild(l);
  }
  document.addEventListener('pointerenter', prefetch, { capture: true, passive: true });
  document.addEventListener('focusin', prefetch, { passive: true });

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  void root;
})();
