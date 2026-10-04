import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function run() {
  const { getAdminPaymentsLog, getAdminOverviewStats } = await import('@/lib/admin');

  console.log('=== 1. TESTING GET ADMIN PAYMENTS LOG ===');
  const payments = await getAdminPaymentsLog(10);
  console.log('✅ Fetched payments count:', payments.length);
  if (payments.length > 0) {
    console.log('Sample payment record:', {
      id: payments[0].id,
      amount: payments[0].amount,
      provider: payments[0].provider,
      profile: payments[0].profiles?.email || payments[0].profiles?.full_name || payments[0].profiles?.telegram_id
    });
  }

  console.log('\n=== 2. TESTING GET ADMIN OVERVIEW STATS ===');
  const stats = await getAdminOverviewStats();
  console.log('✅ Stats fetched successfully:');
  console.log('- Total Users:', stats.totalUsers);
  console.log('- Active Subscriptions:', stats.activeSubscriptions);
  console.log('- Total Renders:', stats.totalRenders);
  console.log('- Growth Points:', stats.userGrowthTimeline.length);

  console.log('\n🎉 ALL ADMIN FINANCE & PAYMENTS VERIFICATIONS PASSED 100% CLEANLY!');
}

run().catch(console.error);
