(async () => {
  try {
    // Build file URL for the route
    const routePath = 'file://' + process.cwd().replace(/\\/g, '/') + '/app/api/auth/me/route.js';
    const mod = await import(routePath);

    // Mock request with headers.get
    const req = { headers: { get: (name) => '' } };

    const res = await mod.GET(req);

    // Try to extract JSON body in several ways
    if (res && typeof res.json === 'function') {
      const data = await res.json();
      console.log('GET /api/auth/me response:', JSON.stringify(data));
      process.exit(0);
    }

    // Fallback: inspect properties
    console.log('Response object:', res);
    process.exit(0);
  } catch (err) {
    console.error('Error running test:', err);
    process.exit(2);
  }
})();
