import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  api: { bodyParser: false },
};

function getRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage & { url?: string }, res: ServerResponse) {
  const path = (req.url || '').replace(/^\/api\/proxy\//, '');
  if (!path) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Empty path' }));
    return;
  }

  const tgUrl = `https://api.telegram.org/${path}`;
  const rawBody = req.method !== 'GET' ? await getRawBody(req) : undefined;

  const headers: Record<string, string> = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (['host', 'connection', 'transfer-encoding'].includes(key)) continue;
    if (typeof val === 'string') headers[key] = val;
  }

  const tgRes = await fetch(tgUrl, {
    method: req.method,
    headers,
    body: rawBody ? new Uint8Array(rawBody) : undefined,
  });

  const ct = tgRes.headers.get('content-type');
  res.writeHead(tgRes.status, ct ? { 'content-type': ct } : {});
  const data = Buffer.from(await tgRes.arrayBuffer());
  res.end(data);
}
