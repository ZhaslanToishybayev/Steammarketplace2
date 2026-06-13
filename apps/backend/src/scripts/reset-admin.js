const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

async function reset() {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        console.log('New Hash:', hash);
        
        const res = await pool.query(
            'UPDATE admins SET password_hash = $1 WHERE username = $2 RETURNING *',
            [hash, 'admin']
        );
        
        console.log('Updated user:', res.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

reset();
