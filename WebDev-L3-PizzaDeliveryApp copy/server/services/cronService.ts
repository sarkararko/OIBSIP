import cron, { ScheduledTask } from 'node-cron';
import { dbService } from './dbService.js';
import { DataStore } from '../models/index.js';

let cronTask: ScheduledTask | null = null;
let lastAlertTimestamp: number = 0;

export async function runLowStockAudit(): Promise<{
  checkedCount: number;
  lowStockItems: any[];
  alertGenerated: boolean;
}> {
  const inventory = await dbService.getInventory();
  const lowItems = inventory.filter((item: any) => item.stock < item.threshold);

  if (lowItems.length > 0) {
    // Avoid spamming if check ran in the last 15 seconds
    const now = Date.now();
    if (now - lastAlertTimestamp > 15000) {
      lastAlertTimestamp = now;

      const itemsSummary = lowItems
        .map(
          (item: any) =>
            `• ${item.name} (${String(item.category).toUpperCase()}): Current Stock = ${item.stock} ${item.unit} (Safety Threshold = ${item.threshold} ${item.unit})`
        )
        .join('\n');

      const alertEmail = {
        id: `eml_cron_alert_${Date.now()}`,
        to: process.env.ADMIN_EMAIL || 'admin@pizzacraft.com',
        subject: `⚠️ [AUTOMATED CRON ALERT] Low Inventory Warning (${lowItems.length} SKUs below threshold)`,
        content: `Attention PizzaCraft Kitchen Admin,\n\nThe automated node-cron background monitor detected ${lowItems.length} ingredient SKU(s) operating below safe threshold levels:\n\n${itemsSummary}\n\nRecommended Action:\nPlease navigate to the Admin Inventory Control Center to restock or adjust procurement before upcoming dinner peak hours.\n\nTimestamp: ${new Date().toISOString()}`,
        type: 'low_stock_alert' as const,
        metadata: {
          itemIds: lowItems.map((i: any) => i.id),
          count: lowItems.length,
        },
        createdAt: new Date().toISOString(),
      };

      const db = DataStore.getData();
      db.emails.unshift(alertEmail);
      DataStore.saveToDisk();

      console.log(`[node-cron] 🚨 Dispatched Low Stock Alert for ${lowItems.length} SKUs`);
      return { checkedCount: inventory.length, lowStockItems: lowItems, alertGenerated: true };
    }
  }

  return { checkedCount: inventory.length, lowStockItems: lowItems, alertGenerated: false };
}

export function initCronService(): void {
  if (cronTask) {
    cronTask.stop();
  }

  // Run automated scan every 30 minutes in background
  cronTask = cron.schedule('*/30 * * * *', async () => {
    console.log('[node-cron] ⏰ Running scheduled 30-minute kitchen inventory audit...');
    try {
      await runLowStockAudit();
    } catch (err) {
      console.error('[node-cron] Error during scheduled inventory audit:', err);
    }
  });

  console.log('✅ node-cron background inventory monitor initialized (Active schedule: */30 * * * *)');
}
