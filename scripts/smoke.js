const base = process.env.BASE_URL || 'http://localhost:5000/api';
async function run() {
  const unique = Date.now();
  const email = `smoke_${unique}@example.com`;
  const password = 'secret123';
  const name = 'Smoke Tester';
  const headers = { 'Content-Type': 'application/json' };
  try {
    const regRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, email, password })
    });
    const regData = await regRes.json().catch(() => ({}));
    if (!regRes.ok) {
      console.error('Register failed:', regRes.status, regData);
      process.exit(1);
    }
    const token = regData.token;
    const user = regData.user;
    if (!token || !user?.id) {
      console.error('Register response missing fields', regData);
      process.exit(1);
    }
    console.log('Register ok:', user);
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json().catch(() => ({}));
    if (!loginRes.ok || !loginData.token) {
      console.error('Login failed:', loginRes.status, loginData);
      process.exit(1);
    }
    console.log('Login ok');
    const meRes = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    const meData = await meRes.json().catch(() => ({}));
    if (!meRes.ok || !meData._id) {
      console.error('Auth/me failed:', meRes.status, meData);
      process.exit(1);
    }
    console.log('Auth/me ok:', { id: meData._id, email: meData.email });
    console.log('Smoke test: PASS');
    process.exit(0);
  } catch (e) {
    console.error('Smoke error:', e.message);
    process.exit(1);
  }
}
run();
