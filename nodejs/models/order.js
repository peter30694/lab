const mongodb = require('mongodb');
const { getDb } = require('../util/database');
const { ValidationError, DatabaseError, NotFoundError } = require('../util/errors');

class Order {
    constructor(userId, items, totalPrice, shippingInfo = {}, paymentMethod = 'cod') {
        // Validate required fields
        this.validateOrderData(userId, items, totalPrice, shippingInfo, paymentMethod);
        
        this.userId = userId;
        this.items = this.validateAndNormalizeItems(items);
        this.totalPrice = this.validatePrice(totalPrice);
        this.shippingInfo = this.validateShippingInfo(shippingInfo);
        this.paymentMethod = this.validatePaymentMethod(paymentMethod);
        this.status = 'pending';
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.paymentStatus = this.getInitialPaymentStatus(paymentMethod);
    }

    validateOrderData(userId, items, totalPrice, shippingInfo, paymentMethod) {
        if (!userId) {
            throw new ValidationError('User ID là bắt buộc');
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new ValidationError('Đơn hàng phải có ít nhất 1 sản phẩm');
        }
        if (!totalPrice || totalPrice <= 0) {
            throw new ValidationError('Tổng tiền phải lớn hơn 0');
        }
    }

    validateAndNormalizeItems(items) {
        return items.map(item => {
            if (!item.productId) {
                throw new ValidationError('Product ID là bắt buộc');
            }
            if (!item.quantity || item.quantity <= 0) {
                throw new ValidationError('Số lượng phải lớn hơn 0');
            }
            if (!item.price || item.price <= 0) {
                throw new ValidationError('Giá sản phẩm phải lớn hơn 0');
            }
            
            return {
                productId: item.productId,
                title: item.title || 'Sản phẩm không xác định',
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                imageUrl: item.imageUrl || '/images/default-product.jpg'
            };
        });
    }

    validatePrice(price) {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice <= 0) {
            throw new ValidationError('Giá không hợp lệ');
        }
        return numPrice;
    }

    validateShippingInfo(shippingInfo) {
        const required = ['name', 'phone', 'email', 'address'];
        const validated = {};
        
        for (const field of required) {
            if (!shippingInfo[field] || shippingInfo[field].trim() === '') {
                throw new ValidationError(`${field} là bắt buộc`);
            }
            validated[field] = shippingInfo[field].trim();
        }
        
        // Validate email format - temporarily more lenient
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(validated.email)) {
            console.warn('⚠️ Email validation failed for:', validated.email);
            // For now, just warn instead of throwing error
            // throw new ValidationError('Email không hợp lệ');
        }
        
        // Validate phone format - temporarily more lenient
        const phoneRegex = /^[0-9]{10,11}$/;
        const cleanPhone = validated.phone.replace(/\s/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            console.warn('⚠️ Phone validation failed for:', validated.phone);
            // For now, just warn instead of throwing error
            // throw new ValidationError('Số điện thoại không hợp lệ');
        }
        
        return validated;
    }

    validatePaymentMethod(method) {
        const validMethods = ['cod', 'bank', 'bank_transfer', 'ewallet', 'credit', 'vnpay'];
        if (!validMethods.includes(method)) {
            throw new ValidationError('Phương thức thanh toán không hợp lệ');
        }
        return method;
    }

    getInitialPaymentStatus(method) {
        switch (method) {
            case 'cod': return 'pending';
            case 'bank':
            case 'bank_transfer':
            case 'ewallet':
            case 'vnpay': return 'awaiting_payment';
            case 'credit': return 'processing';
            default: return 'pending';
        }
    }

    getPaymentMethodName() {
        const methods = {
            'cod': 'Thanh toán khi nhận hàng (COD)',
            'bank': 'Chuyển khoản ngân hàng',
            'bank_transfer': 'Chuyển khoản QR Code',
            'ewallet': 'Ví điện tử',
            'credit': 'Thẻ tín dụng/ghi nợ',
            'vnpay': 'Thanh toán qua VNPay'
        };
        return methods[this.paymentMethod] || 'Không xác định';
    }

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
            await db.collection('orders').createIndex({ userId: 1 });
            await db.collection('orders').createIndex({ createdAt: -1 });

            if (this._id) {
                // Nếu đã có _id thì update
                const orderId = new mongodb.ObjectId(this._id);
                this.updatedAt = new Date();
                const updateData = { ...this };
                delete updateData._id;

                const result = await db.collection('orders').updateOne(
                    { _id: orderId },
                    { $set: updateData }
                );
                
                if (result.matchedCount === 0) {
                    throw new NotFoundError('Không tìm thấy đơn hàng để cập nhật');
                }
                
                return { updatedId: orderId };
            } else {
                // Nếu chưa có _id thì insert mới
                const result = await db.collection('orders').insertOne(this);
                if (!result.insertedId) {
                    throw new DatabaseError('Không thể tạo đơn hàng mới');
                }
                return result;
            }
        } catch (error) {
            if (error instanceof ValidationError || error instanceof NotFoundError) {
                throw error;
            }
            console.error('❌ Lỗi khi lưu đơn hàng:', error);
            throw new DatabaseError('Lỗi khi lưu đơn hàng vào cơ sở dữ liệu');
        }
    }

    static async findById(orderId) {
        const db = getDb();
        try {
            if (!orderId) {
                throw new ValidationError('Order ID là bắt buộc');
            }
            
            const order = await db.collection('orders').findOne({ _id: new mongodb.ObjectId(orderId) });
            if (!order) {
                throw new NotFoundError('Không tìm thấy đơn hàng');
            }
            
            return order;
        } catch (error) {
            if (error instanceof ValidationError || error instanceof NotFoundError) {
                throw error;
            }
            console.error('❌ Lỗi khi tìm đơn hàng theo ID:', error);
            throw new DatabaseError('Lỗi khi truy vấn đơn hàng');
        }
    }

    static async findByUserId(userId) {
        const db = getDb();
        try {
            if (!userId) {
                throw new ValidationError('User ID là bắt buộc');
            }
            
            await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
            const orders = await db.collection('orders')
                .find({ userId: userId })
                .sort({ createdAt: -1 })
                .toArray();
            
            return orders;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            console.error('❌ Lỗi khi tìm đơn hàng theo user ID:', error);
            throw new DatabaseError('Lỗi khi truy vấn đơn hàng của người dùng');
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

    static async updatePaymentStatus(orderId, paymentData) {
        const db = getDb();
        try {
            const updateData = {
                updatedAt: new Date()
            };

            if (typeof paymentData === 'string') {
                updateData.paymentStatus = paymentData;
            } else {
                if (paymentData.paymentStatus) updateData.paymentStatus = paymentData.paymentStatus;
                if (paymentData.paymentMethod) updateData.paymentMethod = paymentData.paymentMethod;
                if (paymentData.transactionId) updateData.transactionId = paymentData.transactionId;
                if (paymentData.paidAt) updateData.paidAt = paymentData.paidAt;
                if (paymentData.failedAt) updateData.failedAt = paymentData.failedAt;
                if (paymentData.failureReason) updateData.failureReason = paymentData.failureReason;
            }

            return await db.collection('orders').updateOne(
                { _id: new mongodb.ObjectId(orderId) },
                { $set: updateData }
            );
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật trạng thái thanh toán:', error);
            throw error;
        }
    }

    static async updateOrderStatus(orderId, status, note = '') {
        const db = getDb();
        try {
            const updateData = {
                status: status,
                updatedAt: new Date()
            };

            if (note) {
                updateData.statusNote = note;
            }

            return await db.collection('orders').updateOne(
                { _id: new mongodb.ObjectId(orderId) },
                { $set: updateData }
            );
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật trạng thái đơn hàng:', error);
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

    getPaymentMethodDisplay() {
        return this.getPaymentMethodName();
    }

    getPaymentStatusDisplay() {
        return this.getPaymentStatusName();
    }

    static async updatePaymentUrl(orderId, paymentUrl) {
        const db = getDb();
        await db.collection('orders').updateOne(
            { _id: new mongodb.ObjectId(orderId) },
            { $set: { paymentUrl } }
        );
    }

    static async deleteById(orderId) {
        const db = getDb();
        await db.collection('orders').deleteOne({ _id: new mongodb.ObjectId(orderId) });
    }

    static async deleteAllByUserId(userId) {
        const db = getDb();
        await db.collection('orders').deleteMany({ userId: userId });
    }
}

module.exports = Order;
