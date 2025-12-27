async function getIntel() {
  const res = await fetch('/intel', { cache: 'no-store' });
  return await res.json();
}

async function postCheck(raw) {
  const res = await fetch('/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  return await res.json();
}

const $ = (id) => document.getElementById(id);

function setBandUI(band) {
  const root = document.documentElement;

  root.classList.remove('band-safe', 'band-suspicious', 'band-critical');

  if (band === 'CRITICAL') root.classList.add('band-critical');
  else if (band === 'SUSPICIOUS') root.classList.add('band-suspicious');
  else root.classList.add('band-safe');

  $('bandLabel').textContent = band || 'SAFE';
}

function setTagline(band) {
  const t = $('tagline');
  if (!t) return;

  if (band === 'CRITICAL') t.textContent = 'Stop. This looks dangerous.';
  else if (band === 'SUSPICIOUS') t.textContent = 'Pause. Something feels off.';
  else t.textContent = 'You’re safe. Let’s check it.';
}

function renderList(ul, items, emptyFallback) {
  ul.innerHTML = '';
  const list = Array.isArray(items) ? items : [];
  const finalItems = list.length ? list : [emptyFallback];

  for (const s of finalItems) {
    const li = document.createElement('li');
    li.textContent = String(s);
    ul.appendChild(li);
  }
}

function emphasizeResult() {
  const el = $('result');
  el.classList.remove('pop');
  // reflow to restart animation
  void el.offsetWidth;
  el.classList.add('pop');
}

function setLoading(isLoading) {
  const btn = $('scanBtn');
  btn.disabled = isLoading;
  btn.classList.toggle('loading', isLoading);
  btn.textContent = isLoading ? 'CHECKING…' : 'CHECK';
}

function showResult() {
  const r = $('result');
  r.hidden = false;
  r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

(async () => {
  // Intel banner
  try {
    const intel = await getIntel();
    if (intel && intel.success && intel.data) {
      $('intel').textContent =
        `Intel: ${intel.data.version} | counts: ` +
        JSON.stringify(intel.data.counts) +
        (intel.data.degraded ? ' | DEGRADED' : '');
    } else {
      $('intel').textContent = 'Intel load failed.';
    }
  } catch {
    $('intel').textContent = 'Intel request error.';
  }

  // Clear button
  const raw = $('raw');
  $('clearBtn').onclick = () => {
    raw.value = '';
    raw.focus();
  };

  // Ctrl/Cmd + Enter to scan
  raw.addEventListener('keydown', (e) => {
    const isEnter = e.key === 'Enter';
    const mod = e.ctrlKey || e.metaKey;
    if (isEnter && mod) $('scanBtn').click();
  });

  // Main scan
  $('scanBtn').onclick = async () => {
    const text = (raw.value || '').trim();

    // No dark patterns: gentle nudge only
    if (!text) {
      setBandUI('SAFE');
      setTagline('SAFE');
      $('scoreNum').textContent = '0';
      $('resultTitle').textContent = 'Paste something to scan.';
      renderList($('reasons'), ['No content provided.'], 'No reasons.');
      renderList($('dont'), ['Don’t act on messages you haven’t verified.'], 'No guidance.');
      $('out').textContent = '';
      showResult();
      emphasizeResult();
      return;
    }

    setLoading(true);
    try {
      const res = await postCheck(text);

      // Keep debug JSON
      $('out').textContent = JSON.stringify(res, null, 2);

      const data = res && res.data ? res.data : {};
      const band = data.band || 'SAFE';
      const score = Number.isFinite(data.score) ? data.score : 0;

      setBandUI(band);
      setTagline(band);

      $('scoreNum').textContent = String(score);

      // Title copy
      if (band === 'CRITICAL') $('resultTitle').textContent = 'High-risk markers detected.';
      else if (band === 'SUSPICIOUS') $('resultTitle').textContent = 'Some risk markers detected.';
      else $('resultTitle').textContent = 'No high-risk markers detected.';

      renderList(
        $('reasons'),
        data.reasons,
        'No high-risk markers detected in the provided content.'
      );

      renderList(
        $('dont'),
        data.whatNotToDo,
        'Still verify the sender before acting on anything.'
      );

      showResult();
      emphasizeResult();
    } catch (e) {
      setBandUI('SUSPICIOUS');
      setTagline('SUSPICIOUS');
      $('scoreNum').textContent = '0';
      $('resultTitle').textContent = 'Scan failed to run.';
      renderList($('reasons'), ['Request error or server unavailable.'], 'No reasons.');
      renderList($('dont'), ['Try again later. Don’t act on the message in the meantime.'], 'No guidance.');
      $('out').textContent = String(e && e.message ? e.message : e);
      showResult();
      emphasizeResult();
    } finally {
      setLoading(false);
    }
  };

  // OTP test
  $('otp').onclick = async () => {
    raw.value = 'Your OTP is 123456. Please share your PIN and CVV immediately.';
    $('scanBtn').click();
  };
})();
