import { Pool } from 'pg';
import {
  SYNC_ORDER,
  getTableConfig,
  shouldIncludeTable,
  getIncludedTables,
} from './config.js';
import { anonymizeRow, UserIdMapper } from './anonymize.js';

/**
 * Construct database URL from components if not directly provided
 */
function constructDatabaseUrl(): string {
  // Try direct DATABASE_URL first
  if (process.env.DATABASE_LOCAL_URL) {
    return process.env.DATABASE_LOCAL_URL;
  }
  
  // Construct from components
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;
  const port = process.env.DATABASE_PORT || '5432';
  const host = process.env.DATABASE_HOST || 'localhost';
  
  if (!user || !password || !database) {
    throw new Error(
      'Either DATABASE_URL or (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB) environment variables are required'
    );
  }
  
  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

/**
 * Construct sandbox database URL from components if not directly provided
 */
function constructSandboxDatabaseUrl(): string {
  // Try direct SANDBOX_DATABASE_URL first
  if (process.env.SANDBOX_DATABASE_URL) {
    return process.env.SANDBOX_DATABASE_URL;
  }
  
  // Construct from components
  const user = process.env.SANDBOX_POSTGRES_USER || 'sandbox_user';
  const password = process.env.SANDBOX_POSTGRES_PASSWORD || 'sandbox_password';
  const database = process.env.SANDBOX_POSTGRES_DB || 'jobstack_provider_sandbox';
  const port = process.env.SANDBOX_DATABASE_PORT || '5433';
  const host = process.env.SANDBOX_DATABASE_HOST || 'localhost';
  
  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

/**
 * Get source database connection
 */
function getSourcePool(): Pool {
  const sourceUrl = constructDatabaseUrl();
  return new Pool({ connectionString: sourceUrl });
}

/**
 * Get target (sandbox) database connection
 */
function getTargetPool(): Pool {
  const targetUrl = constructSandboxDatabaseUrl();
  return new Pool({ connectionString: targetUrl });
}

/**
 * Get all table names from source database
 */
async function getSourceTables(pool: Pool): Promise<string[]> {
  const result = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return result.rows.map((row) => row.tablename);
}

/**
 * Quote table name for SQL queries
 */
function quoteTableName(tableName: string): string {
  return `"${tableName}"`;
}

/**
 * Get all enum types from source database
 */
async function getEnumTypes(sourcePool: Pool): Promise<Array<{ enum_name: string; enum_values: string[] }>> {
  const result = await sourcePool.query(`
    SELECT 
      t.typname AS enum_name,
      array_agg(e.enumlabel ORDER BY e.enumsortorder)::text[] AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  
  return result.rows.map((row) => ({
    enum_name: row.enum_name,
    enum_values: Array.isArray(row.enum_values) ? row.enum_values : [],
  }));
}

/**
 * Create enum types in target database
 */
async function createEnumTypes(
  sourcePool: Pool,
  targetPool: Pool
): Promise<void> {
  console.log('📝 Creating enum types...');
  
  const enums = await getEnumTypes(sourcePool);
  
  for (const enumType of enums) {
    const quotedEnumName = quoteIdentifier(enumType.enum_name);
    
    // enum_values should already be an array from the query
    if (!Array.isArray(enumType.enum_values) || enumType.enum_values.length === 0) {
      console.warn(`  ⚠ Skipping enum ${enumType.enum_name}: no values found`);
      continue;
    }
    
    const values = enumType.enum_values.map((val: string) => `'${String(val).replace(/'/g, "''")}'`).join(', ');
    
    // Drop enum if exists (CASCADE to handle dependencies)
    try {
      await targetPool.query(`DROP TYPE IF EXISTS ${quotedEnumName} CASCADE`);
    } catch (error) {
      // Ignore errors, enum might not exist
    }
    
    // Create enum
    await targetPool.query(`CREATE TYPE ${quotedEnumName} AS ENUM (${values})`);
    console.log(`  ✓ Created enum: ${enumType.enum_name}`);
  }
  
  console.log('✓ Enum types created');
}

/**
 * Get table schema (columns and types)
 */
async function getTableSchema(
  pool: Pool,
  tableName: string
): Promise<Array<{ column_name: string; data_type: string; is_nullable: string; udt_name: string; is_enum: boolean }>> {
  // Use pg_catalog to get proper type information including arrays and enums
  const result = await pool.query(`
    SELECT 
      a.attname AS column_name,
      CASE 
        WHEN t.typcategory = 'A' THEN 
          (SELECT typname FROM pg_type WHERE oid = t.typelem) || '[]'
        ELSE 
          CASE 
            WHEN t.typname = 'varchar' THEN 'character varying'
            WHEN t.typname = 'bpchar' THEN 'character'
            ELSE t.typname
          END
      END AS data_type,
      CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
      t.typname AS udt_name,
      t.typcategory = 'E' AS is_enum
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_type t ON a.atttypid = t.oid
    WHERE n.nspname = 'public'
      AND c.relname = $1
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY a.attnum
  `, [tableName]);
  
  return result.rows.map((row) => ({
    column_name: row.column_name,
    data_type: row.data_type,
    is_nullable: row.is_nullable,
    udt_name: row.udt_name,
    is_enum: row.is_enum,
  }));
}

/**
 * Get foreign key constraints for a table
 */
async function getForeignKeyConstraints(
  sourcePool: Pool,
  tableName: string
): Promise<Array<{ constraint_name: string; constraint_sql: string }>> {
  const result = await sourcePool.query(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = $1
      AND tc.table_schema = 'public'
  `, [tableName]);
  
  // Group by constraint_name to handle multi-column foreign keys
  const constraints = new Map<string, Array<{ column: string; foreign_table: string; foreign_column: string }>>();
  
  for (const row of result.rows) {
    if (!constraints.has(row.constraint_name)) {
      constraints.set(row.constraint_name, []);
    }
    constraints.get(row.constraint_name)!.push({
      column: row.column_name,
      foreign_table: row.foreign_table_name,
      foreign_column: row.foreign_column_name,
    });
  }
  
  const quotedTableName = quoteTableName(tableName);
  return Array.from(constraints.entries()).map(([name, cols]) => ({
    constraint_name: name,
    constraint_sql: `ALTER TABLE ${quotedTableName} ADD CONSTRAINT ${quoteIdentifier(name)} FOREIGN KEY (${cols.map(c => quoteIdentifier(c.column)).join(', ')}) REFERENCES ${quoteTableName(cols[0].foreign_table)}(${cols.map(c => quoteIdentifier(c.foreign_column)).join(', ')})`,
  }));
}

/**
 * Quote identifier to handle reserved keywords
 */
function quoteIdentifier(identifier: string): string {
  return `"${identifier}"`;
}

/**
 * Create table in target database based on source schema
 */
async function createTableInTarget(
  sourcePool: Pool,
  targetPool: Pool,
  tableName: string
): Promise<void> {
  const columns = await getTableSchema(sourcePool, tableName);
  const columnDefs = columns.map((col) => {
    const nullable = col.is_nullable === 'YES' ? '' : 'NOT NULL';
    let pgType = col.data_type;
    
    // Handle enum types first (before array check)
    if (col.is_enum) {
      // Quote enum type name
      pgType = quoteIdentifier(pgType);
    }
    // Handle array types (e.g., "text[]")
    else if (pgType.endsWith('[]')) {
      const elementType = pgType.slice(0, -2);
      // Map element type
      let mappedElementType = elementType;
      if (elementType === 'character varying' || elementType === 'varchar') {
        mappedElementType = 'TEXT';
      } else if (elementType === 'text') {
        mappedElementType = 'TEXT';
      } else if (elementType === 'integer') {
        mappedElementType = 'INTEGER';
      }
      pgType = `${mappedElementType}[]`;
    } 
    // Handle non-array, non-enum types
    else {
      if (pgType === 'character varying' || pgType === 'varchar') {
        pgType = 'VARCHAR';
      } else if (pgType === 'timestamp without time zone') {
        pgType = 'TIMESTAMP';
      } else if (pgType === 'timestamp with time zone') {
        pgType = 'TIMESTAMPTZ';
      } else if (pgType === 'boolean') {
        pgType = 'BOOLEAN';
      } else if (pgType === 'integer') {
        pgType = 'INTEGER';
      } else if (pgType === 'bigint') {
        pgType = 'BIGINT';
      } else if (pgType === 'text') {
        pgType = 'TEXT';
      } else if (pgType === 'jsonb') {
        pgType = 'JSONB';
      } else if (pgType === 'uuid') {
        pgType = 'UUID';
      } else if (pgType.startsWith('character')) {
        pgType = 'VARCHAR';
      }
    }
    
    return `${quoteIdentifier(col.column_name)} ${pgType} ${nullable}`;
  }).join(', ');

  const quotedTableName = quoteIdentifier(tableName);
  
  // Drop table if exists
  await targetPool.query(`DROP TABLE IF EXISTS ${quotedTableName} CASCADE`);
  
  // Create table
  await targetPool.query(`CREATE TABLE ${quotedTableName} (${columnDefs})`);
  
  console.log(`✓ Created table: ${tableName}`);
}

/**
 * Add foreign key constraints after all tables are created
 */
async function addForeignKeyConstraints(
  sourcePool: Pool,
  targetPool: Pool,
  tableNames: string[]
): Promise<void> {
  console.log('🔗 Adding foreign key constraints...');
  
  for (const tableName of tableNames) {
    try {
      const constraints = await getForeignKeyConstraints(sourcePool, tableName);
      for (const constraint of constraints) {
        try {
          await targetPool.query(constraint.constraint_sql);
          console.log(`  ✓ Added constraint ${constraint.constraint_name} to ${tableName}`);
        } catch (error) {
          // Constraint might already exist or reference table doesn't exist yet
          // We'll skip it for now - constraints will be added in order
          console.warn(`  ⚠ Skipped constraint ${constraint.constraint_name} for ${tableName}`);
        }
      }
    } catch (error) {
      console.warn(`  ⚠ Could not get constraints for ${tableName}:`, error);
    }
  }
  
  console.log('✓ Foreign key constraints added');
}

/**
 * Copy schema from source to target (only included tables)
 */
async function copySchema(sourcePool: Pool, targetPool: Pool): Promise<void> {
  console.log('📋 Copying schema...');
  
  // First, create enum types (they must exist before tables that use them)
  await createEnumTypes(sourcePool, targetPool);
  console.log('');
  
  const sourceTables = await getSourceTables(sourcePool);
  
  // Filter to only included tables
  const tablesToCopy = sourceTables.filter((table) =>
    shouldIncludeTable(table)
  );
  
  // Create tables in dependency order
  const createdTables: string[] = [];
  for (const tableName of SYNC_ORDER) {
    if (tablesToCopy.includes(tableName)) {
      await createTableInTarget(sourcePool, targetPool, tableName);
      createdTables.push(tableName);
    }
  }
  
  // Handle any tables not in SYNC_ORDER
  for (const tableName of tablesToCopy) {
    if (!SYNC_ORDER.includes(tableName)) {
      await createTableInTarget(sourcePool, targetPool, tableName);
      createdTables.push(tableName);
    }
  }
  
  // Add foreign key constraints
  await addForeignKeyConstraints(sourcePool, targetPool, createdTables);
  
  console.log('✓ Schema copied successfully');
}

/**
 * Copy data from source to target with anonymization
 */
async function copyData(
  sourcePool: Pool,
  targetPool: Pool,
  userIdMapper: UserIdMapper
): Promise<void> {
  console.log('📊 Copying data with anonymization...');
  
  const includedTables = getIncludedTables();
  
  for (const tableName of SYNC_ORDER) {
    if (!includedTables.includes(tableName)) {
      continue;
    }
    
    const config = getTableConfig(tableName);
    if (!config || !config.include) {
      continue;
    }
    
    console.log(`  Processing table: ${tableName}`);
    
    // Fetch all rows from source
    const quotedTableName = quoteTableName(tableName);
    const sourceResult = await sourcePool.query(`SELECT * FROM ${quotedTableName}`);
    const rows = sourceResult.rows;
    
    if (rows.length === 0) {
      console.log(`    No data in ${tableName}`);
      continue;
    }
    
    // Process and insert rows
    const processedRows: Record<string, unknown>[] = [];
    
    for (const row of rows) {
      let processedRow = { ...row };
      
      // Apply anonymization rules
      if (config.anonymizeColumns) {
        processedRow = anonymizeRow(processedRow, config.anonymizeColumns);
      }
      
      // Apply custom transform if exists
      if (config.customTransform) {
        processedRow = config.customTransform(processedRow);
      }
      
      // Map user IDs for referential integrity
      if (processedRow.user_id) {
        processedRow.user_id = userIdMapper.getAnonymizedUserId(
          String(row.user_id)
        );
      }
      
      // Handle other user_id references
      const userIdFields = Object.keys(processedRow).filter((key) =>
        key.includes('user_id') || key.includes('userId')
      );
      for (const field of userIdFields) {
        if (processedRow[field] && field !== 'user_id') {
          processedRow[field] = userIdMapper.getAnonymizedUserId(
            String(row[field])
          );
        }
      }
      
      processedRows.push(processedRow);
    }
    
    // Batch insert
    if (processedRows.length > 0) {
      const quotedTableName = quoteTableName(tableName);
      
      // Truncate table first for clean sync
      try {
        await targetPool.query(`TRUNCATE TABLE ${quotedTableName} CASCADE`);
      } catch (error) {
        // Table might not exist or have dependencies, continue anyway
        console.warn(`    ⚠ Could not truncate ${tableName}, continuing...`);
      }
      
      const columns = Object.keys(processedRows[0]);
      const quotedColumns = columns.map(col => quoteIdentifier(col));
      const placeholders = processedRows.map((_, idx) => {
        const values = columns.map((_, colIdx) => {
          const paramIdx = idx * columns.length + colIdx + 1;
          return `$${paramIdx}`;
        });
        return `(${values.join(', ')})`;
      });
      
      const values = processedRows.flatMap((row) =>
        columns.map((col) => row[col])
      );
      
      const query = `
        INSERT INTO ${quotedTableName} (${quotedColumns.join(', ')})
        VALUES ${placeholders.join(', ')}
      `;
      
      try {
        await targetPool.query(query, values);
        console.log(`    ✓ Inserted ${processedRows.length} rows into ${tableName}`);
      } catch (error) {
        console.error(`    ✗ Error inserting into ${tableName}:`, error);
        // Continue with other tables
      }
    }
  }
  
  console.log('✓ Data copied successfully');
}

/**
 * Main sync function
 */
export async function syncSandbox(): Promise<void> {
  console.log('🚀 Starting sandbox database sync...\n');
  
  const sourcePool = getSourcePool();
  const targetPool = getTargetPool();
  const userIdMapper = new UserIdMapper();
  
  try {
    // Test connections
    await sourcePool.query('SELECT 1');
    await targetPool.query('SELECT 1');
    console.log('✓ Database connections established\n');
    
    // Copy schema
    await copySchema(sourcePool, targetPool);
    console.log('');
    
    // Copy data
    await copyData(sourcePool, targetPool, userIdMapper);
    console.log('');
    
    console.log('✅ Sandbox sync completed successfully!');
  } catch (error) {
    console.error('❌ Error during sandbox sync:', error);
    throw error;
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

/**
 * Setup function - creates schema only
 */
export async function setupSandbox(): Promise<void> {
  console.log('🚀 Setting up sandbox database schema...\n');
  
  const sourcePool = getSourcePool();
  const targetPool = getTargetPool();
  
  try {
    // Test connections
    await sourcePool.query('SELECT 1');
    await targetPool.query('SELECT 1');
    console.log('✓ Database connections established\n');
    
    // Copy schema only
    await copySchema(sourcePool, targetPool);
    console.log('');
    
    console.log('✅ Sandbox setup completed successfully!');
  } catch (error) {
    console.error('❌ Error during sandbox setup:', error);
    throw error;
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

