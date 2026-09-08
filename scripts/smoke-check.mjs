const base = process.env.SMOKE_URL || 'http://127.0.0.1:8787';
const checks = ['/', '/manifest.webmanifest', '/service-worker.js', '/src/mobile.css'];
for (const path of checks) {
  const response = await fetch(base + path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const body = await response.text();
  if (!body.trim()) throw new Error(`${path}: empty response`);
  console.log(`PASS ${path} ${response.status}`);
}
const manifest = await (await fetch(base + '/manifest.webmanifest')).json();
if (manifest.display !== 'standalone' || !manifest.start_url) throw new Error('manifest missing standalone display/start_url');
console.log(`PASS manifest ${manifest.name} (${manifest.display})`);
