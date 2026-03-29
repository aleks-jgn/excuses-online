$(function() {
  // ---------- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ----------
  let excusesData = null;        // загруженный JSON
  let dataLoaded = false;

  // DOM элементы
  const $select = $('#situationSelect');
  const $generateBtn = $('#generateBtn');
  const $resetBtn = $('#resetBtn');
  const $excusesContainer = $('#excusesContainer');
  const $themeToggle = $('#themeToggle');

  // ---------- HELPER: активность кнопок в зависимости от выбора ----------
  function updateButtonsState() {
    const isSelected = $select.val() && $select.val() !== "";
    const enabled = dataLoaded && isSelected;
    $generateBtn.prop('disabled', !enabled);
    $resetBtn.prop('disabled', !enabled);
  }

  // ---------- ОТОБРАЖЕНИЕ ОТМАЗОК (массив из 5 объектов {text, rating}) ----------
  function renderExcuses(excusesArray) {
    if (!excusesArray || excusesArray.length === 0) {
      $excusesContainer.html('<div class="placeholder-message">😕 Не удалось подобрать отмазки, попробуйте ещё раз</div>');
      return;
    }
    // сортируем по рейтингу (от 5 до 1) для красоты
    const sorted = [...excusesArray].sort((a,b) => b.rating - a.rating);
    const html = sorted.map(excuse => {
      // звёздочки для рейтинга
      let stars = '';
      for (let i = 1; i <= 5; i++) {
        stars += i <= excuse.rating ? '<i class="fas fa-star star-filled"></i>' : '<i class="far fa-star"></i>';
      }
      return `
        <div class="excuse-card" data-excuse-text="${escapeHtml(excuse.text)}">
          <div class="excuse-content">
            <div class="excuse-text">${escapeHtml(excuse.text)}</div>
            <div class="excuse-rating">
              <span>Правдоподобность:</span> 
              <span class="rating-stars">${stars}</span> 
              <span>(${excuse.rating}/5)</span>
            </div>
          </div>
          <button class="copy-btn"><i class="far fa-copy"></i> Скопировать и отправить</button>
        </div>
      `;
    }).join('');
    $excusesContainer.html(html);
    
    // вешаем обработчики на кнопки копирования (делегирование)
    $excusesContainer.find('.copy-btn').off('click').on('click', function(e) {
      const $card = $(this).closest('.excuse-card');
      const textToCopy = $card.data('excuse-text');
      copyToClipboard(textToCopy, $(this));
    });
  }

  // вспомогательная функция для безопасного экранирования
  function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
      return c;
    });
  }

  // копирование в буфер + визуальный фидбек
  function copyToClipboard(text, $btn) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHtml = $btn.html();
      $btn.html('<i class="fas fa-check"></i> Скопировано!');
      setTimeout(() => {
        $btn.html(originalHtml);
      }, 1800);
    }).catch(() => {
      alert('Не удалось скопировать текст. Попробуйте вручную.');
    });
  }

  // ---------- ГЕНЕРАЦИЯ 5 ОТМАЗОК ДЛЯ ВЫБРАННОЙ СИТУАЦИИ ----------
  function generateExcuses() {
    if (!dataLoaded) {
      $excusesContainer.html('<div class="placeholder-message">⏳ Загрузка базы отмазок, секунду...</div>');
      return;
    }
    const situation = $select.val();
    if (!situation || situation === "") {
      return;
    }
    const situationObj = excusesData[situation];
    if (!situationObj) {
      $excusesContainer.html('<div class="placeholder-message">❌ Ошибка: данные для этой ситуации не найдены</div>');
      return;
    }
    
    // для каждой оценки от 1 до 5 выбираем случайную отмазку из 5 доступных
    const selectedExcuses = [];
    for (let rating = 1; rating <= 5; rating++) {
      const ratingKey = rating.toString(); // "1","2"...
      const pool = situationObj[ratingKey];
      if (pool && Array.isArray(pool) && pool.length) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        selectedExcuses.push({
          text: pool[randomIndex],
          rating: rating
        });
      } else {
        // fallback (на случай кривого JSON)
        selectedExcuses.push({
          text: `Отмазка с рейтингом ${rating} (нет данных)`,
          rating: rating
        });
      }
    }
    // перемешиваем порядок вывода, чтобы не всегда 5-4-3-2-1 по порядку? Требование: "в случайном порядке из уже сохраненных", но показать 5 штук с разными рейтингами. 
    // Но можно оставить как есть, однако для "случайного порядка" перемешаем массив перед отрисовкой
    for (let i = selectedExcuses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedExcuses[i], selectedExcuses[j]] = [selectedExcuses[j], selectedExcuses[i]];
    }
    renderExcuses(selectedExcuses);
  }

  // ---------- СБРОС ВСЕГО ----------
  function resetAll() {
    $select.val(''); // сброс на пустой (первый option disabled)
    $excusesContainer.html('<div class="placeholder-message">✨ Выберите ситуацию и нажмите «Подобрать отмазку»</div>');
    updateButtonsState(); // отключает кнопки, т.к. select пустой
  }

  // ---------- ЗАГРУЗКА JSON ----------
  function loadExcusesData() {
    // показываем плейсхолдер загрузки
    $excusesContainer.html('<div class="placeholder-message">📡 Загрузка архива отмазок...</div>');
    $.getJSON('data.json')
      .done(function(data) {
        excusesData = data;
        dataLoaded = true;
        // обновляем состояние кнопок после загрузки
        updateButtonsState();
        // если select не пуст, но кнопки активны, пользователь может жать
        $excusesContainer.html('<div class="placeholder-message">✅ База загружена! Выберите ситуацию.</div>');
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Ошибка загрузки JSON:', textStatus, errorThrown);
        $excusesContainer.html('<div class="placeholder-message">⚠️ Ошибка загрузки данных. Проверьте файл data.json или перезагрузите страницу.</div>');
        dataLoaded = false;
        updateButtonsState();
      });
  }

  // ---------- ПЕРЕКЛЮЧЕНИЕ ТЕМЫ (тёмная/светлая) ----------
  function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    $('body').removeClass('dark-theme').addClass('light-theme');
    $('#themeToggle i').removeClass('fa-moon').addClass('fa-sun');
  } else {
    // по умолчанию (нет сохранённой темы или сохранена 'dark') – тёмная
    $('body').removeClass('light-theme').addClass('dark-theme');
    $('#themeToggle i').removeClass('fa-sun').addClass('fa-moon');
    if (!savedTheme) localStorage.setItem('theme', 'dark');
  }
  }

  function toggleTheme() {
    const $body = $('body');
    if ($body.hasClass('dark-theme')) {
      $body.removeClass('dark-theme').addClass('light-theme');
      $('#themeToggle i').removeClass('fa-moon').addClass('fa-sun');
      localStorage.setItem('theme', 'light');
    } else {
      $body.removeClass('light-theme').addClass('dark-theme');
      $('#themeToggle i').removeClass('fa-sun').addClass('fa-moon');
      localStorage.setItem('theme', 'dark');
    }
  }

  // ---------- СОБЫТИЯ ----------
  $generateBtn.on('click', function(e) {
    e.preventDefault();
    if (!dataLoaded || !$select.val() || $select.val() === "") return;
    generateExcuses();
  });

  $resetBtn.on('click', function(e) {
    e.preventDefault();
    resetAll();
  });

  $select.on('change', function() {
    updateButtonsState();
    // (опционально можно очищать отмазки при смене ситуации, но по тз не обязательно,
    // однако чтобы не сбивать с толку — очистим контейнер? Некоторые юзеры ожидают, что при смене ситуации старые отмазки пропадут.
    // По условию: "контейнер с уже показанными отмазками очищается и показываются другие" — это происходит при нажатии кнопки. 
    // Но для лучшего UX сделаем мягкую очистку, иначе пользователь видит отмазки от предыдущей ситуации. Почистим без анимации, но оставим placeholder.
    // Поскольку при повторном нажатии "Подобрать отмазку" всё равно очищается, а смена select без нажатия кнопки — отмазки не обновляются,
    // но чтобы не вводить в заблуждение, очистим, когда меняется выбранная опция (кроме случаев, когда новое значение пустое).
    const newVal = $select.val();
    if (newVal && newVal !== "") {
      // если меняем на другую ситуацию — старые отмазки убираем (чистый UX)
      $excusesContainer.html('<div class="placeholder-message">🔁 Ситуация изменена. Нажмите «Подобрать отмазку».</div>');
    } else {
      $excusesContainer.html('<div class="placeholder-message">✨ Выберите ситуацию и нажмите «Подобрать отмазку»</div>');
    }
  });

  $themeToggle.on('click', toggleTheme);

  // ---------- СТАРТ ПРИЛОЖЕНИЯ ----------
  initTheme();
  loadExcusesData();
  // начальное состояние кнопок (выключены)
  updateButtonsState();
});