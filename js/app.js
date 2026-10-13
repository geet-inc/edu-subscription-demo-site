/* =========================================================
   まなびノート（仮） デモアプリ
   - ハッシュルーティングの SPA（ビルド不要）
   - ログイン・契約・視聴進捗はすべて localStorage のモック
   - 本番ではここを 認証基盤 / Stripe / DB に置き換える
   ========================================================= */
(() => {
  const { SUBJECTS, GRADES, VIDEOS, PLANS, TRIAL_DAYS, MAX_CHILDREN } = window.DEMO_DATA;
  const KEY = 'manabi-demo-v1';
  const CHILD_COLORS = ['#2f6fb0', '#c8553d', '#3a8a5c'];
  const DAY = 86400000;

  // ---------- utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yen = (n) => `${n.toLocaleString('ja-JP')}円`;
  const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };
  const fmtShort = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const daysLeft = (t) => Math.max(0, Math.ceil((t - Date.now()) / DAY));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const subj = (k) => SUBJECTS.find((s) => s.key === k);
  const grade = (k) => GRADES.find((g) => g.key === k);
  const plan = (k) => PLANS.find((p) => p.key === k);
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

  // ---------- state ----------
  const blank = () => ({
    user: null,
    sub: { status: 'none', plan: null, startedAt: null, renewAt: null, card: null, trialUsed: false },
    children: [],
    activeChildId: null,
    progress: {},
    customVideos: [],
    invoices: [],
  });

  let state = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return { ...blank(), ...JSON.parse(raw) }; } catch (e) { /* private mode */ }
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }

  const ui = { filters: { grade: null, subject: 'all', q: '' }, filterChild: null, player: null, adminQuery: '' };

  const allVideos = () => [...VIDEOS, ...state.customVideos];
  const video = (id) => allVideos().find((v) => v.id === id);
  const activeChild = () => state.children.find((c) => c.id === state.activeChildId) || null;
  const hasAccess = () => ['trial', 'active', 'canceled'].includes(state.sub.status);
  const canWatch = (v) => v.free || (state.user && hasAccess());
  const prog = (childId, vid) => (state.progress[childId] || {})[vid] || null;

  function setProgress(vid, pct, done = false) {
    const c = activeChild();
    if (!c) return;
    const cur = prog(c.id, vid) || { pct: 0, done: false };
    state.progress[c.id] = state.progress[c.id] || {};
    state.progress[c.id][vid] = { pct: Math.max(cur.pct, pct), done: cur.done || done || pct >= 0.95, updatedAt: Date.now() };
    save();
  }

  // ---------- demo presets ----------
  function seedAccount() {
    const now = Date.now();
    state.user = { name: '山田 花子', email: 'demo@example.com' };
    state.children = [
      { id: 'c1', name: 'ゆうと', grade: 'e4', color: CHILD_COLORS[0] },
      { id: 'c2', name: 'さくら', grade: 'j1', color: CHILD_COLORS[1] },
    ];
    state.activeChildId = null;
    state.progress = {
      c1: {
        v08: { pct: 1, done: true, updatedAt: now - 1000 * 60 * 40 },
        v09: { pct: 0.45, done: false, updatedAt: now - 1000 * 60 * 20 },
        v10: { pct: 1, done: true, updatedAt: now - DAY },
        v07: { pct: 1, done: true, updatedAt: now - DAY * 2 },
        v06: { pct: 0.3, done: false, updatedAt: now - DAY * 2 },
        v05: { pct: 1, done: true, updatedAt: now - DAY * 3 },
      },
      c2: {
        v17: { pct: 1, done: true, updatedAt: now - DAY },
        v18: { pct: 0.3, done: false, updatedAt: now - DAY },
      },
    };
  }

  const PRESETS = {
    guest: '未ログイン',
    nosub: 'ログイン済み・未契約',
    trial: '無料体験中',
    active: '有料契約中',
    canceled: '解約予約中',
    expired: '契約終了',
  };

  function applyPreset(key) {
    const keepVideos = state.customVideos;
    state = blank();
    state.customVideos = keepVideos;
    const now = Date.now();
    if (key !== 'guest') seedAccount();
    if (key === 'trial') state.sub = { status: 'trial', plan: 'monthly', startedAt: now - DAY * 2, renewAt: now + DAY * 5, card: '4242', trialUsed: true };
    if (key === 'active' || key === 'canceled') {
      state.sub = { status: key, plan: 'yearly', startedAt: now - DAY * 120, renewAt: now + DAY * 245, card: '4242', trialUsed: true };
      state.invoices = [{ id: 'in_' + uid(), date: now - DAY * 113, label: '年額プラン', amount: 19800 }];
    }
    if (key === 'expired') {
      state.sub = { status: 'expired', plan: 'monthly', startedAt: now - DAY * 60, renewAt: now - DAY * 3, card: '4242', trialUsed: true };
      state.invoices = [{ id: 'in_' + uid(), date: now - DAY * 33, label: '月額プラン', amount: 1980 }];
    }
    save();
  }

  function currentPreset() {
    if (!state.user) return 'guest';
    return state.sub.status === 'none' ? 'nosub' : state.sub.status;
  }

  // ---------- router ----------
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    return { parts: (path || '').split('/').filter(Boolean), query: new URLSearchParams(qs || '') };
  }
  const go = (path) => { location.hash = '#/' + path; };

  function requireLogin(next) {
    if (!state.user) { go('login?next=' + encodeURIComponent(next)); return false; }
    return true;
  }

  const routes = {
    '': viewHome,
    login: viewLogin,
    signup: viewSignup,
    plans: viewPlans,
    checkout: viewCheckout,
    welcome: viewWelcome,
    profiles: viewProfiles,
    library: viewLibrary,
    watch: viewWatch,
    progress: viewProgress,
    account: viewAccount,
    admin: viewAdmin,
    legal: viewLegal,
  };

  function render() {
    const { parts, query } = parseHash();
    const name = parts[0] || '';
    const view = routes[name] || viewNotFound;
    ui.player = null;
    renderChrome(name);
    const html = view(parts, query);
    if (html === false) return; // redirected
    $('#app').innerHTML = html;
    afterRender(name, parts, query);
    const s = query.get('s');
    if (s && document.getElementById(s)) document.getElementById(s).scrollIntoView();
    else window.scrollTo(0, 0);
  }

  // ---------- chrome ----------
  function renderChrome(route) {
    const cur = currentPreset();
    $('#demo-bar').innerHTML = `
      <div class="demo-bar"><div class="demo-bar__inner">
        <span class="demo-bar__label">DEMO</span>
        <label>状態を切り替え：
          <select data-change="preset" aria-label="デモの状態を切り替え">
            ${Object.entries(PRESETS).map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <button type="button" data-action="reset">初期化</button>
        <span>決済は動作しません（本番は Stripe に接続）</span>
        <nav class="demo-bar__links" aria-label="デモ用リンク">
          <a href="#/">サイトトップ</a>
          <a href="#/admin">管理画面</a>
        </nav>
      </div></div>`;

    const link = (href, label, key) => `<a href="#/${href}" ${route === key ? 'aria-current="page"' : ''}>${label}</a>`;
    let nav;
    if (state.user) {
      const c = activeChild();
      nav = `
        ${link('library', '教材をさがす', 'library')}
        ${link('progress', '学習記録', 'progress')}
        ${link('account', 'アカウント', 'account')}
        <a class="child-chip" href="#/profiles" aria-label="学習する子どもを切り替え">
          ${c ? `<span class="avatar" style="background:${c.color}">${esc(c.name.slice(0, 1))}</span>${esc(c.name)}` : '<span class="avatar" style="background:var(--color-ink-sub)">?</span>子どもを選ぶ'}
        </a>`;
    } else {
      nav = `
        <a href="#/?s=lineup">教材ラインナップ</a>
        <a href="#/?s=price">料金</a>
        <a href="#/?s=faq">よくある質問</a>
        ${link('login', 'ログイン', 'login')}
        <a class="btn btn--primary" href="#/signup">7日間無料で始める</a>`;
    }
    $('#header').innerHTML = `
      <div class="container site-header__inner">
        <a class="logo" href="#/${state.user ? 'library' : ''}"><span class="logo__mark" aria-hidden="true"></span>まなびノート<small>（仮）</small></a>
        <button class="nav__toggle" type="button" data-action="toggle-nav" aria-expanded="false" aria-controls="gnav">メニュー</button>
        <nav class="nav" id="gnav" aria-label="グローバル">${nav}</nav>
      </div>`;

    $('#footer').innerHTML = `
      <div class="container site-footer__inner">
        <nav aria-label="フッター">
          <a href="#/legal/tokushoho">特定商取引法に基づく表記</a>
          <a href="#/legal/terms">利用規約</a>
          <a href="#/legal/privacy">プライバシーポリシー</a>
          <a href="#/?s=faq">よくある質問</a>
        </nav>
        <small>© まなびノート（仮） ― デモ版</small>
      </div>`;
  }

  // ---------- shared parts ----------
  const seal = (k) => { const s = subj(k); return `<span class="seal" style="background:${s.color}">${s.label}</span>`; };

  const lockIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  function thumb(v, { showLock = true, childId = null } = {}) {
    const p = childId ? prog(childId, v.id) : null;
    return `<div class="thumb" style="background:${subj(v.subject).color}">
      <span class="thumb__grade">${grade(v.grade).label}</span>
      <span class="thumb__unit">${esc(v.unit)}</span>
      <span class="thumb__time">${v.minutes}分</span>
      ${p && p.done ? '<span class="thumb__done">完了</span>' : ''}
      ${showLock && !canWatch(v) ? `<span class="thumb__lock"><span>${lockIcon}会員限定</span></span>` : ''}
    </div>`;
  }

  function vcard(v) {
    const c = activeChild();
    const p = c ? prog(c.id, v.id) : null;
    return `<a class="vcard" href="#/watch/${v.id}">
      ${thumb(v, { childId: c && c.id })}
      <div class="vcard__body">
        <div class="vcard__meta">${seal(v.subject)}${v.free ? '<span class="badge badge--free">無料</span>' : ''}</div>
        <p class="vcard__title">${esc(v.title)}</p>
        ${p && !p.done ? `<div class="progress" role="img" aria-label="視聴 ${Math.round(p.pct * 100)}%"><span style="width:${p.pct * 100}%"></span></div>` : ''}
      </div>
    </a>`;
  }

  function steps(current) {
    const list = ['アカウント作成', '子どもの登録', 'プラン選択', '申込み確認'];
    return `<ol class="steps" aria-label="申込みの手順">${list.map((l, i) => `<li class="${i < current ? 'is-done' : i === current ? 'is-current' : ''}" ${i === current ? 'aria-current="step"' : ''}>${i + 1}. ${l}</li>`).join('')}</ol>`;
  }

  function statusBadge() {
    const map = { none: '未契約', trial: '無料体験中', active: '契約中', canceled: '解約予約中', expired: '契約終了' };
    return `<span class="badge badge--status-${state.sub.status}">${map[state.sub.status]}</span>`;
  }

  function subNotice() {
    const s = state.sub;
    if (s.status === 'none') return `<div class="notice notice--info"><span>まだプランに申し込まれていません。無料の動画だけ見られます。</span><a class="btn btn--primary" href="#/plans">プランを選ぶ</a></div>`;
    if (s.status === 'trial') return `<div class="notice notice--warn"><span>無料体験中です。あと${daysLeft(s.renewAt)}日（${fmtDate(s.renewAt)}まで）。その後は${plan(s.plan).label}（${yen(plan(s.plan).price)}／${plan(s.plan).unit}）に自動で切り替わります。</span></div>`;
    if (s.status === 'canceled') return `<div class="notice notice--danger"><span>解約手続き済みです。${fmtDate(s.renewAt)}まで視聴できます。</span><button class="btn btn--outline" type="button" data-action="resume-sub">解約を取り消す</button></div>`;
    if (s.status === 'expired') return `<div class="notice notice--danger"><span>契約期間が終了しました。続けて学習するにはプランを再開してください。</span><a class="btn btn--primary" href="#/plans">プランを再開する</a></div>`;
    return '';
  }

  // ---------- views: public ----------
  function viewHome() {
    const free = allVideos().filter((v) => v.free);
    const count = (g, s) => allVideos().filter((v) => v.grade === g && v.subject === s).length;
    return `
    <section class="hero">
      <div class="container hero__grid">
        <div>
          <p class="eyebrow">小学1年生〜中学3年生の動画教材</p>
          <h1><span class="nw">「わからない」を、</span><br><span class="nw"><em>10分で「わかった」</em>に。</span></h1>
          <p class="hero__lead">学校の授業に合わせた単元別の動画で、つまずいたところをその日のうちに解決。ワークシートと学習記録で、おうちでの勉強が続く仕組みをつくります。</p>
          <div class="hero__cta">
            <a class="btn btn--primary btn--lg" href="#/signup">7日間無料で始める</a>
            <a class="btn btn--outline btn--lg" href="#/?s=samples">無料の動画を見てみる</a>
            <small>無料期間中に解約すれば、料金は一切かかりません。</small>
          </div>
        </div>
        <div class="notebook" aria-label="学習記録のイメージ">
          <div class="notebook__tabs" aria-hidden="true">${SUBJECTS.map((s) => `<span style="background:${s.color}"></span>`).join('')}</div>
          <p class="notebook__title">ゆうとさん（小4）の今週の学習</p>
          ${[['v08', 1], ['v10', 1], ['v09', 0.45], ['v06', 0.3]].map(([id, p]) => {
            const v = video(id);
            return `<div class="notebook__row">${seal(v.subject)}<span>${esc(v.unit)}</span><div class="progress" aria-hidden="true"><span style="width:${p * 100}%"></span></div></div>`;
          }).join('')}
        </div>
      </div>
    </section>

    <section class="section section--white">
      <div class="container">
        <div class="section-head"><p class="eyebrow">FEATURES</p><h2>おうち学習が続く、4つのしくみ</h2></div>
        <div class="points">
          <div class="point"><span class="point__no">01</span><h3>学年・教科・単元から探せる</h3><p>教科書の単元ごとに動画を用意。「今日の授業でわからなかったところ」をすぐに見つけられます。</p></div>
          <div class="point"><span class="point__no">02</span><h3>きょうだい3人まで、追加料金なし</h3><p>1つの契約で子どもを3人まで登録できます。視聴履歴や進み具合は、子どもごとに分けて記録されます。</p></div>
          <div class="point"><span class="point__no">03</span><h3>動画のあとはワークシートで練習</h3><p>すべての動画に印刷できるワークシートが付いています。見るだけで終わらせず、手を動かして定着させます。</p></div>
          <div class="point"><span class="point__no">04</span><h3>保護者が学習の様子を見守れる</h3><p>どの単元をいつ見たか、どこまで進んだかを保護者用の画面で確認できます。</p></div>
        </div>
      </div>
    </section>

    <section class="section" id="lineup">
      <div class="container">
        <div class="section-head"><p class="eyebrow">LINEUP</p><h2>教材ラインナップ</h2><p>学年と教科ごとの動画本数です（デモ用のサンプルデータ）。</p></div>
        <div class="timetable-wrap">
          <table class="timetable">
            <thead><tr><th scope="col">教科</th>${GRADES.map((g) => `<th scope="col">${g.label}</th>`).join('')}</tr></thead>
            <tbody>${SUBJECTS.map((s) => `<tr><th scope="row">${s.label}</th>${GRADES.map((g) => { const n = count(g.key, s.key); return `<td>${n ? n + '本' : '―'}</td>`; }).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section section--white" id="samples">
      <div class="container">
        <div class="section-head"><p class="eyebrow">FREE</p><h2>登録なしで見られる無料動画</h2><p>まずは実際の授業動画をご覧ください。</p></div>
        <div class="grid">${free.map(vcard).join('')}</div>
      </div>
    </section>

    <section class="section" id="price">
      <div class="container">
        <div class="section-head"><p class="eyebrow">PRICE</p><h2>料金プラン</h2><p>どちらのプランも全学年・全教科が見放題。はじめの${TRIAL_DAYS}日間は無料です。</p></div>
        <div class="plans">${PLANS.map((p) => `
          <div class="plan ${p.recommended ? 'plan--rec' : ''}">
            ${p.recommended ? '<span class="plan__flag">おすすめ</span>' : ''}
            <h3>${p.label}</h3>
            <p class="plan__price">${yen(p.price)}<small>（税込）／${p.unit}</small></p>
            <ul><li>全学年・全教科の動画が見放題</li><li>ワークシートのダウンロード</li><li>子ども3人まで登録可能</li><li>${p.note}</li></ul>
            <a class="btn ${p.recommended ? 'btn--primary' : 'btn--outline'} btn--block" href="#/signup?plan=${p.key}">${TRIAL_DAYS}日間無料で始める</a>
          </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section--white" id="faq">
      <div class="container container--mid">
        <div class="section-head"><p class="eyebrow">FAQ</p><h2>よくある質問</h2></div>
        <div class="faq">
          <details><summary>無料体験中に解約したら、料金はかかりますか？</summary><p>かかりません。無料期間の最終日までに解約すれば、請求は発生しません。</p></details>
          <details><summary>きょうだいで使えますか？</summary><p>1つの契約で子どもを3人まで登録できます。子どもごとに学習記録が分かれます。</p></details>
          <details><summary>どの端末で見られますか？</summary><p>パソコン・タブレット・スマートフォンのブラウザで視聴できます。学校で配られた端末でもご利用いただけます。</p></details>
          <details><summary>解約はどこからできますか？</summary><p>ログイン後の「アカウント」ページからいつでも手続きできます。解約後も、お支払い済みの期間の最後まで視聴できます。</p></details>
          <details><summary>支払い方法は何がありますか？</summary><p>クレジットカード（Visa / Mastercard / JCB / American Express）に対応しています。</p></details>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-band__inner">
        <h2>まずは${TRIAL_DAYS}日間、無料でお試しください。</h2>
        <a class="btn btn--primary btn--lg" href="#/signup">無料体験を始める</a>
      </div>
    </section>`;
  }

  function viewLogin(parts, query) {
    if (state.user) { go(query.get('next') || 'profiles'); return false; }
    const next = esc(query.get('next') || '');
    return `
    <section class="page"><div class="container container--narrow">
      <div class="card">
        <div class="auth-tabs"><a href="#/login" aria-current="page">ログイン</a><a href="#/signup">新規登録</a></div>
        <form class="form" data-form="login" novalidate>
          <input type="hidden" name="next" value="${next}">
          <div class="field"><label for="l-email">メールアドレス</label><input class="input" id="l-email" name="email" type="email" autocomplete="username" required></div>
          <div class="field"><label for="l-pass">パスワード</label><input class="input" id="l-pass" name="password" type="password" autocomplete="current-password" required>
            <button class="link-btn" type="button" data-action="toast" data-msg="デモ：パスワード再設定メールが送信されます" style="justify-self:start;padding-left:0">パスワードを忘れた方</button></div>
          <p class="error-text" id="login-error" role="alert"></p>
          <button class="btn btn--main btn--block btn--lg" type="submit">ログイン</button>
          <div class="divider">または</div>
          <button class="btn btn--ghost btn--block" type="button" data-action="demo-login">デモアカウントでログイン</button>
          <p class="hint" style="font-size:var(--text-xs);color:var(--color-ink-sub)">デモ版では、どのメールアドレス・パスワード（8文字以上）でもログインできます。</p>
        </form>
      </div>
    </div></section>`;
  }

  function viewSignup(parts, query) {
    const step = parts[1] || 'account';
    const planKey = query.get('plan') || '';
    if (step === 'child') {
      if (!requireLogin('signup/child')) return false;
      return `
      <section class="page"><div class="container container--narrow">
        ${steps(1)}
        <div class="card">
          <h2>学習する子どもを登録しましょう</h2>
          <p style="font-size:var(--text-sm);color:var(--color-ink-sub);margin-bottom:var(--space-5)">学年に合わせた動画がはじめに表示されます。あとから3人まで追加できます。</p>
          ${childForm({ submit: '次へ：プランを選ぶ', form: 'signup-child', planKey })}
        </div>
      </div></section>`;
    }
    if (state.user) { go('profiles'); return false; }
    return `
    <section class="page"><div class="container container--narrow">
      ${steps(0)}
      <div class="card">
        <div class="auth-tabs"><a href="#/login">ログイン</a><a href="#/signup" aria-current="page">新規登録</a></div>
        <form class="form" data-form="signup" novalidate>
          <input type="hidden" name="plan" value="${esc(planKey)}">
          <p class="notice notice--info">アカウントは保護者の方が作成してください。お支払いも保護者のアカウントで行います。</p>
          <button class="btn btn--ghost btn--block" type="button" data-action="toast" data-msg="デモ：Googleアカウントでの登録画面に移動します">Googleアカウントで登録</button>
          <div class="divider">またはメールアドレスで登録</div>
          <div class="field"><label for="s-name">保護者のお名前<span class="req">必須</span></label><input class="input" id="s-name" name="name" autocomplete="name" required></div>
          <div class="field"><label for="s-email">メールアドレス<span class="req">必須</span></label><input class="input" id="s-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="s-pass">パスワード<span class="req">必須</span></label><input class="input" id="s-pass" name="password" type="password" autocomplete="new-password" required minlength="8" aria-describedby="s-pass-hint"><span class="hint" id="s-pass-hint">8文字以上の半角英数字</span></div>
          <label class="check"><input type="checkbox" name="agree" required><span><a href="#/legal/terms" target="_blank">利用規約</a>と<a href="#/legal/privacy" target="_blank">プライバシーポリシー</a>に同意し、保護者として子どもの利用に同意します。</span></label>
          <p class="error-text" id="signup-error" role="alert"></p>
          <button class="btn btn--primary btn--block btn--lg" type="submit">次へ：子どもの登録</button>
        </form>
      </div>
    </div></section>`;
  }

  function childForm({ submit, form, child = null, planKey = '' }) {
    return `<form class="form" data-form="${form}" novalidate>
      ${child ? `<input type="hidden" name="id" value="${child.id}">` : ''}
      <input type="hidden" name="plan" value="${esc(planKey)}">
      <div class="field"><label for="c-name">表示名（ニックネーム可）<span class="req">必須</span></label><input class="input" id="c-name" name="name" maxlength="12" value="${esc(child ? child.name : '')}" required><span class="hint">本名でなくてもかまいません（12文字まで）</span></div>
      <div class="field"><label for="c-grade">学年<span class="req">必須</span></label>
        <select class="select" id="c-grade" name="grade" required>
          <option value="">選択してください</option>
          ${GRADES.map((g) => `<option value="${g.key}" ${child && child.grade === g.key ? 'selected' : ''}>${g.stage} ${g.label}</option>`).join('')}
        </select></div>
      <p class="error-text" role="alert"></p>
      <button class="btn btn--primary btn--block" type="submit">${submit}</button>
    </form>`;
  }

  function viewPlans(parts, query) {
    if (!requireLogin('plans')) return false;
    if (['trial', 'active', 'canceled'].includes(state.sub.status)) {
      return `<section class="page"><div class="container container--narrow"><div class="card"><h2>すでにご契約中です</h2><p style="font-size:var(--text-sm);color:var(--color-ink-sub)">プランの変更はアカウントページから行えます。</p><div class="row-actions"><a class="btn btn--main" href="#/account">アカウントページへ</a></div></div></div></section>`;
    }
    const sel = query.get('plan') || 'yearly';
    const trial = !state.sub.trialUsed;
    return `
    <section class="page"><div class="container container--mid">
      ${steps(2)}
      <div class="page-head"><h1>プランを選んでください</h1><p>${trial ? `どちらのプランも、はじめの${TRIAL_DAYS}日間は無料です。無料期間中はいつでも解約できます。` : '無料体験はご利用済みのため、お申し込み日から料金が発生します。'}</p></div>
      <form data-form="plans">
        <div class="plans">${PLANS.map((p) => `
          <label class="plan ${p.recommended ? 'plan--rec' : ''}">
            <input type="radio" name="plan" value="${p.key}" ${p.key === sel ? 'checked' : ''}>
            ${p.recommended ? '<span class="plan__flag">おすすめ</span>' : ''}
            <h3>${p.label}</h3>
            <p class="plan__price">${yen(p.price)}<small>（税込）／${p.unit}</small></p>
            <ul><li>全学年・全教科の動画が見放題</li><li>子ども3人まで登録可能</li><li>${p.note}</li></ul>
          </label>`).join('')}
        </div>
        <div class="row-actions" style="margin-top:var(--space-6)"><button class="btn btn--primary btn--lg" type="submit">申込み内容の確認へ</button></div>
      </form>
    </div></section>`;
  }

  function viewCheckout(parts, query) {
    if (!requireLogin('plans')) return false;
    const p = plan(query.get('plan')) || plan('yearly');
    const trial = !state.sub.trialUsed;
    const now = Date.now();
    const firstCharge = trial ? now + DAY * TRIAL_DAYS : now;
    return `
    <section class="page"><div class="container">
      ${steps(3)}
      <div class="page-head"><h1>お申し込み内容の確認</h1><p>内容をご確認のうえ、お支払い情報を入力してください。</p></div>
      <form class="checkout" data-form="checkout" novalidate>
        <input type="hidden" name="plan" value="${p.key}">
        <div>
          <div class="terms-box">
            <h3>ご契約内容（最終確認）</h3>
            <dl class="dl">
              <dt>サービス</dt><dd>まなびノート（仮） ${p.label}</dd>
              <dt>料金</dt><dd>${yen(p.price)}（税込）／${p.unit}</dd>
              <dt>無料期間</dt><dd>${trial ? `${fmtDate(now)} 〜 ${fmtDate(now + DAY * (TRIAL_DAYS - 1))}（${TRIAL_DAYS}日間）` : 'なし（ご利用済み）'}</dd>
              <dt>初回のお支払い</dt><dd>${fmtDate(firstCharge)}</dd>
              <dt>契約期間</dt><dd>1${p.unit === '月' ? 'か月' : '年'}ごとの自動更新。解約するまで、同じ料金で毎${p.unit}自動的に更新されます。</dd>
              <dt>解約方法</dt><dd>ログイン後の「アカウント」ページからいつでも手続きできます。${trial ? '無料期間中に解約すれば料金はかかりません。' : ''}</dd>
              <dt>解約後の扱い</dt><dd>お支払い済み期間の最終日まで視聴できます。日割りでの返金はありません。</dd>
            </dl>
          </div>
          <div class="card" style="margin-top:var(--space-5)">
            <h2>お支払い方法</h2>
            <p class="notice notice--warn" style="margin-bottom:var(--space-4)">デモのため実際の決済は行われません。本番ではこの部分が Stripe の決済画面になります。</p>
            <div class="card-mock">
              <div class="field"><label for="cc-num">カード番号</label><input class="input" id="cc-num" inputmode="numeric" value="4242 4242 4242 4242" autocomplete="off"></div>
              <div class="form-row">
                <div class="field"><label for="cc-exp">有効期限</label><input class="input" id="cc-exp" value="12 / 30" autocomplete="off"></div>
                <div class="field"><label for="cc-cvc">セキュリティコード</label><input class="input" id="cc-cvc" value="123" autocomplete="off"></div>
              </div>
            </div>
          </div>
        </div>
        <aside class="card summary" aria-label="お支払い金額">
          <h2>お支払い金額</h2>
          <dl class="dl">
            <dt>${p.label}</dt><dd>${yen(p.price)}</dd>
            ${trial ? `<dt>無料体験（${TRIAL_DAYS}日間）</dt><dd>−${yen(p.price)}</dd>` : ''}
          </dl>
          <div class="summary__total"><span>本日のお支払い</span><span>${trial ? '0円' : yen(p.price)}</span></div>
          <p style="font-size:var(--text-xs);color:var(--color-ink-sub);margin-top:var(--space-2)">${fmtDate(firstCharge)}以降、${yen(p.price)}／${p.unit}</p>
          <label class="check" style="margin-top:var(--space-5)"><input type="checkbox" name="agree" required><span>上記の契約内容（自動更新・解約方法）を確認しました</span></label>
          <p class="error-text" role="alert"></p>
          <button class="btn btn--primary btn--block btn--lg" type="submit" style="margin-top:var(--space-4)">${trial ? '無料体験を始める' : '申し込む'}</button>
          <a class="btn btn--ghost btn--block" href="#/plans" style="margin-top:var(--space-2)">プラン選択に戻る</a>
        </aside>
      </form>
    </div></section>`;
  }

  function viewWelcome() {
    if (!requireLogin('welcome')) return false;
    const s = state.sub;
    return `
    <section class="page"><div class="container container--narrow">
      <div class="card" style="text-align:center">
        <p class="eyebrow">COMPLETE</p>
        <h1 style="font-size:var(--text-xl);margin:var(--space-2) 0 var(--space-4)">お申し込みが完了しました</h1>
        <p style="color:var(--color-ink-sub);font-size:var(--text-sm)">${s.status === 'trial' ? `${fmtDate(s.renewAt)}まで無料でご利用いただけます。` : 'すべての動画が見放題になりました。'}<br>確認メールを ${esc(state.user.email)} にお送りしました（デモでは送信されません）。</p>
        <div class="row-actions" style="justify-content:center"><a class="btn btn--primary btn--lg" href="#/profiles">学習をはじめる</a></div>
      </div>
    </div></section>`;
  }

  // ---------- views: member ----------
  function viewProfiles() {
    if (!requireLogin('profiles')) return false;
    return `
    <section class="page"><div class="container" style="text-align:center">
      <h1 style="font-size:var(--text-2xl)">だれが学習する？</h1>
      <div class="profiles">
        ${state.children.map((c) => `
          <button class="profile" type="button" data-action="pick-child" data-id="${c.id}">
            <span class="avatar avatar--lg" style="background:${c.color}">${esc(c.name.slice(0, 1))}</span>
            <strong>${esc(c.name)}</strong><span>${grade(c.grade).stage} ${grade(c.grade).label}</span>
          </button>`).join('')}
        ${state.children.length < MAX_CHILDREN ? `
          <button class="profile profile--add" type="button" data-action="add-child">
            <span class="avatar avatar--lg" aria-hidden="true">＋</span><strong>追加する</strong><span>あと${MAX_CHILDREN - state.children.length}人</span>
          </button>` : ''}
      </div>
      ${state.children.length === 0 ? '<p style="color:var(--color-ink-sub);font-size:var(--text-sm)">まだ子どもが登録されていません。「追加する」から登録してください。</p>' : ''}
      <a class="btn btn--ghost" href="#/account">保護者メニュー</a>
    </div></section>`;
  }

  function viewLibrary() {
    if (!requireLogin('library')) return false;
    const c = activeChild();
    if (!c) { go('profiles'); return false; }
    if (ui.filterChild !== c.id) { ui.filters = { grade: c.grade, subject: 'all', q: '' }; ui.filterChild = c.id; }
    const f = ui.filters;
    const resume = allVideos().filter((v) => { const p = prog(c.id, v.id); return p && !p.done && canWatch(v); })
      .sort((a, b) => prog(c.id, b.id).updatedAt - prog(c.id, a.id).updatedAt);
    return `
    <section class="page"><div class="container">
      <div class="lib-head">
        <div><p class="eyebrow">${grade(c.grade).stage} ${grade(c.grade).label}</p><h1>${esc(c.name)}さんの教材</h1></div>
      </div>
      ${subNotice() ? `<div style="margin-bottom:var(--space-5)">${subNotice()}</div>` : ''}
      ${resume.length ? `<div class="shelf"><h2>続きから見る<small>${resume.length}本</small></h2><div class="grid">${resume.slice(0, 4).map(vcard).join('')}</div></div>` : ''}
      <div class="filters" role="search">
        <div class="filters__row"><span class="filters__label">学年</span>
          <button class="pill" type="button" data-action="filter" data-key="grade" data-val="all" aria-pressed="${f.grade === 'all'}">すべて</button>
          ${GRADES.map((g) => `<button class="pill" type="button" data-action="filter" data-key="grade" data-val="${g.key}" aria-pressed="${f.grade === g.key}">${g.label}</button>`).join('')}
        </div>
        <div class="filters__row"><span class="filters__label">教科</span>
          <button class="pill" type="button" data-action="filter" data-key="subject" data-val="all" aria-pressed="${f.subject === 'all'}">すべて</button>
          ${SUBJECTS.map((s) => `<button class="pill" type="button" data-action="filter" data-key="subject" data-val="${s.key}" aria-pressed="${f.subject === s.key}">${s.label}</button>`).join('')}
          <div class="search" style="margin-left:auto">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <label class="visually-hidden" for="q">単元名・キーワードで検索</label>
            <input class="input" id="q" type="search" placeholder="単元名・キーワード" value="${esc(f.q)}" data-input="search">
          </div>
        </div>
      </div>
      <div id="results">${libraryResults()}</div>
    </div></section>`;
  }

  function libraryResults() {
    const f = ui.filters;
    const q = f.q.trim().toLowerCase();
    const list = allVideos().filter((v) =>
      (f.grade === 'all' || v.grade === f.grade) &&
      (f.subject === 'all' || v.subject === f.subject) &&
      (!q || (v.title + v.unit + subj(v.subject).label).toLowerCase().includes(q)));
    if (!list.length) {
      return `<div class="empty"><h2>条件に合う動画が見つかりませんでした</h2><p>学年や教科の条件を変えるか、別のキーワードで探してみてください。</p><button class="btn btn--outline" type="button" data-action="filter-reset">条件をリセット</button></div>`;
    }
    return `<p style="font-size:var(--text-sm);color:var(--color-ink-sub);margin-bottom:var(--space-4)">${list.length}本の動画</p><div class="grid">${list.map(vcard).join('')}</div>`;
  }

  function viewWatch(parts) {
    const v = video(parts[1]);
    if (!v) return viewNotFound();
    const c = activeChild();
    const ok = canWatch(v);
    const p = c ? prog(c.id, v.id) : null;
    let related = allVideos().filter((x) => x.id !== v.id && x.grade === v.grade && x.subject === v.subject);
    if (related.length < 4) related = related.concat(allVideos().filter((x) => x.id !== v.id && x.grade === v.grade && !related.includes(x)));
    related = related.slice(0, 5);
    const next = related[0];

    let lockedMsg;
    if (!state.user) lockedMsg = { h: 'この動画は会員限定です', p: `${TRIAL_DAYS}日間の無料体験で、すべての動画が見放題になります。`, a: '<a class="btn btn--primary" href="#/signup">無料体験を始める</a> <a class="btn btn--outline" style="background:transparent;color:#fff;border-color:#fff" href="#/login?next=' + encodeURIComponent('watch/' + v.id) + '">ログイン</a>' };
    else if (state.sub.status === 'expired') lockedMsg = { h: '契約期間が終了しています', p: 'プランを再開すると、続きから視聴できます。', a: '<a class="btn btn--primary" href="#/plans">プランを再開する</a>' };
    else lockedMsg = { h: 'この動画は会員限定です', p: 'プランに申し込むと、すべての動画が見放題になります。', a: '<a class="btn btn--primary" href="#/plans">プランを選ぶ</a>' };

    return `
    <section class="page" style="padding-top:var(--space-5)"><div class="container">
      <p style="font-size:var(--text-sm);margin-bottom:var(--space-3)"><a href="#/${state.user ? 'library' : ''}">← ${state.user ? '教材一覧' : 'トップ'}に戻る</a></p>
      <div class="watch">
        <div>
          <div class="player">
            ${ok
              ? `<iframe id="vimeo" src="https://player.vimeo.com/video/${esc(v.vimeoId)}?title=0&byline=0&portrait=0&dnt=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(v.title)}"></iframe>`
              : `<div class="player__locked"><div>${lockIcon.replace('width="12" height="12"', 'width="36" height="36"')}<h2>${lockedMsg.h}</h2><p>${lockedMsg.p}</p>${lockedMsg.a}</div></div>`}
          </div>
          <div class="watch__info">
            <div class="vcard__meta">${seal(v.subject)}<span class="badge badge--lock">${grade(v.grade).label}・${esc(v.unit)}</span>${v.free ? '<span class="badge badge--free">無料</span>' : ''}<span style="font-size:var(--text-xs);color:var(--color-ink-sub)">${v.minutes}分</span></div>
            <h1>${esc(v.title)}</h1>
            <p>${esc(v.description)}</p>
            <div class="watch__actions">
              ${c && ok ? `<div class="watch__status" id="watch-status">${watchStatus(p)}</div>` : ''}
              ${!c && ok && state.user ? '<div class="watch__status"><a href="#/profiles">子どもを選ぶと視聴記録が残ります</a></div>' : ''}
              <button class="btn btn--outline" type="button" data-action="worksheet" ${ok ? '' : 'disabled'}>ワークシート（PDF）</button>
              ${c && ok ? `<button class="btn btn--ghost" type="button" data-action="mark-done" data-id="${v.id}">視聴完了にする</button>` : ''}
              ${next ? `<a class="btn btn--main" href="#/watch/${next.id}">次の動画へ</a>` : ''}
            </div>
          </div>
        </div>
        <aside class="side-list" aria-label="関連する動画">
          <h2>${grade(v.grade).label}の関連動画</h2>
          ${related.map((r) => `<a class="side-item" href="#/watch/${r.id}">${thumb(r, { childId: c && c.id })}<div><p>${esc(r.title)}</p><small>${subj(r.subject).label}・${r.minutes}分</small></div></a>`).join('')}
        </aside>
      </div>
    </div></section>`;
  }

  function watchStatus(p) {
    if (p && p.done) return '<span class="badge badge--status-active">視聴完了</span><span>おつかれさまでした</span>';
    const pct = p ? Math.round(p.pct * 100) : 0;
    return `<span>視聴 ${pct}%</span><div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>`;
  }

  function viewProgress() {
    if (!requireLogin('progress')) return false;
    if (!state.children.length) return `<section class="page"><div class="container"><div class="empty"><h2>子どもが登録されていません</h2><p>子どもを登録すると、学習記録が表示されます。</p><a class="btn btn--primary" href="#/profiles">子どもを登録する</a></div></div></section>`;
    const c = state.children.find((x) => x.id === (ui.progressChild || state.activeChildId)) || state.children[0];
    const entries = Object.entries(state.progress[c.id] || {}).map(([vid, p]) => ({ v: video(vid), ...p })).filter((e) => e.v);
    const done = entries.filter((e) => e.done);
    const weekAgo = Date.now() - DAY * 7;
    const minutes = Math.round(entries.filter((e) => e.updatedAt > weekAgo).reduce((s, e) => s + e.v.minutes * (e.done ? 1 : e.pct), 0));
    const days = new Set(entries.map((e) => startOfDay(e.updatedAt)));
    let streak = 0; let d = startOfDay(Date.now());
    if (!days.has(d)) d -= DAY;
    while (days.has(d)) { streak++; d -= DAY; }
    const gradeVideos = allVideos().filter((v) => v.grade === c.grade);

    return `
    <section class="page"><div class="container container--mid">
      <div class="page-head"><h1>学習記録</h1><p>保護者の方は、子どもごとの学習の様子をここで確認できます。</p></div>
      ${state.children.length > 1 ? `<div class="child-switch" style="margin-bottom:var(--space-5)">${state.children.map((x) => `<button class="pill" type="button" data-action="progress-child" data-id="${x.id}" aria-pressed="${x.id === c.id}">${esc(x.name)}（${grade(x.grade).label}）</button>`).join('')}</div>` : ''}
      <div class="stats">
        <div class="stat"><p class="stat__label">見終わった動画</p><p class="stat__value">${done.length}<small>本</small></p></div>
        <div class="stat"><p class="stat__label">この7日間の学習時間</p><p class="stat__value">${minutes}<small>分</small></p></div>
        <div class="stat"><p class="stat__label">連続学習日数</p><p class="stat__value">${streak}<small>日</small></p></div>
      </div>
      <div class="card">
        <h2>${grade(c.grade).label}の教科別の進み具合</h2>
        <div class="subj-bars">${SUBJECTS.map((s) => {
          const total = gradeVideos.filter((v) => v.subject === s.key).length;
          const n = gradeVideos.filter((v) => v.subject === s.key && (prog(c.id, v.id) || {}).done).length;
          const pct = total ? (n / total) * 100 : 0;
          return `<div class="subj-bar">${seal(s.key)}<div class="progress" role="img" aria-label="${s.label} ${n}/${total}本"><span style="width:${pct}%;background:${s.color}"></span></div><span class="subj-bar__num">${total ? `${n} / ${total}本` : '―'}</span></div>`;
        }).join('')}</div>
      </div>
      <div class="card">
        <h2>最近の学習</h2>
        ${entries.length ? `<ul class="history">${entries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10).map((e) => `
          <li><time datetime="${new Date(e.updatedAt).toISOString()}">${fmtShort(e.updatedAt)}</time>${seal(e.v.subject)}<a href="#/watch/${e.v.id}">${esc(e.v.title)}</a>${e.done ? '<span class="badge badge--status-active">完了</span>' : `<span class="badge badge--lock">${Math.round(e.pct * 100)}%</span>`}</li>`).join('')}</ul>`
          : '<p style="font-size:var(--text-sm);color:var(--color-ink-sub)">まだ学習記録がありません。動画を見ると、ここに記録されます。</p>'}
      </div>
    </div></section>`;
  }

  function viewAccount() {
    if (!requireLogin('account')) return false;
    const s = state.sub;
    const p = plan(s.plan);
    const dateRow = {
      trial: `<dt>無料期間の終了日</dt><dd>${fmtDate(s.renewAt)}（あと${daysLeft(s.renewAt)}日）<br><small style="color:var(--color-ink-sub)">この日に初回のお支払い（${p ? yen(p.price) : ''}）が発生します</small></dd>`,
      active: `<dt>次回のお支払い日</dt><dd>${fmtDate(s.renewAt)}（${p ? yen(p.price) : ''}）</dd>`,
      canceled: `<dt>視聴できる期限</dt><dd>${fmtDate(s.renewAt)}まで。以降の請求はありません。</dd>`,
      expired: `<dt>契約終了日</dt><dd>${fmtDate(s.renewAt)}</dd>`,
      none: '',
    }[s.status];
    let actions = '';
    if (s.status === 'trial' || s.status === 'active') actions = `<button class="btn btn--outline" type="button" data-action="change-plan">プランを変更</button><button class="btn btn--outline" type="button" data-action="change-card">カードを変更</button><button class="btn btn--danger" type="button" data-action="cancel-sub">解約する</button>`;
    if (s.status === 'canceled') actions = `<button class="btn btn--main" type="button" data-action="resume-sub">解約を取り消す</button><button class="btn btn--outline" type="button" data-action="change-card">カードを変更</button>`;
    if (s.status === 'none' || s.status === 'expired') actions = `<a class="btn btn--primary" href="#/plans">${s.status === 'none' ? 'プランを選ぶ' : 'プランを再開する'}</a>`;

    return `
    <section class="page"><div class="container container--mid">
      <div class="page-head"><h1>アカウント</h1><p>保護者向けの設定ページです。</p></div>
      <div class="card">
        <h2>ご契約内容</h2>
        <dl class="dl">
          <dt>状態</dt><dd>${statusBadge()}</dd>
          ${p ? `<dt>プラン</dt><dd>${p.label}（${yen(p.price)}／${p.unit}）</dd>` : ''}
          ${dateRow}
          ${s.card ? `<dt>お支払い方法</dt><dd>Visa **** ${esc(s.card)}</dd>` : ''}
        </dl>
        <div class="row-actions">${actions}</div>
        <p style="font-size:var(--text-xs);color:var(--color-ink-sub);margin-top:var(--space-4)">本番では、プラン変更・カード変更・解約は Stripe のカスタマーポータルで処理します。</p>
      </div>
      <div class="card">
        <h2>子どもの管理<small style="font-size:var(--text-xs);color:var(--color-ink-sub);font-weight:500;margin-left:8px">${state.children.length} / ${MAX_CHILDREN}人</small></h2>
        ${state.children.length ? `<ul class="child-list">${state.children.map((c) => `
          <li><span class="avatar" style="background:${c.color}">${esc(c.name.slice(0, 1))}</span><strong>${esc(c.name)}</strong><span style="font-size:var(--text-sm);color:var(--color-ink-sub)">${grade(c.grade).stage} ${grade(c.grade).label}</span>
            <button class="link-btn" type="button" data-action="edit-child" data-id="${c.id}">編集</button>
            <button class="link-btn link-btn--danger" type="button" data-action="delete-child" data-id="${c.id}">削除</button></li>`).join('')}</ul>`
          : '<p style="font-size:var(--text-sm);color:var(--color-ink-sub)">まだ登録されていません。</p>'}
        ${state.children.length < MAX_CHILDREN ? '<div class="row-actions"><button class="btn btn--outline" type="button" data-action="add-child">子どもを追加</button></div>' : ''}
      </div>
      <div class="card">
        <h2>保護者情報</h2>
        <dl class="dl"><dt>お名前</dt><dd>${esc(state.user.name)}</dd><dt>メールアドレス</dt><dd>${esc(state.user.email)}</dd><dt>パスワード</dt><dd>********</dd></dl>
        <div class="row-actions"><button class="btn btn--ghost" type="button" data-action="toast" data-msg="デモ：登録情報の変更画面が開きます">登録情報を変更</button><button class="btn btn--ghost" type="button" data-action="toast" data-msg="デモ：パスワード変更画面が開きます">パスワードを変更</button></div>
      </div>
      <div class="card">
        <h2>お支払い履歴</h2>
        ${state.invoices.length ? `<div class="table-wrap"><table class="invoice-table"><thead><tr><th>日付</th><th>内容</th><th>金額</th><th><span class="visually-hidden">領収書</span></th></tr></thead><tbody>
          ${state.invoices.slice().reverse().map((i) => `<tr><td>${fmtDate(i.date)}</td><td>${esc(i.label)}</td><td>${yen(i.amount)}</td><td><button class="link-btn" type="button" data-action="toast" data-msg="デモ：領収書PDFがダウンロードされます">領収書</button></td></tr>`).join('')}
        </tbody></table></div>` : '<p style="font-size:var(--text-sm);color:var(--color-ink-sub)">お支払い履歴はまだありません。</p>'}
      </div>
      <div class="row-actions"><button class="btn btn--ghost" type="button" data-action="logout">ログアウト</button></div>
    </div></section>`;
  }

  // ---------- views: admin ----------
  const MEMBERS = [
    ['佐藤 美咲', 'misaki.s@example.com', 'active', '年額', 2, '2026-04-12'],
    ['鈴木 健一', 'k.suzuki@example.com', 'trial', '月額', 1, '2026-10-09'],
    ['高橋 由美', 'yumi.t@example.com', 'active', '月額', 3, '2026-06-30'],
    ['田中 翔', 'sho.tanaka@example.com', 'canceled', '月額', 1, '2026-08-02'],
    ['伊藤 恵', 'megumi.i@example.com', 'active', '年額', 2, '2026-02-18'],
    ['渡辺 大輔', 'd.watanabe@example.com', 'expired', '月額', 1, '2026-05-21'],
    ['山本 彩', 'aya.y@example.com', 'trial', '年額', 2, '2026-10-11'],
    ['中村 隆', 't.nakamura@example.com', 'active', '月額', 1, '2026-09-03'],
  ];

  function viewAdmin(parts) {
    const tab = parts[1] || 'dashboard';
    const nav = [['dashboard', 'ダッシュボード'], ['videos', '動画の管理'], ['members', '会員の管理']];
    const body = tab === 'videos' ? adminVideos() : tab === 'members' ? adminMembers() : adminDashboard();
    return `
    <section class="page"><div class="container">
      <div class="page-head"><p class="eyebrow">ADMIN</p><h1>管理画面</h1><p>運営者向けの画面です。本番では管理者アカウントでのみ表示されます。</p></div>
      <div class="admin">
        <nav class="admin-nav" aria-label="管理メニュー"><p>メニュー</p>${nav.map(([k, l]) => `<a href="#/admin/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
        <div>${body}</div>
      </div>
    </div></section>`;
  }

  function adminDashboard() {
    const months = [['5月', 98], ['6月', 121], ['7月', 134], ['8月', 158], ['9月', 166], ['10月', 172]];
    const max = Math.max(...months.map((m) => m[1]));
    return `
      <div class="kpis">
        <div class="stat"><p class="stat__label">会員数</p><p class="stat__value">128<small>人</small></p></div>
        <div class="stat"><p class="stat__label">有料会員</p><p class="stat__value">96<small>人</small></p></div>
        <div class="stat"><p class="stat__label">無料体験中</p><p class="stat__value">14<small>人</small></p></div>
        <div class="stat"><p class="stat__label">今月の売上</p><p class="stat__value">17.2<small>万円</small></p></div>
      </div>
      <div class="card">
        <h2>月別の売上（千円）</h2>
        <div class="chart" role="img" aria-label="5月から10月の売上推移">
          ${months.map(([m, n]) => `<div class="chart__col"><div class="chart__bar" style="height:${(n / max) * 100}%"><span>${n}</span></div><span class="chart__label">${m}</span></div>`).join('')}
        </div>
        <p style="font-size:var(--text-xs);color:var(--color-ink-sub);margin-top:var(--space-3)">※デモ用のダミーデータです。本番では Stripe の売上データと連携します。</p>
      </div>
      <div class="card">
        <h2>最近の登録</h2>
        ${membersTable(MEMBERS.slice().sort((a, b) => b[5].localeCompare(a[5])).slice(0, 4))}
      </div>`;
  }

  function membersTable(rows) {
    const map = { active: '契約中', trial: '無料体験中', canceled: '解約予約中', expired: '契約終了' };
    if (!rows.length) return '<div class="empty"><h2>該当する会員がいません</h2><p>検索条件を変えてお試しください。</p></div>';
    return `<div class="table-wrap"><table class="table"><thead><tr><th>保護者名</th><th>メールアドレス</th><th>状態</th><th>プラン</th><th>子ども</th><th>登録日</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td><span class="badge badge--status-${r[2]}">${map[r[2]]}</span></td><td>${r[3]}</td><td>${r[4]}人</td><td>${r[5]}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function adminMembers() {
    const q = ui.adminQuery.trim();
    const rows = MEMBERS.filter((r) => !q || r[0].includes(q) || r[1].includes(q));
    return `<div class="card">
      <h2>会員一覧</h2>
      <div class="search" style="margin-bottom:var(--space-4);max-width:360px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <label class="visually-hidden" for="mq">名前・メールアドレスで検索</label>
        <input class="input" id="mq" type="search" placeholder="名前・メールアドレス" value="${esc(q)}" data-input="member-search">
      </div>
      <div id="member-results">${membersTable(rows)}</div>
    </div>`;
  }

  function adminVideos() {
    const list = allVideos();
    return `
      <div class="card">
        <h2>動画を追加する</h2>
        <p style="font-size:var(--text-sm);color:var(--color-ink-sub);margin-bottom:var(--space-5)">Vimeo にアップロードした動画の URL か ID を貼り付けるだけで登録できます。</p>
        <form class="form" data-form="add-video" novalidate>
          <div class="field"><label for="av-title">タイトル<span class="req">必須</span></label><input class="input" id="av-title" name="title" required></div>
          <div class="form-row">
            <div class="field"><label for="av-grade">学年<span class="req">必須</span></label><select class="select" id="av-grade" name="grade" required><option value="">選択</option>${GRADES.map((g) => `<option value="${g.key}">${g.label}</option>`).join('')}</select></div>
            <div class="field"><label for="av-subj">教科<span class="req">必須</span></label><select class="select" id="av-subj" name="subject" required><option value="">選択</option>${SUBJECTS.map((s) => `<option value="${s.key}">${s.label}</option>`).join('')}</select></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="av-unit">単元名<span class="req">必須</span></label><input class="input" id="av-unit" name="unit" required></div>
            <div class="field"><label for="av-min">再生時間（分）</label><input class="input" id="av-min" name="minutes" type="number" min="1" value="10"></div>
          </div>
          <div class="field"><label for="av-vimeo">Vimeo の URL または動画 ID<span class="req">必須</span></label>
            <div style="display:flex;gap:var(--space-2)"><input class="input" id="av-vimeo" name="vimeo" placeholder="https://vimeo.com/22439234" required><button class="btn btn--outline" type="button" data-action="preview-vimeo">プレビュー</button></div>
          </div>
          <div id="vimeo-preview"></div>
          <div class="field"><label for="av-desc">説明文</label><textarea class="textarea" id="av-desc" name="description" rows="3"></textarea></div>
          <div class="field"><label for="av-pdf">ワークシート（PDF）</label><input id="av-pdf" name="pdf" type="file" accept="application/pdf"></div>
          <label class="check"><input type="checkbox" name="free"><span>無料公開する（未契約の人も見られる）</span></label>
          <p class="error-text" role="alert"></p>
          <button class="btn btn--main" type="submit" style="justify-self:start">登録する</button>
        </form>
      </div>
      <div class="card">
        <h2>登録済みの動画<small style="font-size:var(--text-xs);color:var(--color-ink-sub);font-weight:500;margin-left:8px">${list.length}本</small></h2>
        <div class="table-wrap"><table class="table"><thead><tr><th>学年</th><th>教科</th><th>タイトル</th><th>Vimeo ID</th><th>公開</th><th><span class="visually-hidden">操作</span></th></tr></thead><tbody>
          ${list.slice().reverse().map((v) => `<tr><td>${grade(v.grade).label}</td><td>${seal(v.subject)}</td><td class="wrap"><a href="#/watch/${v.id}">${esc(v.title)}</a></td><td>${esc(v.vimeoId)}</td><td>${v.free ? '<span class="badge badge--free">無料</span>' : '<span class="badge badge--lock">会員限定</span>'}</td>
            <td>${v.custom ? `<button class="link-btn link-btn--danger" type="button" data-action="delete-video" data-id="${v.id}">削除</button>` : '<button class="link-btn" type="button" data-action="toast" data-msg="デモ：編集画面が開きます">編集</button>'}</td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  }

  // ---------- views: legal / 404 ----------
  function viewLegal(parts) {
    const page = parts[1];
    const todo = '<span class="badge badge--status-trial">要確認</span>';
    if (page === 'tokushoho') {
      const rows = [
        ['販売事業者', `${todo} 正式な事業者名`], ['運営責任者', todo], ['所在地', todo], ['電話番号', `${todo}（請求があれば遅滞なく開示する旨の記載も可）`], ['メールアドレス', todo],
        ['販売価格', '月額プラン 1,980円（税込）／年額プラン 19,800円（税込）'], ['商品代金以外の必要料金', 'インターネット接続にかかる通信料はお客様のご負担となります。'],
        ['支払方法', 'クレジットカード'], ['支払時期', '無料期間終了日に初回決済、以降は契約更新日ごとに自動決済'],
        ['提供時期', '決済手続き完了後、ただちにご利用いただけます。'], ['契約期間・自動更新', '月額は1か月、年額は1年ごとに自動更新されます。'],
        ['解約・返品について', 'アカウントページからいつでも解約できます。デジタルコンテンツの性質上、お支払い済み料金の返金はいたしません。解約後もお支払い済み期間の最終日まで利用できます。'],
        ['動作環境', '最新版の Google Chrome / Safari / Microsoft Edge'],
      ];
      return `<section class="page legal"><div class="container container--mid"><div class="card"><h1>特定商取引法に基づく表記</h1><table>${rows.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`).join('')}</table></div></div></section>`;
    }
    const title = page === 'privacy' ? 'プライバシーポリシー' : '利用規約';
    const heads = page === 'privacy'
      ? ['取得する情報', '利用目的', '子どもの情報の取り扱い', '第三者提供', '外部サービスの利用（決済・動画配信・アクセス解析）', '開示・訂正・削除の請求', 'お問い合わせ窓口']
      : ['適用', '会員登録', '未成年の利用', '料金および支払い', '契約の更新と解約', '禁止事項（アカウントの共有・動画の録画や再配布を含む）', 'サービスの変更・停止', '免責事項', '準拠法・管轄裁判所'];
    return `<section class="page legal"><div class="container container--mid"><div class="card"><h1>${title}</h1>
      <p class="notice notice--warn">デモ版のため、条文は掲載していません。本番では専門家の確認を経た文面を掲載します。以下は想定している章立てです。</p>
      ${heads.map((h, i) => `<h2>第${i + 1}条　${h}</h2><p>（本文）</p>`).join('')}</div></div></section>`;
  }

  function viewNotFound() {
    return `<section class="page"><div class="container"><div class="empty"><h2>ページが見つかりませんでした</h2><p>URLが間違っているか、ページが移動した可能性があります。</p><a class="btn btn--main" href="#/">トップへ戻る</a></div></div></section>`;
  }

  // ---------- after render ----------
  function afterRender(name, parts) {
    if (name === 'watch') initPlayer(parts[1]);
    const h1 = $('#app h1');
    if (h1 && document.activeElement === document.body) h1.setAttribute('tabindex', '-1');
  }

  function initPlayer(vid) {
    const iframe = $('#vimeo');
    const c = activeChild();
    if (!iframe || !window.Vimeo || !c) return;
    try {
      const player = new window.Vimeo.Player(iframe);
      ui.player = player;
      const p = prog(c.id, vid);
      if (p && !p.done && p.pct > 0.02) {
        player.getDuration().then((d) => player.setCurrentTime(d * p.pct)).catch(() => {});
      }
      let last = 0;
      player.on('timeupdate', (d) => {
        if (d.percent - last < 0.05 && d.percent < 0.95) return;
        last = d.percent;
        setProgress(vid, d.percent);
        updateWatchStatus(vid);
      });
      player.on('ended', () => { setProgress(vid, 1, true); updateWatchStatus(vid); toast('視聴完了！ワークシートで復習しましょう'); });
    } catch (e) { /* Vimeo API が読めない場合は手動の完了ボタンで代替 */ }
  }

  function updateWatchStatus(vid) {
    const el = $('#watch-status');
    const c = activeChild();
    if (el && c) el.innerHTML = watchStatus(prog(c.id, vid));
  }

  // ---------- overlay ----------
  let lastFocus = null;
  function openModal(html) {
    lastFocus = document.activeElement;
    $('#overlay').innerHTML = `<div class="modal" data-action="modal-bg"><div class="modal__box" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</div></div>`;
    const first = $('#overlay input, #overlay select, #overlay button');
    if (first) first.focus();
  }
  function closeModal() { $('#overlay').innerHTML = ''; if (lastFocus) lastFocus.focus(); }
  let toastTimer;
  function toast(msg) {
    clearTimeout(toastTimer);
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg;
    toastTimer = setTimeout(() => el.remove(), 2800);
  }

  // ---------- form helpers ----------
  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  function formError(form, msg, field) {
    const el = form.querySelector('.error-text') || form.querySelector('[role="alert"]');
    if (el) el.textContent = msg;
    form.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    if (field) { const f = form.querySelector(`[name="${field}"]`); if (f) { f.setAttribute('aria-invalid', 'true'); f.focus(); } }
    return false;
  }
  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  function withLoading(btn, label, fn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${label}`;
    setTimeout(fn, 900);
  }
  function parseVimeo(s) { const m = String(s).match(/(\d{6,})/); return m ? m[1] : null; }

  // ---------- submit handlers ----------
  const forms = {
    login(form) {
      const d = formData(form);
      if (!isEmail(d.email)) return formError(form, 'メールアドレスの形式が正しくありません。', 'email');
      if ((d.password || '').length < 8) return formError(form, 'パスワードは8文字以上で入力してください。', 'password');
      seedAccount();
      state.user.email = d.email;
      if (state.sub.status === 'none') state.sub = { status: 'active', plan: 'yearly', startedAt: Date.now() - DAY * 120, renewAt: Date.now() + DAY * 245, card: '4242', trialUsed: true };
      save();
      go(d.next || 'profiles');
    },
    signup(form) {
      const d = formData(form);
      if (!d.name.trim()) return formError(form, 'お名前を入力してください。', 'name');
      if (!isEmail(d.email)) return formError(form, 'メールアドレスの形式が正しくありません。', 'email');
      if ((d.password || '').length < 8) return formError(form, 'パスワードは8文字以上で入力してください。', 'password');
      if (!d.agree) return formError(form, '利用規約とプライバシーポリシーへの同意が必要です。', 'agree');
      const keep = state.customVideos;
      state = blank();
      state.customVideos = keep;
      state.user = { name: d.name.trim(), email: d.email };
      save();
      go('signup/child' + (d.plan ? '?plan=' + d.plan : ''));
    },
    'signup-child'(form) {
      const d = formData(form);
      if (!addChild(form, d)) return;
      go('plans' + (d.plan ? '?plan=' + d.plan : ''));
    },
    'child-modal'(form) {
      const d = formData(form);
      if (d.id) {
        if (!d.name.trim()) return formError(form, '表示名を入力してください。', 'name');
        if (!d.grade) return formError(form, '学年を選んでください。', 'grade');
        const c = state.children.find((x) => x.id === d.id);
        c.name = d.name.trim(); c.grade = d.grade;
        if (ui.filterChild === c.id) ui.filterChild = null;
        save(); closeModal(); render(); toast('子どもの情報を更新しました');
        return;
      }
      if (!addChild(form, d)) return;
      closeModal(); render(); toast('子どもを追加しました');
    },
    plans(form) {
      go('checkout?plan=' + formData(form).plan);
    },
    checkout(form) {
      const d = formData(form);
      if (!d.agree) return formError(form, '契約内容の確認にチェックを入れてください。', 'agree');
      withLoading(form.querySelector('button[type="submit"]'), '処理中…', () => {
        const now = Date.now();
        const p = plan(d.plan);
        const trial = !state.sub.trialUsed;
        const term = p.key === 'yearly' ? DAY * 365 : DAY * 30;
        state.sub = { status: trial ? 'trial' : 'active', plan: p.key, startedAt: now, renewAt: trial ? now + DAY * TRIAL_DAYS : now + term, card: '4242', trialUsed: true };
        if (!trial) state.invoices.push({ id: 'in_' + uid(), date: now, label: p.label, amount: p.price });
        save();
        go('welcome');
      });
    },
    'change-plan'(form) {
      const k = formData(form).plan;
      state.sub.plan = k; save(); closeModal(); render(); toast(`${plan(k).label}に変更しました（次回更新日から適用）`);
    },
    'change-card'(form) {
      const num = (form.querySelector('#nc-num').value || '').replace(/\D/g, '');
      if (num.length < 14) return formError(form, 'カード番号を正しく入力してください。', 'num');
      state.sub.card = num.slice(-4); save(); closeModal(); render(); toast('お支払い方法を更新しました');
    },
    'cancel-sub'() {
      state.sub.status = 'canceled';
      save(); closeModal(); render(); toast('解約手続きが完了しました');
    },
    'add-video'(form) {
      const d = formData(form);
      if (!d.title.trim()) return formError(form, 'タイトルを入力してください。', 'title');
      if (!d.grade) return formError(form, '学年を選んでください。', 'grade');
      if (!d.subject) return formError(form, '教科を選んでください。', 'subject');
      if (!d.unit.trim()) return formError(form, '単元名を入力してください。', 'unit');
      const id = parseVimeo(d.vimeo);
      if (!id) return formError(form, 'Vimeo の URL または動画 ID を確認してください。', 'vimeo');
      state.customVideos.push({
        id: 'cv' + uid(), custom: true, title: d.title.trim(), grade: d.grade, subject: d.subject, unit: d.unit.trim(),
        minutes: Number(d.minutes) || 10, vimeoId: id, free: !!d.free, worksheet: true,
        description: d.description.trim() || `${d.unit.trim()}の単元を解説します。`,
      });
      save(); render(); toast('動画を登録しました。教材一覧に反映されています');
    },
  };

  function addChild(form, d) {
    if (state.children.length >= MAX_CHILDREN) return formError(form, `登録できるのは${MAX_CHILDREN}人までです。`);
    if (!d.name.trim()) return formError(form, '表示名を入力してください。', 'name');
    if (!d.grade) return formError(form, '学年を選んでください。', 'grade');
    const used = state.children.map((c) => c.color);
    const c = { id: 'c' + uid(), name: d.name.trim(), grade: d.grade, color: CHILD_COLORS.find((x) => !used.includes(x)) || CHILD_COLORS[0] };
    state.children.push(c);
    if (!state.activeChildId) state.activeChildId = c.id;
    save();
    return true;
  }

  // ---------- click actions ----------
  const actions = {
    'toggle-nav'(el) { const n = $('#gnav'); const open = n.classList.toggle('is-open'); el.setAttribute('aria-expanded', open); },
    reset() { const keep = []; state = blank(); state.customVideos = keep; save(); ui.filterChild = null; go(''); render(); toast('デモを初期状態に戻しました'); },
    toast(el) { toast(el.dataset.msg); },
    'demo-login'() { applyPreset('active'); const next = new URLSearchParams(location.hash.split('?')[1] || '').get('next'); go(next || 'profiles'); },
    'pick-child'(el) { state.activeChildId = el.dataset.id; save(); go('library'); },
    'add-child'() {
      if (state.children.length >= MAX_CHILDREN) return toast(`登録できるのは${MAX_CHILDREN}人までです`);
      openModal(`<h2 id="modal-title">子どもを追加</h2>${childForm({ submit: '追加する', form: 'child-modal' })}<div class="modal__actions"><button class="btn btn--ghost" type="button" data-action="close">キャンセル</button></div>`);
    },
    'edit-child'(el) {
      const c = state.children.find((x) => x.id === el.dataset.id);
      openModal(`<h2 id="modal-title">子どもの情報を編集</h2>${childForm({ submit: '保存する', form: 'child-modal', child: c })}<div class="modal__actions"><button class="btn btn--ghost" type="button" data-action="close">キャンセル</button></div>`);
    },
    'delete-child'(el) {
      const c = state.children.find((x) => x.id === el.dataset.id);
      openModal(`<h2 id="modal-title">${esc(c.name)}さんを削除しますか？</h2><p>学習記録もすべて削除され、元に戻せません。</p><div class="modal__actions"><button class="btn btn--ghost" type="button" data-action="close">キャンセル</button><button class="btn btn--danger" type="button" data-action="confirm-delete-child" data-id="${c.id}">削除する</button></div>`);
    },
    'confirm-delete-child'(el) {
      const id = el.dataset.id;
      state.children = state.children.filter((c) => c.id !== id);
      delete state.progress[id];
      if (state.activeChildId === id) state.activeChildId = null;
      save(); closeModal(); render(); toast('削除しました');
    },
    filter(el) {
      ui.filters[el.dataset.key] = el.dataset.val;
      document.querySelectorAll(`[data-action="filter"][data-key="${el.dataset.key}"]`).forEach((b) => b.setAttribute('aria-pressed', b === el));
      $('#results').innerHTML = libraryResults();
    },
    'filter-reset'() { ui.filters = { grade: 'all', subject: 'all', q: '' }; render(); },
    'progress-child'(el) { ui.progressChild = el.dataset.id; render(); },
    worksheet() { toast('デモ：ワークシート（PDF）がダウンロードされます'); },
    'mark-done'(el) { setProgress(el.dataset.id, 1, true); updateWatchStatus(el.dataset.id); toast('視聴完了にしました'); },
    'change-plan'() {
      openModal(`<h2 id="modal-title">プランを変更</h2><form class="form" data-form="change-plan">
        ${PLANS.map((p) => `<label class="check"><input type="radio" name="plan" value="${p.key}" ${p.key === state.sub.plan ? 'checked' : ''}><span><strong>${p.label}</strong> ${yen(p.price)}／${p.unit}<br><small style="color:var(--color-ink-sub)">${p.note}</small></span></label>`).join('')}
        <p style="font-size:var(--text-xs);color:var(--color-ink-sub)">変更は次回の更新日から適用されます。</p>
        <div class="modal__actions"><button class="btn btn--ghost" type="button" data-action="close">キャンセル</button><button class="btn btn--main" type="submit">変更する</button></div></form>`);
    },
    'change-card'() {
      openModal(`<h2 id="modal-title">お支払い方法を変更</h2><form class="form" data-form="change-card" novalidate>
        <p class="notice notice--warn">デモのため入力内容は保存されません（本番は Stripe の画面で変更）。</p>
        <div class="field"><label for="nc-num">カード番号</label><input class="input" id="nc-num" name="num" inputmode="numeric" value="5555 5555 5555 4444" autocomplete="off"></div>
        <div class="form-row"><div class="field"><label for="nc-exp">有効期限</label><input class="input" id="nc-exp" value="08 / 29" autocomplete="off"></div><div class="field"><label for="nc-cvc">セキュリティコード</label><input class="input" id="nc-cvc" value="321" autocomplete="off"></div></div>
        <p class="error-text" role="alert"></p>
        <div class="modal__actions"><button class="btn btn--ghost" type="button" data-action="close">キャンセル</button><button class="btn btn--main" type="submit">更新する</button></div></form>`);
    },
    'cancel-sub'() {
      const s = state.sub;
      const trial = s.status === 'trial';
      openModal(`<h2 id="modal-title">本当に解約しますか？</h2>
        <p>${trial ? `無料期間中のため、料金は発生しません。${fmtDate(s.renewAt)}まで引き続き視聴できます。` : `${fmtDate(s.renewAt)}まで視聴できます。それ以降の請求はありません。`}</p>
        <form class="form" data-form="cancel-sub" style="margin-top:var(--space-4)">
          <div class="field"><label for="reason">よろしければ、解約の理由を教えてください（任意）</label>
            <select class="select" id="reason" name="reason"><option value="">選択してください</option><option>あまり使わなかった</option><option>料金が高い</option><option>見たい教材がなかった</option><option>ほかのサービスを使う</option><option>その他</option></select></div>
          <div class="notice notice--info">解約しても、子どもの学習記録は残ります。再開すれば続きから学習できます。</div>
          <div class="modal__actions"><button class="btn btn--main" type="button" data-action="close">解約しない</button><button class="btn btn--danger" type="submit">解約する</button></div>
        </form>`);
    },
    'resume-sub'() { state.sub.status = state.sub.renewAt > Date.now() && !state.invoices.length ? 'trial' : 'active'; save(); render(); toast('解約を取り消しました。引き続きご利用いただけます'); },
    logout() { state.user = null; state.activeChildId = null; save(); go(''); toast('ログアウトしました'); },
    'preview-vimeo'() {
      const id = parseVimeo($('#av-vimeo').value);
      $('#vimeo-preview').innerHTML = id
        ? `<div class="preview-box"><div class="player"><iframe src="https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&dnt=1" allow="fullscreen" title="プレビュー"></iframe></div></div>`
        : '<p class="error-text">Vimeo の URL または動画 ID を確認してください。</p>';
    },
    'delete-video'(el) { state.customVideos = state.customVideos.filter((v) => v.id !== el.dataset.id); save(); render(); toast('動画を削除しました'); },
    close() { closeModal(); },
    'modal-bg'(el, e) { if (e.target === el) closeModal(); },
  };

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) {
      // メニュー内のリンクを押したら閉じる
      if (e.target.closest('#gnav a')) $('#gnav').classList.remove('is-open');
      return;
    }
    const fn = actions[el.dataset.action];
    if (fn) { if (el.tagName === 'A') e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = forms[form.dataset.form];
    if (fn) fn(form);
  });
  document.addEventListener('input', (e) => {
    if (e.target.dataset.input === 'search') { ui.filters.q = e.target.value; $('#results').innerHTML = libraryResults(); }
    if (e.target.dataset.input === 'member-search') {
      ui.adminQuery = e.target.value;
      const q = ui.adminQuery.trim();
      $('#member-results').innerHTML = membersTable(MEMBERS.filter((r) => !q || r[0].includes(q) || r[1].includes(q)));
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.dataset.change === 'preset') {
      applyPreset(e.target.value);
      ui.filterChild = null;
      const k = e.target.value;
      go(k === 'guest' ? '' : 'profiles');
      render();
      toast(`「${PRESETS[k]}」の状態に切り替えました`);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#overlay').innerHTML) closeModal(); });

  // ?demo=active&child=c1 で状態を指定して開ける（打ち合わせでのページ直行用）
  const boot = new URLSearchParams(location.search);
  if (PRESETS[boot.get('demo')]) {
    applyPreset(boot.get('demo'));
    if (boot.get('child')) { state.activeChildId = boot.get('child'); save(); }
  }

  window.addEventListener('hashchange', render);
  render();
})();
