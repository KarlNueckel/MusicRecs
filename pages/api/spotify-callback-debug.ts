import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== SPOTIFY CALLBACK DEBUG ===');
  console.log('Full URL:', req.url);
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  console.log('Method:', req.method);
  console.log('==============================');

  res.status(200).json({
    message: 'Debug info logged to console',
    url: req.url,
    query: req.query,
    headers: {
      host: req.headers.host,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent']
    }
  });
}
