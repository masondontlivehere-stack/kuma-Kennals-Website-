/* Runs before first paint: lets CSS hide reveal targets only when JS is available,
   and marks the first page view of a visit so the header can play its intro once. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    if (!window.sessionStorage.getItem('kk-visited')) {
      root.classList.add('first-visit');
      window.sessionStorage.setItem('kk-visited', '1');
    }
  } catch (e) { /* storage blocked — skip the header intro */ }
})();
