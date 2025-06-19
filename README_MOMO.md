# Tích hợp cổng thanh toán MoMo

## Tổng quan
Hệ thống đã được tích hợp cổng thanh toán MoMo, cho phép khách hàng thanh toán đơn hàng thông qua ví điện tử MoMo một cách an toàn và tiện lợi.

## Tính năng đã tích hợp

### 1. Frontend (Giao diện người dùng)
- ✅ Thêm phương thức thanh toán MoMo riêng biệt trong trang checkout
- ✅ Giao diện hiển thị thông tin thanh toán MoMo
- ✅ JavaScript xử lý lựa chọn phương thức thanh toán

### 2. Backend (Xử lý server)
- ✅ Service MoMo (`util/momo.js`) để tương tác với MoMo API
- ✅ Controller MoMo (`controllers/momo.js`) xử lý callback
- ✅ Routes cho MoMo payment
- ✅ Tích hợp vào flow đặt hàng

### 3. Cấu hình
- ✅ Biến môi trường cho MoMo API
- ✅ Cấu hình sandbox cho testing

## Cấu hình MoMo

### Biến môi trường (.env)
```env
# MoMo Payment Configuration
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENVIRONMENT=sandbox
MOMO_RETURN_URL=http://localhost:5000/momo/return
MOMO_NOTIFY_URL=http://localhost:5000/momo/notify
```

### Thông tin test (Sandbox)
- **Partner Code**: MOMO
- **Access Key**: F8BBA842ECF85
- **Secret Key**: K951B6PE1waDMi640xX08PD3vg6EkVlz
- **Environment**: sandbox

## Quy trình thanh toán MoMo

### 1. Khách hàng đặt hàng
1. Khách hàng chọn sản phẩm và thêm vào giỏ hàng
2. Vào trang checkout và điền thông tin giao hàng
3. Chọn phương thức thanh toán "Ví MoMo"
4. Nhấn "Xác nhận đặt hàng"

### 2. Xử lý thanh toán
1. Hệ thống tạo đơn hàng trong database
2. Gọi MoMo API để tạo payment request
3. Chuyển hướng khách hàng đến trang thanh toán MoMo
4. Khách hàng thực hiện thanh toán trên app/web MoMo

### 3. Xử lý kết quả
1. MoMo gửi kết quả về qua return URL (cho user)
2. MoMo gửi webhook notification (cho server)
3. Hệ thống cập nhật trạng thái đơn hàng
4. Gửi email xác nhận cho khách hàng

## API Endpoints

### Routes đã thêm
```javascript
// Return URL - xử lý khi user quay lại từ MoMo
GET /momo/return

// Notify URL - webhook từ MoMo server
POST /momo/notify

// Kiểm tra trạng thái thanh toán
GET /momo/status/:orderId
```

## Files đã tạo/chỉnh sửa

### Files mới
- `util/momo.js` - Service xử lý MoMo API
- `controllers/momo.js` - Controller xử lý callback MoMo
- `README_MOMO.md` - Tài liệu này

### Files đã chỉnh sửa
- `views/shop/checkout.ejs` - Thêm UI cho MoMo
- `public/js/payment.js` - Thêm logic frontend
- `controllers/shop.js` - Tích hợp MoMo vào flow đặt hàng
- `routes/shop.js` - Thêm routes MoMo
- `.env` và `.env.example` - Thêm cấu hình MoMo
- `package.json` - Thêm dependency `momo-payment-sdk`

## Testing

### Môi trường Sandbox
- Sử dụng app MoMo Test để test thanh toán
- Hoặc sử dụng các số điện thoại test do MoMo cung cấp
- Mật khẩu test: 000000
- Mã xác thực: 000000

### Số điện thoại test
- **Thành công**: 0917003003, 0919100100, 0918002000
- **Thất bại**: 0917030000, 0919100010, 0918002020

## Bảo mật

### Xác thực Signature
- Tất cả request/response đều được xác thực bằng HMAC-SHA256
- Sử dụng Secret Key để tạo và verify signature
- Đảm bảo tính toàn vẹn dữ liệu

### Mã hóa RSA
- Dữ liệu nhạy cảm được mã hóa bằng RSA
- Sử dụng Public Key để mã hóa
- MoMo sử dụng Private Key để giải mã

## Lưu ý quan trọng

### Production
- Cần đăng ký tài khoản business tại https://business.momo.vn/
- Thay đổi environment từ 'sandbox' thành 'live'
- Cập nhật credentials thực tế
- Cấu hình domain và SSL certificate

### Webhook URL
- Notify URL phải accessible từ internet
- Sử dụng HTTPS trong production
- Có thể dùng ngrok cho testing local

### Error Handling
- Hệ thống đã xử lý các lỗi phổ biến
- Log chi tiết để debug
- Fallback về phương thức thanh toán khác nếu cần

## Hỗ trợ

### Tài liệu MoMo
- Developer Portal: https://developers.momo.vn/
- API Documentation: https://developers.momo.vn/v3/

### Contact
- Email hỗ trợ: support@momo.vn
- Hotline: 1900 545 441

---

**Lưu ý**: Đây là tích hợp sandbox cho testing. Để sử dụng trong production, cần đăng ký tài khoản business và cập nhật credentials thực tế.