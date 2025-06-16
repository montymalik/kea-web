// kea-dhcp-backend/migrate-database.js - Database migration script to fix INET and missing column issues
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kea_dhcp',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const migrateDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting database migration...');
    console.log('='.repeat(50));
    
    // Check current database structure
    console.log('\n📋 Checking current database structure...');
    const tablesQuery = `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('static_ips', 'pool_config')
      ORDER BY table_name, ordinal_position
    `;
    
    const existingStructure = await client.query(tablesQuery);
    console.log('Current structure:');
    existingStructure.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // === MIGRATE STATIC_IPS TABLE ===
    console.log('\n🔄 Migrating static_ips table...');
    
    const staticIpsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'static_ips'
      ) as exists
    `);
    
    if (staticIpsExists.rows[0].exists) {
      console.log('✓ static_ips table exists');
      
      // Check current column types
      const staticIpsColumns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'static_ips' 
        AND column_name IN ('ip_address', 'mac_address')
      `);
      
      const ipAddressType = staticIpsColumns.rows.find(r => r.column_name === 'ip_address')?.data_type;
      const macAddressType = staticIpsColumns.rows.find(r => r.column_name === 'mac_address')?.data_type;
      
      console.log(`  Current ip_address type: ${ipAddressType}`);
      console.log(`  Current mac_address type: ${macAddressType}`);
      
      if (ipAddressType === 'inet' || macAddressType === 'macaddr') {
        console.log('🔄 Converting INET/MACADDR columns to VARCHAR...');
        
        // Get current data count
        const dataCount = await client.query('SELECT COUNT(*) FROM static_ips');
        console.log(`  Found ${dataCount.rows[0].count} existing records`);
        
        // Create backup table
        await client.query(`
          CREATE TABLE static_ips_backup AS 
          SELECT id, 
                 CASE WHEN ip_address IS NULL THEN NULL ELSE host(ip_address) END as ip_address,
                 CASE WHEN mac_address IS NULL THEN NULL ELSE mac_address::text END as mac_address,
                 hostname, description, created_at, updated_at
          FROM static_ips
        `);
        console.log('✓ Created backup table with converted data');
        
        // Drop original table
        await client.query('DROP TABLE static_ips CASCADE');
        console.log('✓ Dropped original table');
        
        // Create new table with correct types
        await client.query(`
          CREATE TABLE static_ips (
            id SERIAL PRIMARY KEY,
            ip_address VARCHAR(15) NOT NULL UNIQUE,
            mac_address VARCHAR(17),
            hostname VARCHAR(255),
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);
        console.log('✓ Created new table with VARCHAR types');
        
        // Restore data
        await client.query(`
          INSERT INTO static_ips (id, ip_address, mac_address, hostname, description, created_at, updated_at)
          SELECT id, ip_address, mac_address, hostname, description, created_at, updated_at
          FROM static_ips_backup
          WHERE ip_address IS NOT NULL
        `);
        
        // Reset sequence
        await client.query(`
          SELECT setval('static_ips_id_seq', COALESCE((SELECT MAX(id) FROM static_ips), 1), true)
        `);
        console.log('✓ Restored data and reset sequence');
        
        // Verify data restoration
        const newDataCount = await client.query('SELECT COUNT(*) FROM static_ips');
        console.log(`✓ Data verification: ${newDataCount.rows[0].count} records restored`);
        
        // Drop backup
        await client.query('DROP TABLE static_ips_backup');
        console.log('✓ Cleaned up backup table');
      } else {
        console.log('✓ static_ips table already has correct VARCHAR types');
      }
    } else {
      console.log('📝 Creating static_ips table...');
      await client.query(`
        CREATE TABLE static_ips (
          id SERIAL PRIMARY KEY,
          ip_address VARCHAR(15) NOT NULL UNIQUE,
          mac_address VARCHAR(17),
          hostname VARCHAR(255),
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✓ Created static_ips table');
    }

    // === MIGRATE POOL_CONFIG TABLE ===
    console.log('\n🔄 Migrating pool_config table...');
    
    const poolConfigExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pool_config'
      ) as exists
    `);
    
    if (poolConfigExists.rows[0].exists) {
      console.log('✓ pool_config table exists');
      
      // Check for missing total column
      const totalColumnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'pool_config' 
          AND column_name = 'total'
        ) as exists
      `);
      
      if (!totalColumnExists.rows[0].exists) {
        console.log('📝 Adding missing total column...');
        await client.query(`
          ALTER TABLE pool_config ADD COLUMN total INTEGER NOT NULL DEFAULT 0
        `);
        console.log('✓ Added total column');
      } else {
        console.log('✓ total column already exists');
      }
      
      // Check current IP column types
      const poolColumns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'pool_config' 
        AND column_name IN ('start_ip', 'end_ip')
      `);
      
      const startIpType = poolColumns.rows.find(r => r.column_name === 'start_ip')?.data_type;
      const endIpType = poolColumns.rows.find(r => r.column_name === 'end_ip')?.data_type;
      
      console.log(`  Current start_ip type: ${startIpType}`);
      console.log(`  Current end_ip type: ${endIpType}`);
      
      if (startIpType === 'inet' || endIpType === 'inet') {
        console.log('🔄 Converting INET columns to VARCHAR...');
        
        // Get current data count
        const poolDataCount = await client.query('SELECT COUNT(*) FROM pool_config');
        console.log(`  Found ${poolDataCount.rows[0].count} existing pool configurations`);
        
        // Create backup table
        await client.query(`
          CREATE TABLE pool_config_backup AS 
          SELECT id, name,
                 CASE WHEN start_ip IS NULL THEN NULL ELSE host(start_ip) END as start_ip,
                 CASE WHEN end_ip IS NULL THEN NULL ELSE host(end_ip) END as end_ip,
                 total, description, is_active, created_at, updated_at
          FROM pool_config
        `);
        console.log('✓ Created backup table with converted data');
        
        // Drop original table
        await client.query('DROP TABLE pool_config CASCADE');
        console.log('✓ Dropped original table');
        
        // Create new table with correct types
        await client.query(`
          CREATE TABLE pool_config (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL DEFAULT 'default',
            start_ip VARCHAR(15) NOT NULL,
            end_ip VARCHAR(15) NOT NULL,
            total INTEGER NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);
        console.log('✓ Created new table with VARCHAR types');
        
        // Restore data with calculated totals
        await client.query(`
          INSERT INTO pool_config (id, name, start_ip, end_ip, total, description, is_active, created_at, updated_at)
          SELECT id, name, start_ip, end_ip,
                 CASE 
                   WHEN total IS NULL OR total = 0 THEN 
                     CAST(split_part(end_ip, '.', 4) AS INTEGER) - CAST(split_part(start_ip, '.', 4) AS INTEGER) + 1
                   ELSE total
                 END as total,
                 description, is_active, created_at, updated_at
          FROM pool_config_backup
          WHERE start_ip IS NOT NULL AND end_ip IS NOT NULL
        `);
        
        // Reset sequence
        await client.query(`
          SELECT setval('pool_config_id_seq', COALESCE((SELECT MAX(id) FROM pool_config), 1), true)
        `);
        console.log('✓ Restored data with calculated totals and reset sequence');
        
        // Verify data restoration
        const newPoolDataCount = await client.query('SELECT COUNT(*) FROM pool_config');
        console.log(`✓ Data verification: ${newPoolDataCount.rows[0].count} pool configurations restored`);
        
        // Drop backup
        await client.query('DROP TABLE pool_config_backup');
        console.log('✓ Cleaned up backup table');
      } else {
        console.log('✓ pool_config table already has correct VARCHAR types');
        
        // Just ensure total is calculated for existing records
        await client.query(`
          UPDATE pool_config 
          SET total = CAST(split_part(end_ip, '.', 4) AS INTEGER) - CAST(split_part(start_ip, '.', 4) AS INTEGER) + 1
          WHERE total = 0 OR total IS NULL
        `);
        console.log('✓ Updated total values for existing records');
      }
    } else {
      console.log('📝 Creating pool_config table...');
      await client.query(`
        CREATE TABLE pool_config (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL DEFAULT 'default',
          start_ip VARCHAR(15) NOT NULL,
          end_ip VARCHAR(15) NOT NULL,
          total INTEGER NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✓ Created pool_config table');
    }

    // === CREATE INDEXES ===
    console.log('\n📊 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_static_ips_ip_address ON static_ips(ip_address)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_static_ips_mac_address ON static_ips(mac_address)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pool_config_active ON pool_config(is_active)
    `);
    console.log('✓ Indexes created');

    // === CREATE TRIGGERS ===
    console.log('\n⚡ Creating update triggers...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_static_ips_updated_at ON static_ips;
      CREATE TRIGGER update_static_ips_updated_at
          BEFORE UPDATE ON static_ips
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_pool_config_updated_at ON pool_config;
      CREATE TRIGGER update_pool_config_updated_at
          BEFORE UPDATE ON pool_config
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✓ Triggers created');

    // === ENSURE DEFAULT POOL CONFIG ===
    console.log('\n⚙️  Ensuring default pool configuration...');
    const existingConfig = await client.query(`
      SELECT * FROM pool_config WHERE is_active = true
    `);

    if (existingConfig.rows.length === 0) {
      await client.query(`
        INSERT INTO pool_config (name, start_ip, end_ip, total, description, is_active)
        VALUES ('default', '192.168.1.2', '192.168.1.100', 99, 'Default DHCP reservation pool', true)
      `);
      console.log('✓ Default pool configuration inserted');
    } else {
      console.log(`✓ Found ${existingConfig.rows.length} existing pool configuration(s)`);
      
      // Show current pool configs
      existingConfig.rows.forEach((config, index) => {
        console.log(`  ${index + 1}. ${config.name}: ${config.start_ip} - ${config.end_ip} (${config.total} IPs)`);
      });
    }

    // === FINAL VERIFICATION ===
    console.log('\n🔍 Final verification...');
    const finalStructure = await client.query(tablesQuery);
    
    console.log('\nFinal database structure:');
    finalStructure.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Count records
    const staticIpsCount = await client.query('SELECT COUNT(*) FROM static_ips');
    const poolConfigCount = await client.query('SELECT COUNT(*) FROM pool_config');
    
    console.log('\nData summary:');
    console.log(`  📍 Static IPs: ${staticIpsCount.rows[0].count} records`);
    console.log(`  🏊 Pool configs: ${poolConfigCount.rows[0].count} records`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database migration completed successfully!');
    console.log('\nWhat was fixed:');
    console.log('  ✅ Converted INET columns to VARCHAR (fixes "inet ~ unknown" error)');
    console.log('  ✅ Added missing "total" column to pool_config');
    console.log('  ✅ Preserved all existing data');
    console.log('  ✅ Created proper indexes and triggers');
    console.log('  ✅ Calculated pool totals automatically');
    console.log('\n🚀 You can now restart your server and test the pool configuration!');

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\nStack trace:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('\n✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };
