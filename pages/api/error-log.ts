import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const logPath = path.join(process.cwd(), 'error-log.txt');
    
    if (!fs.existsSync(logPath)) {
      return res.status(200).json({
        message: 'No error log file found',
        errors: []
      });
    }

    const logContent = fs.readFileSync(logPath, 'utf8');
    const errors = logContent.split('\n').filter(line => line.trim() !== '');

    return res.status(200).json({
      message: 'Error log retrieved successfully',
      errors: errors,
      count: errors.length
    });
  } catch (error) {
    console.error('Error reading error log:', error);
    return res.status(500).json({
      error: 'Failed to read error log',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
