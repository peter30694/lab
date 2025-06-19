const nodemailer = require('nodemailer');
require('dotenv').config();

// Tạo transporter với cấu hình Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Kiểm tra kết nối mail
transporter.verify(function (error, success) {
    if (error) {
        console.log('Lỗi kết nối email:', error);
    } else {
        console.log('✅ Kết nối email thành công!');
    }
});

// Gửi email xác nhận đơn hàng cho khách hàng
const sendOrderConfirmation = async (order, user) => {
    try {
        const customerEmail = order.shippingInfo?.email || user.email;
        const customerName = order.shippingInfo?.name || user.name;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: 'Xác nhận đơn hàng - Phương Store',
            html: `
                <h1>Xin chào ${customerName}!</h1>
                <p>Cảm ơn bạn đã đặt hàng tại Phương Store.</p>
                <h2>Chi tiết đơn hàng:</h2>
                <p>Mã đơn hàng: ${order._id}</p>
                <p>Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                <h3>Thông tin giao hàng:</h3>
                <p>Họ tên: ${order.shippingInfo?.name}</p>
                <p>Điện thoại: ${order.shippingInfo?.phone}</p>
                <p>Email: ${order.shippingInfo?.email}</p>
                <p>Địa chỉ: ${order.shippingInfo?.address}</p>
                <h3>Thông tin thanh toán:</h3>
                <p>Phương thức: ${order.getPaymentMethodDisplay()}</p>
                <p>Trạng thái thanh toán: ${order.getPaymentStatusDisplay()}</p>
                ${order.paymentMethod === 'bank' && order.paymentStatus === 'awaiting' ? `
                    <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
                        <h4>Thông tin chuyển khoản:</h4>
                        <p><strong>Ngân hàng:</strong> Vietcombank</p>
                        <p><strong>Số tài khoản:</strong> 1234567890</p>
                        <p><strong>Chủ tài khoản:</strong> Phương Store</p>
                        <p><strong>Nội dung:</strong> DH${order._id}</p>
                        <p><strong>Số tiền:</strong> ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                    </div>
                ` : ''}
                ${order.paymentMethod === 'ewallet' && order.paymentStatus === 'awaiting' ? `
                    <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
                        <h4>Thông tin thanh toán ví điện tử:</h4>
                        <p><strong>Ví MoMo:</strong> 0123456789</p>
                        <p><strong>Tên:</strong> Phương Store</p>
                        <p><strong>Nội dung:</strong> DH${order._id}</p>
                        <p><strong>Số tiền:</strong> ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                    </div>
                ` : ''}
                <h3>Danh sách sản phẩm:</h3>
                <ul>
                    ${order.items.map(item => `
                        <li>
                            ${item.title} - Số lượng: ${item.quantity} - 
                            Giá: ${item.price.toLocaleString('vi-VN')} VNĐ
                        </li>
                    `).join('')}
                </ul>
                <p>Trạng thái đơn hàng: Chờ xác nhận</p>
                <p>Thời gian đặt hàng: ${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                <p>Trân trọng,<br>Phương Store</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email xác nhận đơn hàng đã gửi:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email xác nhận:', error);
        return false;
    }
};

// Gửi email đặt lại mật khẩu
const sendPasswordReset = async (user, resetToken) => {
    try {
        const resetUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;
        const mailOptions = {
            from: '"Phương Store" <no-reply@phuongstore.com>',
            to: user.email,
            subject: 'Đặt lại mật khẩu - Phương Store',
            html: `
                <h1>Xin chào ${user.name}!</h1>
                <p>Bạn đã yêu cầu đặt lại mật khẩu tại Phương Store.</p>
                <p>Vui lòng click vào link bên dưới để đặt lại mật khẩu:</p>
                <a href="${resetUrl}">Đặt lại mật khẩu</a>
                <p>Link này sẽ hết hạn sau 1 giờ.</p>
                <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
                <p>Trân trọng,<br>Phương Store</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email đặt lại mật khẩu đã gửi:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email đặt lại mật khẩu:', error);
        return false;
    }
};

// Gửi email thông báo đơn hàng mới cho admin
const sendNewOrderNotification = async (order, user) => {
    try {
        const customerName = order.shippingInfo?.name || user.name;
        const customerEmail = order.shippingInfo?.email || user.email;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `🔔 Đơn hàng mới từ ${customerName}`,
            html: `
                <h1>Thông báo đơn hàng mới</h1>
                <p>Khách hàng: ${customerName} (${customerEmail})</p>
                <p>Mã đơn hàng: ${order._id}</p>
                <p>Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                <p>Thời gian: ${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                <h3>Thông tin giao hàng:</h3>
                <p>Họ tên: ${order.shippingInfo?.name}</p>
                <p>Điện thoại: ${order.shippingInfo?.phone}</p>
                <p>Email: ${order.shippingInfo?.email}</p>
                <p>Địa chỉ: ${order.shippingInfo?.address}</p>
                <h3>Thông tin thanh toán:</h3>
                <p>Phương thức: ${order.getPaymentMethodDisplay()}</p>
                <p>Trạng thái thanh toán: ${order.getPaymentStatusDisplay()}</p>
                <h3>Chi tiết sản phẩm:</h3>
                <ul>
                    ${order.items.map(item => `
                        <li>${item.title} - SL: ${item.quantity} - 
                        Giá: ${item.price.toLocaleString('vi-VN')} VNĐ</li>
                    `).join('')}
                </ul>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email thông báo đơn hàng admin đã gửi:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email admin:', error);
        return false;
    }
};

// Xuất module
module.exports = {
    sendOrderConfirmation,
    sendPasswordReset,
    sendNewOrderNotification
};
