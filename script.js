$(function() {
  
  let excusesData = null;
  let dataLoaded = false;

  const $select = $('#situationSelect');
  const $generateBtn = $('#generateBtn');
  const $resetBtn = $('#resetBtn');
  const $excusesContainer = $('#excusesContainer');
  const $themeToggle = $('#themeToggle');

  function updateButtonsState() {
    const isSelected = $select.val() && $select.val() !== "";
    const enabled = dataLoaded && isSelected;
    $generateBtn.prop('disabled', !enabled);
    $resetBtn.prop('disabled', !enabled);
  }

  function renderExcuses(excusesArray) {
    if (!excusesArray || excusesArray.length === 0) {
      $excusesContainer.html('<div class="placeholder-message">😕 Не удалось подобрать отмазки, попробуйте ещё раз</div>');
      return;
    }

    const sorted = [...excusesArray].sort((a,b) => b.rating - a.rating);
    const html = sorted.map(excuse => {

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
    
    $excusesContainer.find('.copy-btn').off('click').on('click', function(e) {
      const $card = $(this).closest('.excuse-card');
      const textToCopy = $card.data('excuse-text');
      copyToClipboard(textToCopy, $(this));
    });
  }

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
        // fallback
        selectedExcuses.push({
          text: `Отмазка с рейтингом ${rating} (нет данных)`,
          rating: rating
        });
      }
    }

    for (let i = selectedExcuses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedExcuses[i], selectedExcuses[j]] = [selectedExcuses[j], selectedExcuses[i]];
    }
    renderExcuses(selectedExcuses);
  }

  function resetAll() {
    $select.val('');
    $excusesContainer.html('<div class="placeholder-message">✨ Выберите ситуацию и нажмите «Подобрать отмазку»</div>');
    updateButtonsState();
  }

  function loadExcusesData() {
    $excusesContainer.html('<div class="placeholder-message">📡 Загрузка архива отмазок...</div>');
    $.getJSON('data.json')
      .done(function(data) {
        excusesData = data;
        dataLoaded = true;
        updateButtonsState();
        $excusesContainer.html('<div class="placeholder-message">✅ База загружена! Выберите ситуацию.</div>');
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Ошибка загрузки JSON:', textStatus, errorThrown);
        $excusesContainer.html('<div class="placeholder-message">⚠️ Ошибка загрузки данных. Проверьте файл data.json или перезагрузите страницу.</div>');
        dataLoaded = false;
        updateButtonsState();
      });
  }

  function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    $('body').removeClass('dark-theme').addClass('light-theme');
    $('#themeToggle i').removeClass('fa-moon').addClass('fa-sun');
  } else {
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
    const newVal = $select.val();
    if (newVal && newVal !== "") {
      $excusesContainer.html('<div class="placeholder-message">🔁 Ситуация изменена. Нажмите «Подобрать отмазку».</div>');
    } else {
      $excusesContainer.html('<div class="placeholder-message">✨ Выберите ситуацию и нажмите «Подобрать отмазку»</div>');
    }
  });

  $themeToggle.on('click', toggleTheme);

  initTheme();
  loadExcusesData();
  updateButtonsState();
});