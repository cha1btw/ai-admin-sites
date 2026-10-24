(function () {
  'use strict';
  var app = window.ZapysLanding;
  if (!app) return;
  var $ = function (id) { return document.getElementById(id); };
  var cards = Array.from(document.querySelectorAll('.audience-card'));
  var codes = ['uk', 'ru', 'en', 'es', 'pl'];
  var industry = 0, industryChosen = false, finderTouched = false, prepared = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var channelInput = $('finder-channels'), needsInput = $('finder-needs');

  function state() { return app.getState(); }
  function copy() { return window.ZAPYS_CONVERSION_COPY[state().lang]; }
  function word(uk) {
    var row = window.ZAPYS_I18N.find(function (item) { return item.uk === uk; });
    return row ? row[state().lang] : uk;
  }
  function contact() {
    var value = String((window.CONFIG || {}).contact || '').replace(/^@/, '');
    return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value) && !/^YOUR_/.test(value) ? value : null;
  }
  function hasApi() { return !!(window.CONFIG || {}).apiBase; }
  function name(plan) { return {lite: 'Lite', medium: 'Medium', pro: 'Pro'}[plan]; }
  function formatPrice(plan) {
    var s = state(), c = copy(), amount = app.getPrices()[plan];
    return Number(amount).toLocaleString(s.lang === 'uk' ? 'uk-UA' : s.lang) + ' ' +
      (s.currency === 'EUR' ? 'EUR' : 'грн') + ' / ' + (s.billing === 'annual' ? c.year : c.month);
  }
  function recommendation() {
    if (channelInput.value === 'many') return {plan: 'pro', reason: 'proChannels'};
    if (needsInput.value === 'advanced') return {plan: 'pro', reason: 'proAdvanced'};
    if (needsInput.value === 'audio') return {plan: 'medium', reason: 'medium'};
    return {plan: 'lite', reason: 'lite'};
  }
  function industryName() { return cards[industry].querySelector('h3').textContent; }
  function describeSelection() {
    var c = copy(), lines = [];
    if (industryChosen) lines.push(c.industry + ': ' + industryName());
    if (finderTouched) {
      lines.push(c.channels + ': ' + (channelInput.value === 'many' ? c.many : c.one));
      lines.push(c.needs + ': ' + c[needsInput.value]);
    }
    return lines.join('\n');
  }
  function emit(event, details) {
    // First-party integration hook only. No network calls, cookies or contact data.
    document.dispatchEvent(new CustomEvent('zapysai:conversion', {
      detail: Object.assign({event: event}, details || {})
    }));
  }
  function readForm() {
    var form = $('lead-form');
    return form && $('f-name') ? Object.fromEntries(new FormData(form).entries()) : null;
  }
  function buildDraft(data) {
    var s = state(), c = copy(), lines = [c.intro, ''];
    lines.push(c.name + ': ' + String(data.name || '').trim());
    lines.push(c.contact + ': ' + String(data.contact || '').trim());
    if (String(data.business || '').trim()) lines.push(c.business + ': ' + data.business.trim());
    var service = $('f-service');
    if (service && service.value !== 'ai_admin') {
      var option = service.querySelector('option[value="' + service.value + '"]');
      if (option) lines.push(c.service + ': ' + option.textContent);
    }
    lines.push(c.plan + ': ' + (s.chosenPlan ? name(s.chosenPlan) : c.help));
    if (s.chosenPlan) lines.push(c.price + ': ' + formatPrice(s.chosenPlan));
    var context = describeSelection();
    if (context) lines.push(context);
    if (String(data.message || '').trim()) lines.push(c.comment + ': ' + data.message.trim());
    return Array.from(lines.join('\n')).slice(0, 3900).join('');
  }
  function prepareLead(data, focus) {
    var recipient = contact(), panel = $('telegram-lead');
    if (!recipient || !panel) return false;
    var draft = buildDraft(data), c = copy();
    $('telegram-draft').value = draft;
    $('telegram-draft-link').href = 'https://t.me/' + recipient + '?text=' + encodeURIComponent(draft);
    $('telegram-draft-link').setAttribute('referrerpolicy', 'no-referrer');
    $('telegram-lead-status').textContent = c.ready.replace('{contact}', recipient);
    $('telegram-copy-status').textContent = '';
    panel.hidden = false;
    prepared = true;
    if (focus !== false) {
      panel.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'nearest'});
      $('telegram-draft-link').focus({preventScroll: true});
      emit('lead_draft_prepared', {plan: state().chosenPlan || 'undecided'});
    }
    return true;
  }
  function render() {
    var s = state(), c = copy(), suggestion = recommendation();
    var example = window.ZAPYS_INDUSTRY_EXAMPLES[industry][codes.indexOf(s.lang)];
    $('audience-example').hidden = false;
    $('audience-example-title').textContent = industryName();
    $('example-question').textContent = example[0];
    $('example-answer').textContent = example[1];
    cards.forEach(function (card, index) {
      var button = card.querySelector('.audience-example-button');
      button.textContent = c.example + ' ↗';
      button.setAttribute('aria-label', c.exampleFor + ': ' + card.querySelector('h3').textContent);
      button.setAttribute('aria-pressed', String(industryChosen && industry === index));
      card.classList.toggle('is-selected', industryChosen && industry === index);
    });
    $('finder-result-label').textContent = c.recommended;
    $('finder-plan').textContent = name(suggestion.plan);
    $('finder-price').textContent = formatPrice(suggestion.plan);
    $('finder-reason').textContent = c[suggestion.reason];
    document.querySelectorAll('.plan').forEach(function (card) {
      var plan = card.querySelector('[data-plan]').getAttribute('data-plan');
      var highlighted = finderTouched && suggestion.plan === plan;
      card.classList.toggle('is-fit', highlighted);
      var badge = card.querySelector('.plan-fit-badge');
      badge.textContent = c.recommended;
      badge.hidden = !highlighted;
    });
    var selection = $('lead-selection');
    if (selection) {
      var parts = [];
      if (s.chosenPlan) parts.push(c.chosen + ': ' + name(s.chosenPlan) + ' · ' + formatPrice(s.chosenPlan));
      if (industryChosen) parts.push(c.industry + ': ' + industryName());
      selection.textContent = parts.join('\n');
      selection.hidden = parts.length === 0;
    }
    if (!$('f-submit')) return;
    $('f-submit').textContent = hasApi() ? c.submit : c.prepare;
    $('lead-route-note').textContent = hasApi() ? c.apiRoute : word('Після заповнення покажемо текст запиту. У Telegram ви самі підтвердите його надсилання.');
    $('lead-privacy').textContent = hasApi() ? c.apiPrivacy : word('Дані залишаються у вашому браузері, доки ви не продовжите в Telegram. Не додавайте чутливу інформацію.');
    $('lead-intro').textContent = hasApi() ? c.apiIntro : word('Підготуйте короткий запит і продовжте розмову в Telegram із @ZapysAI.').replace('@ZapysAI', '@' + (contact() || 'ZapysAI'));
    if (prepared && !hasApi()) {
      var data = readForm();
      if (data) prepareLead(data, false);
    } else if (hasApi() && $('telegram-lead')) {
      $('telegram-lead').hidden = true;
      prepared = false;
    }
  }

  cards.forEach(function (card, index) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'audience-example-button';
    button.setAttribute('data-industry', String(index));
    button.setAttribute('aria-controls', 'audience-example');
    button.addEventListener('click', function () {
      industry = index; industryChosen = true;
      render();
      $('audience-example').scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'nearest'});
      emit('industry_example', {industry: index});
    });
    card.appendChild(button);
  });
  document.querySelectorAll('.plan').forEach(function (card) {
    var badge = document.createElement('p');
    badge.className = 'plan-fit-badge';badge.hidden = true;
    card.insertBefore(badge, card.firstChild);
  });
  [channelInput, needsInput].forEach(function (input) {
    input.addEventListener('change', function () {
      finderTouched = true;render();
      emit('plan_recommendation', {plan: recommendation().plan});
    });
  });
  $('example-to-finder').addEventListener('click', function () { industryChosen = true;render(); });
  $('finder-apply').addEventListener('click', function () {
    finderTouched = true;
    var plan = recommendation().plan;
    app.choosePlan(plan);
    var link = document.querySelector('[data-plan="' + plan + '"]');
    link.closest('.plan').scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'});
    link.focus({preventScroll: true});
    emit('recommended_plan_selected', {plan: plan});
  });
  $('copy-lead').addEventListener('click', async function () {
    var c = copy();
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText($('telegram-draft').value);
      $('telegram-copy-status').textContent = c.copied.replace('{contact}', contact());
    } catch (_) {
      $('telegram-draft').focus();
      if (typeof $('telegram-draft').select === 'function') $('telegram-draft').select();
      $('telegram-copy-status').textContent = c.manual;
    }
  });
  $('telegram-draft-link').addEventListener('click', function () {
    // Opening Telegram is not evidence that the visitor sent the message.
    emit('telegram_chat_opened', {plan: state().chosenPlan || 'undecided'});
  });
  $('lead-form').addEventListener('input', function () {
    if ($('telegram-lead')) $('telegram-lead').hidden = true;
    prepared = false;
  });
  document.addEventListener('zapysai:statechange', render);
  window.ZapysConversion = {prepareLead: prepareLead, describeSelection: describeSelection, refresh: render};
  render();
})();
