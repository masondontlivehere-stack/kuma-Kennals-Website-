/* Kuma Kennels — navigation, scroll reveals, form handling */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- Mobile navigation -------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  if (toggle && nav) {
    var closeNav = function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      nav.classList.toggle('is-open', !open);
      toggle.setAttribute('aria-expanded', String(!open));
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeNav();
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) closeNav();
    });
  }

  /* ---- Header state on scroll ---------------------------------------- */
  var header = document.getElementById('site-header');
  if (header) {
    var setHeaderState = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    setHeaderState();
    window.addEventListener('scroll', setHeaderState, { passive: true });
  }

  /* ---- Scroll reveals ------------------------------------------------- */
  var revealables = document.querySelectorAll('.reveal');

  if (!revealables.length) return;

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    Array.prototype.forEach.call(revealables, function (el) {
      observer.observe(el);
    });
  }
})();

/* ---- Reservation form ------------------------------------------------- */
(function () {
  'use strict';

  var form = document.getElementById('reserve-form');
  if (!form) return;

  var status = form.querySelector('.form__status');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.reportValidity()) return;

    var data = new FormData(form);
    var lines = [];

    data.forEach(function (value, key) {
      var field = form.elements[key];
      var label = form.querySelector('label[for="' + key + '"]');
      var name = label ? label.textContent.replace(/\s*\(optional\)\s*/i, '').trim() : key;
      if (String(value).trim()) lines.push(name + ': ' + value);
      void field;
    });

    var subject = 'Puppy inquiry — ' + (data.get('name') || 'Kuma Kennels');
    var body = lines.join('\n\n');
    var to = form.dataset.email;

    window.location.href =
      'mailto:' + to +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    if (status) {
      status.textContent =
        'Opening your email app with this inquiry. If nothing happens, email ' + to + ' directly.';
    }
  });
})();
