// prisma/seed.js - Database seeding script
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Clearing existing data...');
  await prisma.staticIP.deleteMany();
  await prisma.poolConfig.deleteMany();

  // Create default pool configuration
  console.log('⚙️ Creating default pool configuration...');
  const defaultPool = await prisma.poolConfig.create({
    data: {
      name: 'default',
      startIp: '192.168.1.2',
      endIp: '192.168.1.100',
      total: 99,
      description: 'Default DHCP reservation pool',
      isActive: true,
    },
  });
  console.log(`✅ Created default pool: ${defaultPool.startIp} - ${defaultPool.endIp} (${defaultPool.total} IPs)`);

  // Create some example static IP assignments
  console.log('📍 Creating example static IP assignments...');
  
  const exampleStaticIPs = [
    {
      ipAddress: '192.168.1.1',
      macAddress: '00:11:22:33:44:55',
      hostname: 'router',
      description: 'Main router/gateway'
    },
    {
      ipAddress: '192.168.1.10',
      macAddress: '00:11:22:33:44:66',
      hostname: 'server01',
      description: 'Primary web server'
    },
    {
      ipAddress: '192.168.1.11',
      macAddress: '00:11:22:33:44:77',
      hostname: 'database01',
      description: 'Database server'
    }
  ];

  for (const staticIP of exampleStaticIPs) {
    const created = await prisma.staticIP.create({
      data: staticIP,
    });
    console.log(`📍 Created static IP: ${created.ipAddress} (${created.hostname})`);
  }

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   • Pool configurations: 1`);
  console.log(`   • Static IP assignments: ${exampleStaticIPs.length}`);
  console.log('');
  console.log('🚀 You can now start the server with: npm start');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
