const getDb = require('../util/database').getDb;
const mongoConnect = require('../util/database').mongoConnect;

async function deleteAllUsers() {
    try {
        await new Promise((resolve, reject) => {
            mongoConnect(() => {
                resolve();
            });
        });

        const db = getDb();
        const result = await db.collection('users').deleteMany({});
        console.log(`Đã xóa ${result.deletedCount} tài khoản`);
    } catch (err) {
        console.error('Lỗi khi xóa tài khoản:', err);
    }
}

deleteAllUsers(); 