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

// Latest Bluesky posts (fetched client-side from Bluesky's public read-only API)
(function () {
  var feed = document.getElementById('bsky-feed');
  if (!feed) return;

  var HANDLE = 'grexor.bsky.social';
  var API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=' + HANDLE + '&limit=4&filter=posts_no_replies';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function timeAgo(iso) {
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    var units = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
    for (var i = 0; i < units.length; i++) {
      var v = Math.floor(diff / units[i][0]);
      if (v >= 1) return v + units[i][1] + ' ago';
    }
    return 'just now';
  }

  function postUrl(uri, handle) {
    return 'https://bsky.app/profile/' + handle + '/post/' + uri.split('/').pop();
  }

  function renderError(err) {
    if (err) console.error('Bluesky feed:', err);
    feed.innerHTML =
      '<a class="bsky-card bsky-error" href="https://bsky.app/profile/' + HANDLE + '" target="_blank">' +
      'Couldn&rsquo;t load latest posts &mdash; view profile on Bluesky &rarr;</a>';
  }

  function renderPosts(posts) {
    feed.innerHTML = posts.map(function (post) {
      var text = escapeHtml((post.record && post.record.text) || '');
      if (text.length > 160) text = text.slice(0, 160).trim() + '&hellip;';

      var img = '';
      if (post.embed && post.embed.images && post.embed.images.length) {
        img = '<img class="bsky-img" src="' + post.embed.images[0].thumb + '" alt="' + escapeHtml(post.embed.images[0].alt || '') + '">';
      }

      return '' +
        '<a class="bsky-card" href="' + postUrl(post.uri, post.author.handle) + '" target="_blank" rel="noopener">' +
          '<div class="bsky-head">' +
            '<img class="bsky-avatar" src="' + post.author.avatar + '" alt="">' +
            '<div>' +
              '<div class="bsky-name">' + escapeHtml(post.author.displayName || post.author.handle) + '</div>' +
              '<div class="bsky-handle">@' + escapeHtml(post.author.handle) + '</div>' +
            '</div>' +
            '<div class="bsky-date">' + timeAgo(post.indexedAt) + '</div>' +
          '</div>' +
          '<div class="bsky-text">' + text + '</div>' +
          img +
        '</a>';
    }).join('');
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
        var posts = (data.feed || []).slice(0, 2).map(function (item) { return item.post; });
        if (!posts.length) throw new Error('no posts');
        settled = true;
        renderPosts(posts);
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
