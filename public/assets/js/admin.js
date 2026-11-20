/* Kuma Kennels — breeder dashboard. All applicant data is rendered with
   textContent, never innerHTML, so nothing an applicant types can run as code. */
(function () {
  'use strict';

  var API = '/api/admin';
  var LABELS = {
    home: { farm: 'Working farm or ranch', rural: 'Homestead or rural acreage', suburban: 'Suburban, fenced yard', other: 'Other' },
    timeline: { now: 'Ready now', '6mo': 'Within 6 months', '1yr': 'Within a year', researching: 'Just researching', custom: 'Custom' },
    sex: { male: 'Male', female: 'Female', either: 'No preference' },
    experience: { first: 'First guardian dog', owned: 'Has owned guardian breeds', working: 'Currently works guardian dogs' },
    status: { new: 'New', contacted: 'Contacted', approved: 'Approved', waitlist: 'Waitlist', declined: 'Declined' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var state = { status: 'new', q: '', items: [], current: null, timer: null };

  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/json' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: headers,
      credentials: 'same-origin',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      if (res.status === 401) { showLogin(); throw new Error('unauthorized'); }
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var e = new Error(data.error || 'request_failed'); e.status = res.status; e.data = data; throw e; }
        return data;
      });
    });
  }

  function timelineText(a) { return a.timeline === 'custom' ? 'Custom: ' + (a.timeline_custom || '') : (LABELS.timeline[a.timeline] || a.timeline); }
  function ref(id) { return 'KK-' + String(id).padStart(4, '0'); }
  function fullDate(iso) {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ---------- Auth ---------- */
  function showLogin() {
    stopPolling();
    $('dash').hidden = true;
    $('bar-actions').hidden = true;
    closeDrawer(true);
    $('login').hidden = false;
    window.setTimeout(function () { $('password').focus(); }, 50);
  }
  function showDash(session) {
    $('login').hidden = true;
    $('dash').hidden = false;
    $('bar-actions').hidden = false;
    $('setup-note').hidden = !!(session && session.email);
    load().then(openFromHash);
    startPolling();
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = e.target.querySelector('button');
    var err = $('login-error');
    err.textContent = '';
    if (!$('password').value) { err.textContent = 'Enter your password.'; return; }
    btn.disabled = true;
    fetch(API + '/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ password: $('password').value })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        btn.disabled = false;
        if (res.ok) { $('password').value = ''; return api('/session').then(showDash); }
        if (res.status === 429) err.textContent = 'Too many attempts. Try again in 15 minutes.';
        else if (res.status === 503) err.textContent = 'The dashboard isn’t set up yet: ' + (data.detail || 'missing configuration') + '.';
        else err.textContent = 'That password isn’t right.';
      });
    }).catch(function () { btn.disabled = false; err.textContent = 'Couldn’t reach the server. Check your connection.'; });
  });

  $('logout').addEventListener('click', function () {
    fetch(API + '/logout', { method: 'POST', credentials: 'same-origin' }).finally(showLogin);
  });

  /* ---------- List ---------- */
  function load() {
    var qs = '?status=' + encodeURIComponent(state.status) + (state.q ? '&q=' + encodeURIComponent(state.q) : '');
    return api('/applications' + qs).then(function (data) {
      state.items = data.items;
      Object.keys(data.counts).forEach(function (k) {
        var c = document.querySelector('[data-count="' + k + '"]');
        if (c) c.textContent = data.counts[k];
      });
      document.title = (data.counts.new ? '(' + data.counts.new + ') ' : '') + 'Applications — Kuma Kennels';
      $('updated').textContent = 'Updated ' + new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      render();
    }).catch(function (e) {
      if (e.message !== 'unauthorized') $('updated').textContent = 'Couldn’t load applications. Retrying shortly…';
    });
  }

  function render() {
    var list = $('list');
    list.textContent = '';
    state.items.forEach(function (a) {
      var row = el('button', 'row-item');
      row.type = 'button';
      row.dataset.id = a.id;

      var nameCell = el('div');
      var name = el('div', 'row-item__name');
      if (a.status === 'new') name.appendChild(el('i', 'dot'));
      name.appendChild(el('span', '', a.name));
      nameCell.appendChild(name);
      nameCell.appendChild(el('div', 'row-item__sub', a.email));

      var loc = el('div', 'row-item__cell', a.city + ', ' + a.state + ' · ' + (LABELS.home[a.home] || a.home));
      var tl = el('div', 'row-item__cell');
      tl.appendChild(el('span', 'pill pill--' + a.status, LABELS.status[a.status] || a.status));
      tl.appendChild(document.createTextNode(' ' + timelineText(a)));

      var when = el('div', 'row-item__when', ago(a.created_at));
      when.title = fullDate(a.created_at);

      row.appendChild(nameCell); row.appendChild(loc); row.appendChild(tl); row.appendChild(when);
      row.addEventListener('click', function () { openDrawer(a.id); });
      list.appendChild(row);
    });
    $('empty').hidden = state.items.length > 0;
  }

  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-status]');
    if (!b) return;
    state.status = b.dataset.status;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.setAttribute('aria-selected', String(x === b)); });
    load();
  });

  var searchTimer;
  $('q').addEventListener('input', function () {
    window.clearTimeout(searchTimer);
    var v = this.value.trim();
    searchTimer = window.setTimeout(function () { state.q = v; load(); }, 250);
  });
  $('refresh').addEventListener('click', load);

  function startPolling() {
    stopPolling();
    state.timer = window.setInterval(function () { if (!document.hidden && !state.current) load(); }, 60000);
  }
  function stopPolling() { if (state.timer) window.clearInterval(state.timer); state.timer = null; }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !$('dash').hidden && !state.current) load(); });

  /* ---------- Drawer ---------- */
  var lastFocus = null;

  function openDrawer(id) {
    api('/applications/' + id).then(function (data) {
      var a = data.item;
      state.current = a;
      lastFocus = document.activeElement;
      $('d-ref').textContent = ref(a.id);
      $('d-name').textContent = a.name;
      $('d-date').textContent = 'Submitted ' + fullDate(a.created_at);
      $('d-email').href = 'mailto:' + a.email + '?subject=' + encodeURIComponent('Your Kuma Kennels puppy application');
      $('d-call').href = 'tel:' + a.phone.replace(/[^\d+]/g, '');
      $('d-email-text').textContent = a.email;
      $('d-phone').textContent = a.phone;
      $('d-location').textContent = a.city + ', ' + a.state;
      $('d-home').textContent = LABELS.home[a.home] || a.home;
      $('d-timeline').textContent = timelineText(a);
      $('d-sex').textContent = a.sex ? LABELS.sex[a.sex] : '—';
      $('d-experience').textContent = a.experience ? LABELS.experience[a.experience] : '—';
      $('d-message').textContent = a.message;
      $('d-status').value = a.status;
      $('d-notes').value = a.notes || '';
      $('d-saved').textContent = '';
      var warn = $('d-notify');
      warn.hidden = !a.notify_error;
      warn.textContent = a.notify_error ? 'The email alert for this application failed: ' + a.notify_error : '';

      $('scrim').hidden = false;
      $('drawer').hidden = false;
      window.requestAnimationFrame(function () {
        $('scrim').classList.add('is-open');
        $('drawer').classList.add('is-open');
      });
      document.body.classList.add('menu-open');
      history.replaceState(null, '', '#' + a.id);
      $('d-close').focus();
    }).catch(function (e) {
      if (e.status === 404) { history.replaceState(null, '', location.pathname); load(); }
    });
  }

  function closeDrawer(silent) {
    if ($('drawer').hidden) return;
    $('scrim').classList.remove('is-open');
    $('drawer').classList.remove('is-open');
    document.body.classList.remove('menu-open');
    state.current = null;
    window.setTimeout(function () { $('drawer').hidden = true; $('scrim').hidden = true; }, silent ? 0 : 350);
    history.replaceState(null, '', location.pathname);
    if (!silent && lastFocus) lastFocus.focus();
  }

  function openFromHash() {
    var id = Number(location.hash.slice(1));
    if (Number.isInteger(id) && id > 0) openDrawer(id);
  }

  $('d-close').addEventListener('click', function () { closeDrawer(); });
  $('scrim').addEventListener('click', function () { closeDrawer(); });
  document.addEventListener('keydown', function (e) {
    if ($('drawer').hidden) return;
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'Tab') {
      var f = $('drawer').querySelectorAll('a[href], button, select, textarea');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  $('manage').addEventListener('submit', function (e) {
    e.preventDefault();
    var a = state.current;
    if (!a) return;
    var btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    $('d-saved').textContent = '';
    api('/applications/' + a.id, { method: 'PATCH', body: { status: $('d-status').value, notes: $('d-notes').value } })
      .then(function (data) {
        state.current = data.item;
        $('d-saved').textContent = 'Saved';
        load();
      })
      .catch(function () { $('d-saved').textContent = 'Couldn’t save — try again.'; })
      .finally(function () { btn.disabled = false; });
  });

  $('d-delete').addEventListener('click', function () {
    var a = state.current;
    if (!a) return;
    if (!window.confirm('Delete the application from ' + a.name + '? This can’t be undone.')) return;
    api('/applications/' + a.id, { method: 'DELETE' }).then(function () { closeDrawer(); load(); });
  });

  /* ---------- Start ---------- */
  api('/session').then(showDash).catch(function (e) {
    if (e.message === 'unauthorized') return;
    if (e.status === 503) {
      showLogin();
      $('login-error').textContent = 'The dashboard isn’t set up yet: ' + ((e.data && e.data.detail) || 'missing configuration') + '.';
    } else {
      showLogin();
    }
  });
})();
