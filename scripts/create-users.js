require('dotenv').config();
const mongodb = require('mongodb');
const User = require('../models/user');
const mongoConnect = require('../util/database').mongoConnect;

mongoConnect(async () => {
    try {
        const db = require('../util/database').getDb();

        // Xóa tất cả users hiện có (tùy chọn)
        await db.collection('users').deleteMany({});

        // Tạo user admin
        const adminUser = new User('Admin User', 'admin@example.com', 'admin');
        const adminResult = await adminUser.save();
        console.log('Đã tạo user admin:', adminResult.insertedId);

        // Tạo user thường
        const normalUser = new User('Normal User', 'user@example.com', 'user');
        const userResult = await normalUser.save();
        console.log('Đã tạo user thường:', userResult.insertedId);

        console.log('Hoàn thành! Bạn có thể đăng nhập với:');
        console.log('Admin: admin@example.com');
        console.log('User: user@example.com');

        process.exit(0);
    } catch (err) {
        console.error('Lỗi khi tạo users:', err);
        process.exit(1);
    }
}); 