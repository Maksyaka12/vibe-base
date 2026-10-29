// Vercel serverless function: admin-editable reward schedule. Logic lives in ./_lib/schedule.js.
import { handleSchedule } from './_lib/schedule.js';

export default async function handler(req, res) {
  const result = await handleSchedule({ method: req.method, query: req.query, body: req.body });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(JSON.stringify(result.body));
}
