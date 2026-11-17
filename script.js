(function () {
  'use strict';

  var KEY = 'masrofi.expenses.v1';

  var form = document.getElementById('form');
  var amountEl = document.getElementById('amount');
  var itemEl = document.getElementById('item');
  var dateEl = document.getElementById('date');
  var errorEl = document.getElementById('error');
  var listEl = document.getElementById('list');
  var emptyEl = document.getElementById('empty');
  var totalEl = document.getElementById('total');
  var countEl = document.getElementById('count');

  var money = new Intl.NumberFormat('ar-SA-u-nu-latn', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var dateFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  var expenses = load();

  /* ---------- التخزين ---------- */

  function isValid(e) {
    return e && typeof e.id === 'string' && typeof e.item === 'string' &&
      typeof e.date === 'string' && isFinite(e.amount);
  }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(raw) ? raw.filter(isValid) : [];
    } catch (err) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(expenses));
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ---------- أدوات ---------- */

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // يقبل الأرقام العربية (٠-٩) والفاصلة العربية
  function parseAmount(text) {
    var s = text.trim()
      .replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 1632; })
      .replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 1776; })
      .replace(/[٫،,]/g, '.');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
    return Number(s);
  }

  function showDate(iso) {
    var p = iso.split('-').map(Number);
    if (p.length !== 3 || p.some(isNaN)) return iso;
    return dateFmt.format(new Date(p[0], p[1] - 1, p[2]));
  }

  function showError(msg, field) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    [amountEl, itemEl, dateEl].forEach(function (el) { el.classList.remove('invalid'); });
    if (field) { field.classList.add('invalid'); field.focus(); }
  }

  function clearError() {
    errorEl.hidden = true;
    [amountEl, itemEl, dateEl].forEach(function (el) { el.classList.remove('invalid'); });
  }

  /* ---------- العرض ---------- */

  function render() {
    // المجموع بالهللات لتجنب أخطاء الكسور العشرية
    var cents = expenses.reduce(function (sum, e) {
      return sum + Math.round(e.amount * 100);
    }, 0);
    totalEl.textContent = money.format(cents / 100) + ' ر.س';

    var n = expenses.length;
    countEl.textContent = n === 0 ? '' : (n === 1 ? 'مصروف واحد' : n + ' مصروفات');

    var sorted = expenses.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });

    listEl.textContent = '';
    sorted.forEach(function (e) {
      var li = document.createElement('li');
      li.className = 'row';

      var info = document.createElement('div');
      info.className = 'info';
      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = e.item;
      var date = document.createElement('span');
      date.className = 'date';
      date.textContent = showDate(e.date);
      info.appendChild(name);
      info.appendChild(date);

      var amount = document.createElement('span');
      amount.className = 'amount';
      amount.textContent = money.format(e.amount) + ' ر.س';

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'del';
      del.textContent = '🗑';
      del.setAttribute('aria-label', 'حذف مصروف ' + e.item);
      del.addEventListener('click', function () { remove(e.id); });

      li.appendChild(info);
      li.appendChild(amount);
      li.appendChild(del);
      listEl.appendChild(li);
    });

    emptyEl.hidden = n !== 0;
  }

  /* ---------- الإجراءات ---------- */

  function add(ev) {
    ev.preventDefault();

    var amount = parseAmount(amountEl.value);
    var item = itemEl.value.trim();
    var date = dateEl.value;

    if (!isFinite(amount) || amount <= 0) {
      return showError('أدخل مبلغًا صحيحًا أكبر من صفر، مثل 25 أو 25.50', amountEl);
    }
    if (!item) {
      return showError('اكتب بند المصروف، مثل «غداء».', itemEl);
    }
    if (!date) {
      return showError('اختر تاريخ المصروف.', dateEl);
    }

    clearError();
    expenses.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      amount: amount,
      item: item,
      date: date
    });

    if (!save()) {
      showError('تعذّر حفظ البيانات على هذا المتصفح. قد لا تبقى المصروفات بعد الإغلاق.');
    }

    amountEl.value = '';
    itemEl.value = '';
    render();
    amountEl.focus();
  }

  function remove(id) {
    var e = expenses.find(function (x) { return x.id === id; });
    if (!e || !window.confirm('حذف «' + e.item + '»؟')) return;
    expenses = expenses.filter(function (x) { return x.id !== id; });
    save();
    render();
  }

  /* ---------- التشغيل ---------- */

  dateEl.value = todayISO();
  form.addEventListener('submit', add);
  [amountEl, itemEl, dateEl].forEach(function (el) {
    el.addEventListener('input', clearError);
  });
  render();

  // العمل دون إنترنت بعد أول فتح
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
