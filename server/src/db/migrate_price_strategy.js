import db from './connection.js';

console.log('🔄 Running Pricing Strategy Migration...');
try {
    const tableInfo = db.pragma('table_info(products)');
    
    // Check if column exists
    const hasPricingStrategy = tableInfo.some(col => col.name === 'pricing_strategy');
    if (!hasPricingStrategy) {
        db.exec("ALTER TABLE products ADD COLUMN pricing_strategy TEXT DEFAULT 'manual' CHECK(pricing_strategy IN ('manual', 'weighted_average', 'highest_cost', 'latest_cost'));");
        console.log('✅ Added pricing_strategy column.');
    } else {
        console.log('⚡ pricing_strategy column already exists.');
    }

    const hasTargetMargin = tableInfo.some(col => col.name === 'target_margin');
    if (!hasTargetMargin) {
        db.exec("ALTER TABLE products ADD COLUMN target_margin REAL DEFAULT 0;");
        console.log('✅ Added target_margin column.');
    } else {
        console.log('⚡ target_margin column already exists.');
    }

    console.log('Migration complete.');
} catch(err) {
    console.error('Migration failed:', err);
}
