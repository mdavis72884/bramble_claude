import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function startWeeklyPayoutJob() {
  cron.schedule('0 0 * * 1', async () => {
    console.log('🕐 Running weekly payout job...');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const ledgerEntries = await prisma.ledgerEntry.findMany({
        where: {
          createdAt: {
            gte: cutoffDate,
          },
          entityType: {
            in: ['INSTRUCTOR', 'COOP'],
          },
        },
      });

      const payoutMap = new Map<string, { amount: number; entityType: string; tenantId: string | null }>();

      for (const entry of ledgerEntries) {
        const key = `${entry.entityType}_${entry.entityId}`;
        const existing = payoutMap.get(key) || { amount: 0, entityType: entry.entityType, tenantId: entry.tenantId };
        existing.amount += entry.amount;
        payoutMap.set(key, existing);
      }

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 3);

      const payoutEntries = Array.from(payoutMap.entries());
      for (const [key, data] of payoutEntries) {
        const [entityType, entityId] = key.split('_');
        
        if (data.amount < 10) {
          console.log(`⏭️  Skipping payout for ${key}: below minimum threshold ($${data.amount})`);
          continue;
        }

        const instructorPayoutFee = 2.00;
        const finalAmount = data.amount - instructorPayoutFee;

        await prisma.payout.create({
          data: {
            tenantId: data.tenantId,
            entityType,
            entityId,
            amount: finalAmount,
            status: 'PENDING',
            scheduledFor: scheduledDate,
          },
        });

        console.log(`✅ Created payout: ${entityType} ${entityId}, Amount: $${finalAmount}`);
      }

      console.log('✅ Weekly payout job completed');
    } catch (error) {
      console.error('❌ Weekly payout job failed:', error);
    }
  });

  console.log('✅ Weekly payout cron job scheduled (runs every Monday at midnight)');
}
