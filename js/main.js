/* StandSkin — запуск */
(function () {
  'use strict';
  const SS = window.SS;
  window.SS_ART.init();
  SS.initHeader();
  SS.initFeed();
  window.addEventListener('hashchange', SS.route);
  SS.route();
  if (SS.state.balance === 0 && SS.state.inv.length === 0) {
    setTimeout(() => SS.toast('Баланс 0 G — введи секретный промокод 🎁'), 900);
  }
})();
