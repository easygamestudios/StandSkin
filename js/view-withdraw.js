/* StandSkin — вывод скинов (раздел в разработке) */
(function () {
  'use strict';
  const SS = window.SS, { $ } = SS;

  SS.registerView('withdraw', (root) => {
    root.innerHTML = `
      <h1 class="page-title">Вывод</h1>
      <p class="page-sub">Вывод скинов из инвентаря в игру.</p>
      <div class="soon">
        <div class="soon-ico">🛠</div>
        <b>Раздел в разработке</b>
        <p>Скоро здесь можно будет отправить выигранные скины себе в аккаунт.
          Пока что скины остаются в инвентаре — их можно продать за голду или отправить в апгрейд.</p>
        <div class="soon-actions">
          <a class="btn btn-primary" href="#/inventory">Открыть инвентарь</a>
          <a class="btn" href="#/">К кейсам</a>
        </div>
      </div>`;
    return null;
  });
})();
