(function () {
  'use strict';

  /* ─── Norwegian date formatting ──────────────────────────────── */
  var NO_MONTHS = [
    'januar', 'februar', 'mars', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'desember'
  ];

  document.querySelectorAll('[data-date]').forEach(function (el) {
    var d = new Date(el.dataset.date);
    if (!isNaN(d.getTime())) {
      el.textContent = NO_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    }
  });

  /* ─── Active nav state ───────────────────────────────────────── */
  var currentPath = window.location.pathname;
  var isTagPage   = currentPath.indexOf('/tag/') !== -1;

  document.querySelectorAll('.site-nav a').forEach(function (link) {
    try {
      var linkPath = new URL(link.href, document.baseURI).pathname;
      var isActive = false;

      if (isTagPage) {
        // On tag pages, activate the link with data-nav-search attribute
        isActive = link.hasAttribute('data-nav-search');
      } else {
        isActive = (linkPath === currentPath) ||
                   (linkPath !== '/' && currentPath.indexOf(linkPath) === 0);
      }

      if (isActive) link.classList.add('active');
    } catch (e) { /* ignore invalid href */ }
  });

  /* ─── Newsletter subscribed success ─────────────────────────── */
  if (window.location.search.indexOf('subscribed=1') !== -1) {
    var form = document.querySelector('.newsletter-form');
    if (form) {
      var success = document.createElement('p');
      success.className = 'newsletter-success';
      success.textContent = 'Takk! Du vil høre fra meg når det er noe nytt å lese.';
      form.parentNode.replaceChild(success, form);
    }
    history.replaceState({}, '', window.location.pathname);
  }

  /* ─── Search (search page + tags index page) ────────────────── */
  var searchField   = document.getElementById('search-field');
  var searchResults = document.getElementById('search-results');
  var searchState   = document.getElementById('search-state');
  var tagsSection   = document.getElementById('tags-section');

  if (searchField) {
    var searchIndex = null;

    function loadSearchIndex() {
      if (searchIndex) return Promise.resolve(searchIndex);
      return fetch('/search-index.json')
        .then(function (res) {
          if (!res.ok) throw new Error('search-index.json not found');
          return res.json();
        })
        .then(function (data) {
          searchIndex = data;
          return data;
        });
    }

    function renderSearchItem(post) {
      var li = document.createElement('li');
      li.className = 'post-list-item';

      var metaHtml = '';
      if (post.date) {
        var d = new Date(post.date);
        var dateStr = !isNaN(d.getTime())
          ? NO_MONTHS[d.getMonth()] + ' ' + d.getFullYear()
          : post.date;
        metaHtml = '<div class="post-meta"><span>' + dateStr + '</span></div>';
      }

      var excerptHtml = '';
      if (post.excerpt) {
        excerptHtml = '<p class="post-list-excerpt">' + escapeHtml(post.excerpt) + '</p>';
      }

      li.innerHTML =
        metaHtml +
        '<h2 class="post-list-title"><a href="' + escapeHtml(post.url) + '">' +
          escapeHtml(post.title) +
        '</a></h2>' +
        excerptHtml +
        '<a href="' + escapeHtml(post.url) + '" class="post-list-read">' +
          'Les videre <span class="arrow">&rarr;</span>' +
        '</a>';

      return li;
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function showContent() { if (tagsSection) tagsSection.style.display = ''; }
    function hideContent() { if (tagsSection) tagsSection.style.display = 'none'; }
    function clearResults() { if (searchResults) searchResults.innerHTML = ''; }

    searchField.addEventListener('input', function () {
      var q = searchField.value.trim().toLowerCase();

      if (!q) {
        clearResults();
        if (searchState) searchState.style.display = 'none';
        showContent();
        return;
      }

      hideContent();

      loadSearchIndex()
        .then(function (index) {
          var matches = index.filter(function (p) {
            return (
              (p.title  || '').toLowerCase().indexOf(q) !== -1 ||
              (p.excerpt || p.text || '').toLowerCase().indexOf(q) !== -1 ||
              (p.tags || []).some(function (t) {
                return t.toLowerCase().indexOf(q) !== -1;
              })
            );
          });

          clearResults();

          if (matches.length === 0) {
            if (searchState) {
              searchState.textContent = 'Ingen tekster matchet «' + searchField.value.trim() + '».';
              searchState.style.display = 'block';
            }
          } else {
            if (searchState) searchState.style.display = 'none';
            matches.forEach(function (post) {
              searchResults.appendChild(renderSearchItem(post));
            });
          }
        })
        .catch(function () {
          if (searchState) {
            searchState.textContent = 'Søk er ikke tilgjengelig akkurat nå.';
            searchState.style.display = 'block';
          }
        });
    });

    // Auto-focus only on the dedicated search page (not tag pages)
    if (tagsSection) searchField.focus();
  }

  /* ─── Tag grid cleanup ───────────────────────────────────────── */
  var tagsGrid = document.querySelector('.tags-grid');
  if (tagsGrid) {
    // Remove language tags (shown as prominent quick-links above)
    tagsGrid.querySelectorAll('.tag-grid-item[data-slug="in-english"], .tag-grid-item[data-slug="pa-norsk"]')
      .forEach(function (el) { el.remove(); });

    // Handle solo last item if total is odd
    var items = tagsGrid.querySelectorAll('.tag-grid-item');
    items.forEach(function (el) { el.classList.remove('tag-grid-solo'); });
    if (items.length % 2 !== 0 && items.length > 0) {
      items[items.length - 1].classList.add('tag-grid-solo');
    }
  }

}());
