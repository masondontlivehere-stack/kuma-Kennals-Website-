/* Kuma Kennels — puppy application form. Posts to /api/applications. */
(function () {
  'use strict';

  var form = document.getElementById('apply-form');
  if (!form) return;

  var success = document.getElementById('apply-success');
  var alertBox = form.querySelector('.form-alert');
  var submit = form.querySelector('button[type="submit"]');
  var submitLabel = submit.innerHTML;
  var startedAt = Date.now();
  var DRAFT_KEY = 'kk-application-draft';

  /* ---------- Custom timeline ---------- */
  var timeline = form.elements.timeline;
  var customWrap = document.getElementById('timeline-custom-wrap');
  var customInput = form.elements.timeline_custom;

  function syncTimeline() {
    var on = timeline.value === 'custom';
    customWrap.classList.toggle('is-open', on);
    customWrap.setAttribute('aria-hidden', String(!on));
    customInput.required = on;
    customInput.disabled = !on;
    if (!on) clearError(customInput);
  }
  timeline.addEventListener('change', function () {
    syncTimeline();
    if (timeline.value === 'custom') window.setTimeout(function () { customInput.focus(); }, 120);
  });

  /* ---------- Draft (per-visitor convenience only) ---------- */
  function saveDraft() {
    try {
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== 'website') data[k] = v; });
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable — ignore */ }
  }
  function restoreDraft() {
    try {
      var raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      Object.keys(data).forEach(function (k) {
        var el = form.elements[k];
        if (!el || !data[k]) return;
        if (el instanceof RadioNodeList) {
          Array.prototype.forEach.call(el, function (r) { r.checked = r.value === data[k]; });
        } else { el.value = data[k]; }
      });
    } catch (e) { /* ignore */ }
  }
  function clearDraft() { try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }

  restoreDraft();
  syncTimeline();
  var draftTimer;
  form.addEventListener('input', function () { window.clearTimeout(draftTimer); draftTimer = window.setTimeout(saveDraft, 400); });
  form.addEventListener('change', saveDraft);

  /* ---------- Validation ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldOf(el) { return el.closest('.field'); }
  function setError(el, msg) {
    var f = fieldOf(el);
    if (!f) return;
    f.classList.add('has-error');
    el.setAttribute('aria-invalid', 'true');
    var out = f.querySelector('.error');
    if (out) out.textContent = msg;
  }
  function clearError(el) {
    var f = fieldOf(el);
    if (!f) return;
    f.classList.remove('has-error');
    el.removeAttribute('aria-invalid');
    var out = f.querySelector('.error');
    if (out) out.textContent = '';
  }

  function check(el) {
    if (el.disabled || el.type === 'hidden' || el.name === 'website') return true;
    var v = (el.value || '').trim();
    if (el.required && !v) {
      setError(el, el.dataset.required || 'This field is required.');
      return false;
    }
    if (el.type === 'email' && v && !EMAIL.test(v)) { setError(el, 'Enter a valid email address.'); return false; }
    if (el.name === 'phone' && v && v.replace(/\D/g, '').length < 7) { setError(el, 'Enter a phone number we can reach you on.'); return false; }
    clearError(el);
    return true;
  }

  Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
    el.addEventListener('blur', function () { if (el.value) check(el); });
    el.addEventListener('input', function () { if (fieldOf(el) && fieldOf(el).classList.contains('has-error')) check(el); });
  });

  function validateAll() {
    var firstBad = null;
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
      if (!check(el) && !firstBad) firstBad = el;
    });
    return firstBad;
  }

  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.hidden = !msg;
  }

  /* ---------- Submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showAlert('');

    var bad = validateAll();
    if (bad) {
      showAlert('Please check the highlighted fields.');
      bad.focus();
      return;
    }

    var payload = {};
    new FormData(form).forEach(function (v, k) { payload[k] = typeof v === 'string' ? v.trim() : v; });
    payload.elapsed_ms = Date.now() - startedAt;

    submit.disabled = true;
    submit.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending…';

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.status === 201 && r.data.ok) { done(payload, r.data); return; }
        if (r.status === 400 && r.data.errors) {
          var first = null;
          Object.keys(r.data.errors).forEach(function (name) {
            var el = form.elements[name];
            if (el && el.nodeType === 1) { setError(el, r.data.errors[name]); if (!first) first = el; }
          });
          showAlert('Please check the highlighted fields.');
          if (first) first.focus();
        } else if (r.status === 429) {
          showAlert('Too many applications from this connection. Please wait a little while and try again.');
        } else {
          showAlert('We couldn’t send your application just now. Your answers are saved on this device — please try again in a few minutes.');
        }
        reset();
      })
      .catch(function () {
        showAlert('We couldn’t reach our server. Check your connection and try again — your answers are saved on this device.');
        reset();
      });
  });

  function reset() {
    submit.disabled = false;
    submit.innerHTML = submitLabel;
  }

  function done(payload, data) {
    clearDraft();
    var first = (payload.name || '').split(/\s+/)[0];
    success.querySelector('[data-first]').textContent = first ? ', ' + first : '';
    success.querySelector('[data-email]').textContent = payload.email;
    var ref = success.querySelector('[data-ref]');
    if (data.reference) { ref.textContent = 'Reference ' + data.reference; ref.hidden = false; }
    form.hidden = true;
    success.hidden = false;
    var h = success.querySelector('h2');
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }
})();
