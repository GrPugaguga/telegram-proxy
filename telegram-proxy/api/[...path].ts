export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: any, res: any) {
  const path = (req.url || '').replace(/^\/api\//, '');
  if (!path) {
    res.status(400).json({ error: 'Empty path' });
    return;
  }

  const tgUrl = `https://api.telegram.org/${path}`;

  // Collect raw body as Buffer (needed for FormData/multipart)
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  // Forward headers, replace host
  const headers: Record<string, string> = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (['host', 'connection', 'transfer-encoding'].includes(key)) continue;
    if (typeof val === 'string') headers[key] = val;
  }

  const tgRes = await fetch(tgUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' ? body : undefined,
  });

  res.status(tgRes.status);

  // Forward content-type from Telegram
  const ct = tgRes.headers.get('content-type');
  if (ct) res.setHeader('content-type', ct);

  const data = await tgRes.arrayBuffer();
  res.send(Buffer.from(data));
}
