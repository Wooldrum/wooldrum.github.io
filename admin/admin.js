<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Admin — Woodrum</title>

  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'dark-bg': '#0a1020',
            'dark-panel': '#0d152b',
            'dark-line': '#22345b',
            'dark-text': '#e7efff',
            'dark-muted': '#9fb2de',
            'dark-accent': '#59a3ff',
          },
          borderRadius: { xl: '0.75rem', '2xl': '1rem' }
        }
      }
    }
  </script>
  <style>
    body{font-family:'IBM Plex Mono',monospace}
    .btn{padding:.5rem 1rem;border-radius:.75rem;border:1px solid #22345b;color:#9fb2de}
    .btn:hover{color:#e7efff;border-color:#59a3ff}
    .btn-accent{padding:.5rem 1rem;border-radius:.75rem;background:#59a3ff;color:#000;font-weight:600}
    .btn-accent:hover{opacity:.9}
    .input, .textarea{background:#0a1020;border:1px solid #22345b;color:#e7efff;border-radius:.75rem}
    .input:focus, .textarea:focus{outline:none;border-color:#59a3ff;box-shadow:0 0 0 3px rgba(89,163,255,.15)}
    .toolbar button{border:1px solid #22345b;border-radius:.5rem;padding:.25rem .5rem}
    .toolbar button:hover{border-color:#59a3ff}
    .tab-btn{border-bottom:2px solid transparent}
    .tab-btn.active{border-color:#59a3ff;color:#e7efff}
    .card{background:#0d152b;border:1px solid #22345b;border-radius:1rem}
    .preview a{text-decoration:underline}
    .image-tile{aspect-ratio:1/1;object-fit:cover;border-radius:.75rem;border:1px solid #22345b}

    /* drag & drop highlight */
    .drop-target.dragover{outline:2px dashed #59a3ff; background:rgba(89,163,255,.06)}
  </style>

  <!-- Markdown + sanitize (global) -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
</head>

<body class="bg-dark-bg text-dark-text min-h-screen">
  <!-- Header -->
  <header class="sticky top-0 z-10 bg-dark-panel border-b border-dark-line">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold">Woodrum Admin</h1>
        <nav class="hidden md:flex items-center gap-4">
          <button class="tab-btn text-dark-muted hover:text-dark-text active" data-tab="posts">Posts</button>
          <button class="tab-btn text-dark-muted hover:text-dark-text" data-tab="assets">Assets</button>
          <button class="tab-btn text-dark-muted hover:text-dark-text" data-tab="about">About</button>
        </nav>
      </div>
      <div class="flex items-center gap-2">
        <a href="/" class="btn">Home</a>
        <button id="loginBtn" class="btn hidden">Log in</button>
        <button id="logoutBtn" class="btn hidden">Log out</button>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-6">
    <!-- Tabs (mobile) -->
    <div class="md:hidden mb-4 flex gap-3">
      <button class="tab-btn active" data-tab="posts">Posts</button>
      <button class="tab-btn" data-tab="assets">Assets</button>
      <button class="tab-btn" data-tab="about">About</button>
    </div>

    <!-- POSTS TAB -->
    <section id="tab-posts" class="grid md:grid-cols-2 gap-6">
      <div class="space-y-6">
        <div class="card p-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold">Posts</h2>
            <button id="newPostBtn" class="btn-accent hidden">New Post</button>
          </div>
          <ul id="postsList" class="space-y-2 text-dark-muted"><li class="text-sm">Loading…</li></ul>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold mb-4">Editor</h2>

          <label class="block text-sm text-dark-muted mb-1">Title</label>
          <input id="title" class="input w-full px-3 py-2 mb-4" placeholder="Post title" />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-dark-muted mb-1">Date</label>
              <input id="date" type="datetime-local" class="input w-full px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm text-dark-muted mb-1">Image (uploads to assets/images/)</label>
              <input id="imgFile" type="file" accept="image/*" class="block w-full text-sm text-dark-muted" />
              <input id="imgPath" type="text" class="input w-full px-3 py-2 mt-2" placeholder="or paste /assets/images/… or URL" />
            </div>
          </div>

          <div class="toolbar flex flex-wrap gap-2 mt-4">
            <button data-cmd="bold">B</button>
            <button data-cmd="italic"><em>I</em></button>
            <button data-cmd="link">Link</button>
            <button data-cmd="highlight">Highlight</button>
            <span class="ml-2 text-dark-muted text-sm">Font:</span>
            <select id="fontSize" class="input px-2 py-1">
              <option value="normal">Normal</option>
              <option value="small">Small</option>
              <option value="large">Large</option>
              <option value="xlarge">XL</option>
            </select>
          </div>

          <label class="block text-sm text-dark-muted mt-4 mb-1">Body (Markdown)</label>
          <textarea id="body" rows="12" class="textarea w-full p-3 drop-target" placeholder="Write in Markdown… (you can also drag & drop images here)"></textarea>

          <div class="mt-4 flex gap-2">
            <button id="saveBtn" class="btn-accent hidden">Save</button>
            <button id="resetBtn" class="btn">Reset</button>
          </div>
        </div>
      </div>

      <aside class="card p-4 h-fit">
        <h2 class="text-lg font-semibold">Preview</h2>
        <div id="preview" class="preview prose prose-invert max-w-none mt-3 text-dark-muted"></div>
      </aside>
    </section>

    <!-- ASSETS TAB -->
    <section id="tab-assets" class="hidden space-y-6">
      <div class="card p-4">
        <h2 class="text-lg font-semibold mb-3">Upload image</h2>
        <input id="assetUpload" type="file" accept="image/*" class="block text-sm text-dark-muted" />
        <p class="text-xs text-dark-muted mt-2">Uploaded files land in <code>/assets/images/</code>. You can also drag & drop into the grid below.</p>
      </div>
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Images</h2>
          <button id="refreshAssets" class="btn">Refresh</button>
        </div>
        <div id="assetsGrid" class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 drop-target">
          <div class="text-sm text-dark-muted">Loading…</div>
        </div>
      </div>
    </section>

    <!-- ABOUT TAB -->
    <section id="tab-about" class="hidden grid md:grid-cols-2 gap-6">
      <div class="card p-4">
        <h2 class="text-lg font-semibold">About content</h2>
        <p class="text-sm text-dark-muted mb-3">Editing <code>/assets/content/about.md</code>. You can use Markdown and drag & drop images.</p>

        <div class="toolbar flex flex-wrap gap-2">
          <button data-cmd="about-bold" class="">B</button>
          <button data-cmd="about-italic"><em>I</em></button>
          <button data-cmd="about-link">Link</button>
          <button data-cmd="about-highlight">Highlight</button>
        </div>

        <textarea id="aboutBody" rows="16" class="textarea w-full p-3 mt-3 drop-target" placeholder="Write your About in Markdown…"></textarea>

        <div class="mt-4 flex gap-2">
          <button id="saveAboutBtn" class="btn-accent hidden">Save About</button>
          <button id="resetAboutBtn" class="btn">Reset</button>
        </div>
      </div>

      <aside class="card p-4 h-fit">
        <h2 class="text-lg font-semibold">About Preview</h2>
        <div id="aboutPreview" class="preview prose prose-invert max-w-none mt-3 text-dark-muted"></div>
      </aside>
    </section>
  </main>

  <script defer src="./admin.js"></script>
</body>
</html>
