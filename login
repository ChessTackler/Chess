<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Chess Tackler — Log In</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --black: #0a0a0c; --black-card: #111116; --black-input: #1e1e27;
      --white: #ffffff; --white-dim: #c8cdd8; --white-muted: #6b7280;
      --blue: #3b82f6; --blue-bright: #60a5fa; --blue-dark: #1d4ed8;
      --blue-glow: rgba(59,130,246,0.18); --border: rgba(255,255,255,0.07);
      --border-focus: rgba(59,130,246,0.6); --error: #f87171; --success: #34d399;
    }
    html, body { min-height:100vh; font-family:'DM Sans',system-ui,sans-serif; background:var(--black); color:var(--white); overflow-x:hidden; }
    .bg-chess { position:fixed; inset:0; z-index:0; pointer-events:none; display:grid; grid-template-columns:repeat(16,1fr); grid-template-rows:repeat(10,1fr); overflow:hidden; }
    .bg-chess .tile { width:100%; height:100%; }
    .bg-chess .tile.w { background:rgba(255,255,255,0.025); }
    .bg-chess .tile.b { background:transparent; }
    .bg-beam { position:fixed; inset:0; z-index:0; pointer-events:none;
      background: radial-gradient(ellipse 55% 70% at 25% 50%, rgba(59,130,246,0.09) 0%, transparent 65%), radial-gradient(ellipse 30% 40% at 90% 20%, rgba(59,130,246,0.05) 0%, transparent 60%); }
    .page { position:relative; z-index:1; min-height:100vh; display:grid; grid-template-columns:1fr 1fr; }
    .left-panel { display:flex; align-items:center; justify-content:center; padding:60px 48px; }
    .form-wrap { width:100%; max-width:420px; position:relative; }
    .form-header { margin-bottom:36px; }
    .form-title { font-family:'Cinzel',serif; font-size:1.6rem; font-weight:700; letter-spacing:0.04em; color:var(--white); margin-bottom:8px; }
    .form-sub { font-size:0.88rem; font-weight:300; color:var(--white-muted); }
    .form-sub a { color:var(--blue-bright); text-decoration:none; font-weight:500; transition:color 0.2s; }
    .form-sub a:hover { color:var(--white); }
    .form-divider { display:flex; align-items:center; gap:12px; margin-bottom:28px; }
    .form-divider::before, .form-divider::after { content:''; flex:1; height:1px; background:var(--border); }
    .form-divider span { font-size:0.7rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--white-muted); font-family:'Cinzel',serif; }
    .fields { display:flex; flex-direction:column; gap:18px; margin-bottom:24px; }
    .field { position:relative; }
    .field-label { display:block; font-size:0.72rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:var(--white-muted); margin-bottom:7px; transition:color 0.2s; }
    .field:focus-within .field-label { color:var(--blue-bright); }
    .input-row { position:relative; display:flex; align-items:center; }
    .input-icon { position:absolute; left:13px; display:flex; align-items:center; color:var(--white-muted); transition:color 0.2s; pointer-events:none; z-index:1; }
    .field:focus-within .input-icon { color:var(--blue-bright); }
    .field input { width:100%; background:var(--black-input); border:1px solid var(--border); border-radius:10px; padding:12px 40px; font-family:'DM Sans',sans-serif; font-size:0.95rem; color:var(--white); outline:none; transition:border-color 0.25s, box-shadow 0.25s, background 0.25s; }
    .field input::placeholder { color:#3a3a4a; }
    .field input:focus { border-color:var(--border-focus); background:#1a1a24; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
    .field input.is-error { border-color:rgba(248,113,113,0.5); box-shadow:0 0 0 3px rgba(248,113,113,0.08); }
    .err-text { font-size:0.75rem; color:var(--error); margin-top:5px; min-height:13px; display:block; padding-left:2px; }
    .pw-toggle { position:absolute; right:13px; background:none; border:none; cursor:pointer; color:var(--white-muted); padding:4px; display:flex; align-items:center; transition:color 0.2s; z-index:1; }
    .pw-toggle:hover { color:var(--blue-bright); }
    .form-options { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .remember-label { display:flex; align-items:center; gap:8px; font-size:0.82rem; color:var(--white-muted); cursor:pointer; user-select:none; }
    .remember-label input[type="checkbox"] { width:15px; height:15px; accent-color:var(--blue); cursor:pointer; }
    .forgot-link { font-size:0.82rem; color:var(--blue-bright); text-decoration:none; font-weight:500; transition:color 0.2s; }
    .forgot-link:hover { color:var(--white); }
    .global-error { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:var(--error); margin-bottom:18px; display:none; }
    .global-error.show { display:block; animation:shake 0.4s ease; }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
    .submit-btn { position:relative; overflow:hidden; width:100%; padding:14px; background:linear-gradient(135deg,var(--blue-dark) 0%,var(--blue) 50%,var(--blue-dark) 100%); background-size:200% 100%; background-position:100% 0; border:none; border-radius:10px; font-family:'Cinzel',serif; font-size:0.85rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#fff; cursor:pointer; transition:background-position 0.4s ease, transform 0.2s, box-shadow 0.3s; box-shadow:0 4px 20px rgba(59,130,246,0.3); }
    .submit-btn:hover { background-position:0% 0; transform:translateY(-2px); box-shadow:0 8px 32px rgba(59,130,246,0.45); }
    .submit-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%); transform:translateX(-100%); transition:transform 0.5s ease; }
    .submit-btn:hover::after { transform:translateX(100%); }
    .terms { margin-top:16px; font-size:0.75rem; color:#3e3e52; text-align:center; line-height:1.6; }
    .right-panel { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; padding:60px 64px; border-left:1px solid var(--border); position:relative; overflow:hidden; }
    .right-panel::before { content:''; position:absolute; inset:0; background:linear-gradient(225deg,rgba(59,130,246,0.06) 0%,transparent 60%); pointer-events:none; }
    .deco-piece { position:absolute; bottom:-20px; left:-30px; font-size:22rem; color:rgba(255,255,255,0.02); line-height:1; user-select:none; pointer-events:none; }
    .accent-bar { width:48px; height:4px; background:linear-gradient(90deg,var(--blue),var(--blue-bright)); border-radius:2px; margin-bottom:28px; }
    .brand-logo-img { height:52px; width:auto; object-fit:contain; margin-bottom:32px; filter:brightness(1.1); }
    .right-tagline { font-family:'Cinzel',serif; font-size:clamp(1.6rem,2.5vw,2.4rem); font-weight:700; line-height:1.25; letter-spacing:0.02em; color:var(--white); margin-bottom:16px; }
    .right-tagline .blue { color:var(--blue-bright); }
    .right-sub { font-size:1rem; font-weight:300; color:var(--white-muted); line-height:1.7; max-width:320px; margin-bottom:40px; }
    .stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%; max-width:300px; }
    .stat-card { background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:16px; transition:border-color 0.2s; }
    .stat-card:hover { border-color:rgba(59,130,246,0.3); }
    .stat-num { font-family:'Cinzel',serif; font-size:1.5rem; font-weight:700; color:var(--blue-bright); display:block; margin-bottom:4px; }
    .stat-label { font-size:0.75rem; color:var(--white-muted); }
    .success-overlay { display:none; position:absolute; inset:0; background:var(--black-card); flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px; z-index:20; }
    .success-overlay.show { display:flex; animation:fadeUp 0.5s ease forwards; }
    .success-icon-wrap { width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg,var(--blue-dark),var(--blue)); display:flex; align-items:center; justify-content:center; font-size:2rem; margin-bottom:20px; box-shadow:0 0 40px rgba(59,130,246,0.4); animation:pulsate 2s ease-in-out infinite; }
    @keyframes pulsate { 0%,100%{box-shadow:0 0 30px rgba(59,130,246,0.35)} 50%{box-shadow:0 0 55px rgba(59,130,246,0.6)} }
    .success-title { font-family:'Cinzel',serif; font-size:1.4rem; font-weight:700; color:var(--white); letter-spacing:0.06em; margin-bottom:10px; }
    .success-username { font-family:'Cinzel',serif; font-size:1.1rem; color:var(--blue-bright); font-weight:700; margin-bottom:6px; }
    .success-msg { font-size:0.95rem; color:var(--white-muted); line-height:1.6; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .right-panel { animation:fadeUp 0.7s ease 0.1s both; }
    .form-wrap { animation:fadeUp 0.7s ease 0.2s both; }
    .field { opacity:0; animation:fadeUp 0.45s ease forwards; }
    .field:nth-child(1) { animation-delay:0.4s; }
    .field:nth-child(2) { animation-delay:0.5s; }
    .submit-btn { opacity:0; animation:fadeUp 0.45s ease 0.65s forwards; }
    @media (max-width:768px) { .page{grid-template-columns:1fr} .right-panel{display:none} .left-panel{padding:48px 28px} }
  </style>
</head>
<body>
  <div class="bg-chess" id="bgChess"></div>
  <div class="bg-beam"></div>
  <div class="page">

    <!-- Login Form -->
    <div class="left-panel">
      <div class="form-wrap">
        <div class="success-overlay" id="successOverlay">
          <div class="success-icon-wrap">♟</div>
          <div class="success-title">Welcome Back!</div>
          <div class="success-username" id="successUsername"></div>
          <p class="success-msg">Login successful.<br>Taking you to your dashboard…</p>
        </div>
        <div class="form-header">
          <h1 class="form-title">Welcome Back</h1>
          <p class="form-sub">New here? <a href="authentication.html">Create an account →</a></p>
        </div>
        <div class="form-divider"><span>Log In</span></div>
        <div class="global-error" id="globalError">✕ &nbsp;No account found with those credentials. Please check and try again.</div>
        <form id="loginForm" novalidate>
          <div class="fields">
            <div class="field">
              <label class="field-label" for="identifier">Username or Email</label>
              <div class="input-row">
                <span class="input-icon">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/></svg>
                </span>
                <input type="text" id="identifier" placeholder="GrandmasterX or you@example.com" autocomplete="username"/>
              </div>
              <span class="err-text" id="identifier-err"></span>
            </div>
            <div class="field">
              <label class="field-label" for="password">Password</label>
              <div class="input-row">
                <span class="input-icon">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                </span>
                <input type="password" id="password" placeholder="Your password" autocomplete="current-password"/>
                <button type="button" class="pw-toggle" id="togglePw" aria-label="Toggle password">
                  <svg id="eyeIcon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <span class="err-text" id="password-err"></span>
            </div>
          </div>
          <div class="form-options">
            <label class="remember-label"><input type="checkbox" id="rememberMe" checked/> Remember me</label>
            <a href="#" class="forgot-link">Forgot password?</a>
          </div>
          <button type="submit" class="submit-btn">Log In to Arena</button>
          <p class="terms">Protected by our <a href="Policy.html" style="color:#4b5568;text-decoration:underline;">Privacy Policy</a></p>
        </form>
      </div>
    </div>

    <!-- Branding -->
    <div class="right-panel">
      <div class="deco-piece">♜</div>
      <img src="CT logo.png" alt="Chess Tackler" class="brand-logo-img" onerror="this.style.display='none'"/>
      <div class="accent-bar"></div>
      <h2 class="right-tagline">Return to<br>your <span class="blue">arena.</span></h2>
      <p class="right-sub">Pick up where you left off. Your puzzles, rankings, and progress are waiting for you.</p>
      <div class="stat-grid">
        <div class="stat-card"><span class="stat-num">10K+</span><span class="stat-label">Active Players</span></div>
        <div class="stat-card"><span class="stat-num">500+</span><span class="stat-label">Tactics Puzzles</span></div>
        <div class="stat-card"><span class="stat-num">100%</span><span class="stat-label">Free Forever</span></div>
        <div class="stat-card"><span class="stat-num">&#8734;</span><span class="stat-label">Games to Explore</span></div>
      </div>
    </div>

  </div>
  <script>
    const bg = document.getElementById('bgChess');
    for (let row = 0; row < 10; row++)
      for (let col = 0; col < 16; col++) {
        const t = document.createElement('div');
        t.className = 'tile ' + ((row + col) % 2 === 0 ? 'w' : 'b');
        bg.appendChild(t);
      }

    const password = document.getElementById('password');
    document.getElementById('togglePw').addEventListener('click', () => {
      const isText = password.type === 'text';
      password.type = isText ? 'password' : 'text';
      document.getElementById('eyeIcon').innerHTML = isText
        ? '<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><circle cx="12" cy="12" r="3"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>';
    });

    document.getElementById('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const identifier = document.getElementById('identifier').value.trim();
      const pw = document.getElementById('password').value;
      const remember = document.getElementById('rememberMe').checked;
      const globalErr = document.getElementById('globalError');
      let ok = true;

      globalErr.classList.remove('show');
      document.getElementById('identifier').classList.remove('is-error');
      document.getElementById('password').classList.remove('is-error');
      document.getElementById('identifier-err').textContent = '';
      document.getElementById('password-err').textContent = '';

      if (!identifier) {
        document.getElementById('identifier').classList.add('is-error');
        document.getElementById('identifier-err').textContent = 'Please enter your username or email';
        ok = false;
      }
      if (!pw) {
        document.getElementById('password').classList.add('is-error');
        document.getElementById('password-err').textContent = 'Please enter your password';
        ok = false;
      }
      if (!ok) return;

      const users = JSON.parse(localStorage.getItem('ct_users') || '[]');
      const found = users.find(u =>
        (u.username.toLowerCase() === identifier.toLowerCase() ||
         u.email.toLowerCase() === identifier.toLowerCase()) &&
        u.password === pw
      );

      if (!found) {
        globalErr.classList.add('show');
        document.getElementById('identifier').classList.add('is-error');
        document.getElementById('password').classList.add('is-error');
        return;
      }

      const sessionData = {
        username: found.username,
        email: found.email,
        contact: found.contact || '—',
        joinedAt: found.joinedAt,
        loggedInAt: new Date().toLocaleString()
      };

      if (remember) {
        localStorage.setItem('ct_current_user', JSON.stringify(sessionData));
      } else {
        sessionStorage.setItem('ct_current_user', JSON.stringify(sessionData));
      }

      // Flag for welcome toast on index.html
      sessionStorage.setItem('ct_just_logged_in', '1');

      document.getElementById('successUsername').textContent = found.username;
      document.getElementById('successOverlay').classList.add('show');
      setTimeout(() => { window.location.href = 'index.html'; }, 2400);
    });
  </script>
</body>
</html>