async function getIntel() {
  const res = await fetch('/intel');
  const j = await res.json();
  return j;
}

async function postCheck(raw) {
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({ raw })
  });
  const j = await res.json();
  return j;
}

const $ = (id) => document.getElementById(id);

function setBandUI(resp) {
  const band = resp?.data?.band || 'SAFE';
  const out = $('out');

  // band state for CSS
  out.setAttribute('data-band', band);

  // subtle emphasis animation
  out.classList.remove('result-pop');
  void out.offsetWidth; // restart animation reliably
  out.classList.add('result-pop');
}

(async () => {
  try {
    const intel = await getIntel();
    if (intel.success) {
      $('intel').textContent =
        `Intel: ${intel.data.version} | counts: ` +
        JSON.stringify(intel.data.counts) +
        (intel.data.degraded ? ' | DEGRADED' : '');
    } else {
      $('intel').textContent = 'Intel load failed.';
    }
  } catch (e) {
    $('intel').textContent = 'Intel request error.';
  }

  $('scan').onclick = async () => {
    const raw = $('raw').value || '';

    $('out').textContent = 'Scanning…';
    $('out').removeAttribute('data-band'); // reset while scanning
    $('out').classList.remove('result-pop');

    let r;
    try {
      r = await postCheck(raw);
    } catch (e) {
      r = {
        success: false,
        error: 'Network error',
        details: String(e)
      };
    }

    $('out').textContent = JSON.stringify(r, null, 2);

    // apply band state + animation only on success payloads
    setBandUI(r);

    // optional: bring result into view
    $('out').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  $('otp').onclick = async () => {
    $('raw').value = 'Your OTP is 123456. Please share your PIN and CVV immediately.';
    $('scan').click();
  };
})();
