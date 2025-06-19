const getDb = require('../util/database').getDb;
const mongodb = require('mongodb');

class Order {
    constructor(userId, items, totalPrice, shippingInfo = {}, paymentMethod = 'cod') {
        this.userId = userId; // ID của người đặt
        this.items = items; // Danh sách sản phẩm trong giỏ
        this.totalPrice = totalPrice; // Tổng tiền đơn hàng
        this.status = 'pending'; // Trạng thái mặc định ban đầu
        this.createdAt = new Date(); // Thời điểm tạo đơn
        this.updatedAt = new Date(); // Lần cập nhật gần nhất

        // ✅ Lưu thông tin giao hàng (từ form checkout)
        this.shippingInfo = {
            name: shippingInfo.name || '',
            phone: shippingInfo.phone || '',
            email: shippingInfo.email || '',
            address: shippingInfo.address || ''
        };

        // ✅ Lưu thông tin phương thức thanh toán
        this.paymentMethod = paymentMethod;
        this.paymentStatus = this.getInitialPaymentStatus(paymentMethod);
    }

    // Xác định trạng thái thanh toán ban đầu dựa trên phương thức
    getInitialPaymentStatus(method) {
        switch(method) {
            case 'cod':
                return 'pending'; // Chờ thanh toán khi nhận hàng
            case 'bank':
            case 'ewallet':
                return 'awaiting_payment'; // Chờ chuyển khoản
            case 'credit':
                return 'processing'; // Đang xử lý thanh toán thẻ
            default:
                return 'pending';
        }
    }

    // Lấy tên hiển thị của phương thức thanh toán
    getPaymentMethodName() {
        const methods = {
            'cod': 'Thanh toán khi nhận hàng (COD)',
            'bank': 'Chuyển khoản ngân hàng',
            'ewallet': 'Ví điện tử',
            'credit': 'Thẻ tín dụng/ghi nợ'
        };
        return methods[this.paymentMethod] || 'Không xác định';
    }

    // Lấy tên hiển thị của trạng thái thanh toán
    getPaymentStatusName() {
        const statuses = {
            'pending': 'Chờ thanh toán',
            'awaiting_payment': 'Chờ chuyển khoản',
            'processing': 'Đang xử lý',
            'completed': 'Đã thanh toán',
            'failed': 'Thanh toán thất bại',
            'refunded': 'Đã hoàn tiền'
        };
        return statuses[this.paymentStatus] || 'Không xác định';
    }

    async save() {
        const db = getDb();
        try {
            // Tạo chỉ mục để tìm đơn hàng nhanh hơn
            await db.collection('orders').createIndex({ userId: 1 });
            await db.collection('orders').createIndex({ createdAt: -1 });

            // Lưu đơn hàng
            return await db.collection('orders').insertOne(this);
        } catch (error) {
            console.error('❌ Lỗi khi lưu đơn hàng:', error);
            throw error;
        }
    }

    static async findById(orderId) {
        const db = getDb();
        try {
            return await db.collection('orders').findOne({ _id: new mongodb.ObjectId(orderId) });
        } catch (error) {
            console.error('❌ Lỗi khi tìm đơn hàng theo ID:', error);
            throw error;
        }
    }

    static async findByUserId(userId) {
        const db = getDb();
        try {
            await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });

            return await db.collection('orders')
                .find({ userId: userId })
                .sort({ createdAt: -1 })
                .toArray();
        } catch (error) {
            console.error('❌ Lỗi khi tìm đơn hàng theo user ID:', error);
            return [];
        }
    }

    static async updateStatus(orderId, status) {
        const db = getDb();
        try {
            return await db.collection('orders').updateOne(
                { _id: new mongodb.ObjectId(orderId) },
                {
                    $set: {
                        status: status,
                        updatedAt: new Date()
                    }
                }
            );
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật trạng thái đơn hàng:', error);
            throw error;
        }
    }

    static async updatePaymentStatus(orderId, paymentStatus) {
        const db = getDb();
        try {
            return await db.collection('orders').updateOne(
                { _id: new mongodb.ObjectId(orderId) },
                {
                    $set: {
                        paymentStatus: paymentStatus,
                        updatedAt: new Date()
                    }
                }
            );
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật trạng thái thanh toán:', error);
            throw error;
        }
    }

    static async findAll() {
        const db = getDb();
        try {
            return await db.collection('orders')
                .find({})
                .sort({ createdAt: -1 })
                .toArray();
        } catch (error) {
            console.error('❌ Lỗi khi lấy tất cả đơn hàng:', error);
            return [];
        }
    }

    // Method để hiển thị trạng thái đơn hàng
    getStatusDisplay() {
        const statusMap = {
            'pending': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'shipping': 'Đang giao',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy'
        };
        return statusMap[this.status] || 'Không xác định';
    }
}

module.exports = Order;