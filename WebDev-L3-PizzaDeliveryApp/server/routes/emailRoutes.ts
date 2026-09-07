import { Router, Request, Response } from 'express';
import { DataStore } from '../models/index.js';

const router = Router();

// GET /api/emails - List all dispatched simulation emails
router.get('/', (req: Request, res: Response): void => {
  const db = DataStore.getData();
  res.json({ emails: db.emails });
});

// POST /api/emails/mark-read - Mark email as read
router.post('/mark-read', (req: Request, res: Response): void => {
  const { id } = req.body;
  const db = DataStore.getData();
  if (id) {
    const email = db.emails.find((e) => e.id === id);
    if (email) {
      email.read = true;
      DataStore.saveToDisk();
    }
  }
  res.json({ success: true });
});

// POST /api/emails/reset-demo - Restore factory default demo database
router.post('/reset-demo', (req: Request, res: Response): void => {
  DataStore.initDefaultData();
  res.json({ message: 'Demo database restored to default factory state' });
});

export default router;
