// kea-dhcp-backend/init-database.js - Database initialization script
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kea_dhcp',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const initializeDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Initializing database schema...');
    
    // Create static_ips table (using VARCHAR for IP to avoid INET issues)
    await client.query(`
      CREATE TABLE IF NOT EXISTS static_ips (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(15) NOT NULL UNIQUE,
        mac_address VARCHAR(17),
        hostname VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ static_ips table created/verified');

    // Create pool_config table with total column (using VARCHAR for IP to avoid INET issues)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pool_config (
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
    console.log('✓ pool_config table created/verified');

    // Check if total column exists and add it if missing
    const totalColumnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pool_config' AND column_name = 'total'
    `);

    if (totalColumnExists.rows.length === 0) {
      console.log('Adding missing total column to pool_config table...');
      await client.query(`
        ALTER TABLE pool_config ADD COLUMN total INTEGER NOT NULL DEFAULT 0
      `);
      console.log('✓ Added total column to pool_config table');
    }

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_static_ips_ip_address ON static_ips(ip_address)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_static_ips_mac_address ON static_ips(mac_address)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pool_config_active ON pool_config(is_active)
    `);
    console.log('✓ Indexes created/verified');

    // Create update trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    console.log('✓ Update trigger function created');

    // Create triggers
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

    // Insert default pool configuration if none exists
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
      console.log('✓ Pool configuration already exists');
      
      // Update existing records to have total if they don't
      await client.query(`
        UPDATE pool_config 
        SET total = (
          CASE 
            WHEN total IS NULL OR total = 0 THEN 
              CAST(split_part(end_ip, '.', 4) AS INTEGER) - 
              CAST(split_part(start_ip, '.', 4) AS INTEGER) + 1
            ELSE total
          END
        )
        WHERE total IS NULL OR total = 0
      `);
      console.log('✓ Updated existing pool configurations with calculated totals');
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\nDatabase schema:');
    console.log('- static_ips: IP address assignments outside DHCP');
    console.log('- pool_config: DHCP reservation pool configuration');
    console.log('\nYou can now start the server with: npm start');

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };

// Package.json script additions:
// Add these to your kea-dhcp-backend/package.json scripts section:
// "init-db": "node init-database.js",
// "migrate-db": "node migrate-database.js"
