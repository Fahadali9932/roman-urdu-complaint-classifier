async function trace() {
  const visited = new Set();
  const queue = ['/src/main.tsx', '/src/features/citizen/simplified-complaint/SimplifiedComplaintContainer.tsx'];
  const errors = [];

  while (queue.length > 0) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const res = await fetch('http://localhost:5173' + url);
      if (res.status >= 400) {
        const text = await res.text();
        errors.push({ url, status: res.status, body: text });
        console.error('FAILED URL:', url, 'STATUS:', res.status);
        continue;
      }
      const text = await res.text();
      const matches = [
        ...text.matchAll(/from\s+["']([^"']+)["']/g),
        ...text.matchAll(/import\s*\(\s*["']([^"']+)["']/g)
      ];
      for (const m of matches) {
        let imp = m[1];
        if (imp.startsWith('/') && !imp.startsWith('/node_modules') && !visited.has(imp)) {
          queue.push(imp);
        }
      }
    } catch (e) {
      errors.push({ url, error: e.message });
      console.error('FETCH ERROR:', url, e.message);
    }
  }

  console.log(`Visited ${visited.size} modules.`);
  console.log(`Found ${errors.length} errors.`);
  if (errors.length > 0) {
    console.log(JSON.stringify(errors, null, 2));
  }
}

trace();
