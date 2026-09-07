import cron, { ScheduledTask } from 'node-cron';
import { DataStore } from '../models/index.js';

let cronTask: ScheduledTask | null = null;
let lastAlertTimestamp: number = 0;

export function runLowStockAudit(): {
  checkedCount: number;
  lowStockItems: any[];
  alertGenerated: boolean;
} {
  const db = DataStore.getData();
  const lowItems = db.inventory.filter((item) => item.stock < item.threshold);

  if (lowItems.length > 0) {
    // Avoid spamming if check ran in the last 15 seconds
    const now = Date.now();
    if (now - lastAlertTimestamp > 15000) {
      lastAlertTimestamp = now;

      const itemsSummary = lowItems
        .map(
          (item) =>
            `• ${item.name} (${item.category.toUpperCase()}): Current Stock = ${item.stock} ${item.unit} (Safety Threshold = ${item.threshold} ${item.unit})`
        )
        .join('\n');

      const alertEmail = {
        id: `eml_cron_alert_${Date.now()}`,
        to: process.env.ADMIN_EMAIL || 'admin@pizzacraft.com',
        subject: `⚠️ [AUTOMATED CRON ALERT] Low Inventory Warning (${lowItems.length} SKUs below threshold)`,
        content: `Attention PizzaCraft Kitchen Admin,\n\nThe automated node-cron background monitor detected ${lowItems.length} ingredient SKU(s) operating below safe threshold levels:\n\n${itemsSummary}\n\nRecommended Action:\nPlease navigate to the Admin Inventory Control Center to restock or adjust procurement before upcoming dinner peak hours.\n\nTimestamp: ${new Date().toISOString()}`,
        type: 'low_stock_alert' as const,
        metadata: {
          itemIds: lowItems.map((i) => i.id),
          count: lowItems.length,
        },
        createdAt: new Date().toISOString(),
      };

      db.emails.unshift(alertEmail);
      DataStore.saveToDisk();

      console.log(`[node-cron] 🚨 Dispatched Low Stock Alert for ${lowItems.length} SKUs`);
      return { checkedCount: db.inventory.length, lowStockItems: lowItems, alertGenerated: true };
    }
  }

  return { checkedCount: db.inventory.length, lowStockItems: lowItems, alertGenerated: false };
}

export function initCronService(): void {
  if (cronTask) {
    cronTask.stop();
  }

  // Run automated scan every 30 minutes in background
  cronTask = cron.schedule('*/30 * * * *', () => {
    console.log('[node-cron] ⏰ Running scheduled 30-minute kitchen inventory audit...');
    runLowStockAudit();
  });

  console.log('✅ node-cron background inventory monitor initialized (Active schedule: */30 * * * *)');
}
