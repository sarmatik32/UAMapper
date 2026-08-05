# Deploy instructions (production)

This project uses Vite to build a production-ready bundle into the `dist/` directory. The production Docker image copies the `dist/` output into nginx's web root. To avoid serving source files (.ts/.tsx) by accident, always build first and deploy only the `dist/` contents.

1. Install and build locally or in CI:

```bash
npm ci
npm run build
```

2. Verify `dist` directory exists and contains `index.html` + `assets`:

```bash
ls -la dist
head -n 20 dist/index.html
```

3. Build Docker image (example):

```bash
docker build -t uamapper:prod .
```

The Dockerfile in this repo includes a check that `dist` exists; the build will fail if `npm run build` did not produce `dist`.

4. Deploy options

- Docker (nginx): the Dockerfile copies `dist/` to `/usr/share/nginx/html`. Use the image built above to run the container.
- Static hosting (S3 / CloudFront / Netlify / Vercel): upload the *contents* of `dist/` to your host. Make sure `.js` files are uploaded with `Content-Type: application/javascript`.

5. Troubleshooting

- If the browser console shows: "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of \"application/octet-stream\"", this means the site is serving a source file (for example `/src/main.tsx`) or serving a JS file with the wrong Content-Type. Verify `dist/index.html` references JS files in `/assets/` and that those files are present on the server with the correct Content-Type.
- To quickly inspect headers from your machine:

```bash
curl -I https://your-site.example/
curl -I https://your-site.example/assets/main.<hash>.js
```

6. CI recommendation

Add a build-check workflow that runs `npm ci && npm run build` on PRs and pushes to main only when the build succeeds. This prevents cases where unbuilt source files get deployed to production.
