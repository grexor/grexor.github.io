// Concept A — shared behaviour for every page under /A

// Image lightbox (click any .blog-img to enlarge)
(function () {
  var lb = document.getElementById('lightbox');
  if (!lb) return;
  var lbImg = document.getElementById('lightbox-img');

  document.querySelectorAll('img.blog-img').forEach(function (img) {
    img.addEventListener('click', function () {
      lbImg.src = img.src;
      lb.classList.add('open');
    });
  });

  function close() { lb.classList.remove('open'); lbImg.src = ''; }
  lb.addEventListener('click', close);
  var closeBtn = document.getElementById('lightbox-close');
  if (closeBtn) closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();

// Copy-to-clipboard button on code blocks
document.querySelectorAll('.copy-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var code = btn.nextElementSibling.innerText;
    navigator.clipboard.writeText(code).then(function () {
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
    });
  });
});

// Latest Bluesky posts — find the latest original posts via Bluesky's
// public read-only API, then render them with Bluesky's own official
// embed widget (https://embed.bsky.app), visually scaled down 10% (see
// .bsky-grid iframe in style.css). That transform shrinks the rendering
// only, not the box it's allotted, so the widget's own resize messages
// (which report its *real*, unscaled content height) are intercepted
// here and applied — already scaled — to the wrapper, instead of letting
// the embed script apply them to the iframe at full size.
(function () {
  var feed = document.getElementById('bsky-feed');
  if (!feed) return;

  var HANDLE = 'grexor.bsky.social';
  var API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=' + HANDLE + '&limit=15&filter=posts_no_replies';
  var EMBED_SCRIPT = 'https://embed.bsky.app/static/embed.js';
  var EMBED_ORIGIN = 'https://embed.bsky.app';
  var SCALE = 0.9;

  function renderError(err) {
    if (err) console.error('Bluesky feed:', err);
    feed.innerHTML =
      '<a class="bsky-error" href="https://bsky.app/profile/' + HANDLE + '" target="_blank">' +
      'Couldn&rsquo;t load latest posts &mdash; view profile on Bluesky &rarr;</a>';
  }

  function loadEmbedScript(cb) {
    if (window.bluesky && typeof window.bluesky.scan === 'function') { cb(); return; }
    var s = document.createElement('script');
    s.src = EMBED_SCRIPT;
    s.async = true;
    s.onload = cb;
    s.onerror = function () { renderError('embed.js failed to load'); };
    document.body.appendChild(s);
  }

  // Bluesky's embed.js listens for the same message and sets the
  // iframe's own (unscaled) height; this mirrors the scaled height onto
  // the surrounding card so there's no blank space below the shrunk post.
  window.addEventListener('message', function (event) {
    if (event.origin !== EMBED_ORIGIN || !event.data || !event.data.id || !event.data.height) return;
    var iframe = feed.querySelector('[data-bluesky-id="' + event.data.id + '"]');
    var wrap = iframe && iframe.closest('.bluesky-embed');
    if (wrap) wrap.style.height = (event.data.height * SCALE) + 'px';
  });

  function renderPosts(uris) {
    feed.innerHTML = uris.map(function (uri) {
      return '<div data-bluesky-uri="' + uri + '"></div>';
    }).join('');
    loadEmbedScript(function () { window.bluesky.scan(feed); });
  }

  // Belt-and-suspenders timeout: if the request hangs (blocked by an
  // extension, offline, etc.) without ever resolving or rejecting,
  // don't leave the "Loading..." placeholders stuck forever.
  var settled = false;
  setTimeout(function () { if (!settled) renderError('timed out'); }, 8000);

  try {
    fetch(API)
      .then(function (r) {
        if (!r.ok) throw new Error('bad response: ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var uris = (data.feed || [])
          .filter(function (item) { return !item.reason; }) // drop reposts
          .slice(0, 3)
          .map(function (item) { return item.post.uri; });
        if (!uris.length) throw new Error('no posts');
        settled = true;
        renderPosts(uris);
      })
      .catch(function (err) {
        settled = true;
        renderError(err);
      });
  } catch (err) {
    settled = true;
    renderError(err);
  }
})();
