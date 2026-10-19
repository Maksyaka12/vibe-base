// Vercel serverless function: royalty "claimed" banners. Logic lives in ./_lib/banner.js.
import { handleBanner } from './_lib/banner.js';

export default async function handler(req, res) {
  const result = await handleBanner({ method: req.method, query: req.query, body: req.body, headers: req.headers });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(result.raw ?? JSON.stringify(result.body));
}
