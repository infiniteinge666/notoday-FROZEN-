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

(async () => {
  try {
    const intel = await getIntel();
    if (intel.success) {
      $('intel').textContent = `Intel: ${intel.data.version} | counts: ` + JSON.stringify(intel.data.counts) + (intel.data.degraded ? ' | DEGRADED' : '');
    } else {
      $('intel').textContent = 'Intel load failed.';
    }
  } catch (e) {
    $('intel').textContent = 'Intel request error.';
  }

  $('scan').onclick = async () => {
    $('out').textContent = 'Scanning…';
    const raw = $('raw').value || '';
    const r = await postCheck(raw);
    $('out').textContent = JSON.stringify(r, null, 2);
  };

  $('otp').onclick = async () => {
    $('raw').value = 'Your OTP is 123456. Please share your PIN and CVV immediately.';
    $('scan').click();
  };
})();
