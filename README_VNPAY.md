# Tích hợp cổng thanh toán VNPay

## Tổng quan
Hệ thống đã được tích hợp cổng thanh toán VNPay, cho phép khách hàng thanh toán đơn hàng thông qua các phương thức thanh toán phổ biến tại Việt Nam như thẻ ATM, Internet Banking, QR Code một cách an toàn và tiện lợi.

## Tính năng đã tích hợp

### 1. Frontend (Giao diện người dùng)
- ✅ Thêm phương thức thanh toán VNPay riêng biệt trong trang checkout
- ✅ Giao diện hiển thị thông tin thanh toán VNPay
- ✅ JavaScript xử lý lựa chọn phương thức thanh toán

### 2. Backend (Xử lý server)
- ✅ Service VNPay (`util/vnpay.js`) để tương tác với VNPay API
- ✅ Controller VNPay (`controllers/vnpay.js`) xử lý callback
- ✅ Routes cho VNPay payment
- ✅ Tích hợp vào flow đặt hàng

### 3. Cấu hình
- ✅ Biến môi trường cho VNPay API
- ✅ Cấu hình sandbox cho testing

## Cấu hình VNPay

### Biến môi trường (.env)
```env
# VNPay Payment Configuration
VNPAY_GATEWAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=UWXDEI4Q
VNPAY_HASH_SECRET=X11Q09FCSZ6KWF929Y3E1IZCEBR0O5Y7
VNPAY_RETURN_URL=http://localhost:5000/vnpay/return
VNPAY_IPN_URL=http://localhost:5000/vnpay/ipn
```

### Thông tin test (Sandbox)
- **TMN Code**: VNPAY01
- **Hash Secret**: RAOEXHYVSDDIIENYWSLDIIZTANXUXZFJ
- **Gateway**: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

### Thông tin truy cập Merchant Admin
- **Địa chỉ**: https://sandbox.vnpayment.vn/merchantv2/
- **Tên đăng nhập**: lhpppppp306@gmail.com
- **Mật khẩu**: (Mật khẩu đã đăng ký tại giao diện Merchant môi trường TEST)

### Kiểm tra test case - IPN URL
- **Kịch bản test (SIT)**: https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login
- **Tên đăng nhập**: lhpppppp306@gmail.com
- **Mật khẩu**: (Mật khẩu đã đăng ký tại giao diện Merchant môi trường TEST)

## Quy trình thanh toán VNPay

### 1. Khách hàng đặt hàng
1. Khách hàng chọn sản phẩm và thêm vào giỏ hàng
2. Vào trang checkout và điền thông tin giao hàng
3. Chọn phương thức thanh toán "VNPay"
4. Nhấn "Xác nhận đặt hàng"

### 2. Xử lý thanh toán
1. Hệ thống tạo đơn hàng trong database
2. Gọi VNPay API để tạo payment URL
3. Chuyển hướng khách hàng đến trang thanh toán VNPay
4. Khách hàng chọn phương thức thanh toán (ATM, Internet Banking, QR Code)
5. Thực hiện thanh toán

### 3. Xử lý kết quả
1. VNPay gửi kết quả về qua return URL (cho user)
2. VNPay gửi IPN notification (cho server)
3. Hệ thống cập nhật trạng thái đơn hàng
4. Gửi email xác nhận cho khách hàng

## API Endpoints

### Routes đã thêm
```javascript
// Return URL - xử lý khi user quay lại từ VNPay
GET /vnpay/return

// IPN URL - webhook từ VNPay server
POST /vnpay/ipn

// Kiểm tra trạng thái thanh toán
GET /vnpay/status/:orderId
```

## Files đã tạo/chỉnh sửa

### Files mới
- `util/vnpay.js` - Service xử lý VNPay API
- `controllers/vnpay.js` - Controller xử lý callback VNPay
- `README_VNPAY.md` - Tài liệu này

### Files đã chỉnh sửa
- `views/shop/checkout.ejs` - Thêm UI cho VNPay
- `public/js/payment.js` - Thêm logic frontend
- `controllers/shop.js` - Tích hợp VNPay vào flow đặt hàng
- `routes/shop.js` - Thêm routes VNPay
- `.env` và `.env.example` - Thêm cấu hình VNPay
- `package.json` - Thêm dependency `vn-payments`

## Testing

### Môi trường Sandbox
- Sử dụng thông tin thẻ test do VNPay cung cấp
- Không cần đăng ký tài khoản thật

### Thông tin thẻ test

#### Thẻ ATM nội địa (thành công)
- **Số thẻ**: 9704198526191432198
- **Tên chủ thẻ**: NGUYEN VAN A
- **Ngày phát hành**: 07/15
- **Mật khẩu**: 123456

#### Thẻ ATM nội địa (thất bại)
- **Số thẻ**: 9704198526191432199
- **Tên chủ thẻ**: NGUYEN VAN A
- **Ngày phát hành**: 07/15
- **Mật khẩu**: 123456

#### Internet Banking
- **Ngân hàng**: NCB
- **Tài khoản**: 9704198526191432198
- **Mật khẩu**: 123456

## Phương thức thanh toán được hỗ trợ

### 1. Thẻ ATM nội địa
- Tất cả các ngân hàng lớn tại Việt Nam
- Giao dịch trực tuyến 24/7
- Phí giao dịch thấp

### 2. Internet Banking
- Hỗ trợ hầu hết các ngân hàng
- Bảo mật cao với OTP
- Giao dịch nhanh chóng

### 3. QR Code
- Quét mã QR bằng app ngân hàng
- Thanh toán nhanh chóng
- Không cần nhập thông tin thẻ

### 4. Thẻ tín dụng/ghi nợ quốc tế
- Visa, MasterCard, JCB
- Hỗ trợ khách hàng quốc tế
- Bảo mật 3D Secure

## Bảo mật

### Xác thực Signature
- Tất cả request/response đều được xác thực bằng HMAC-SHA512
- Sử dụng Hash Secret để tạo và verify signature
- Đảm bảo tính toàn vẹn dữ liệu

### Mã hóa dữ liệu
- Thông tin thanh toán được mã hóa
- Tuân thủ chuẩn PCI DSS
- SSL/TLS cho tất cả giao dịch

### Xác thực giao dịch
- OTP qua SMS
- 3D Secure cho thẻ quốc tế
- Xác thực sinh trắc học (nếu có)

## Lưu ý quan trọng

### Production
- Cần đăng ký tài khoản merchant tại https://vnpay.vn/
- Thay đổi gateway từ sandbox sang production
- Cập nhật TMN Code và Hash Secret thực tế
- Cấu hình domain và SSL certificate

### Webhook URL
- IPN URL phải accessible từ internet
- Sử dụng HTTPS trong production
- Có thể dùng ngrok cho testing local

### Error Handling
- Hệ thống đã xử lý các lỗi phổ biến
- Log chi tiết để debug
- Fallback về phương thức thanh toán khác nếu cần

### Giới hạn giao dịch
- **Sandbox**: Không giới hạn số lượng giao dịch
- **Production**: Tùy thuộc vào hợp đồng với VNPay
- **Số tiền**: Tối đa 500,000,000 VNĐ/giao dịch

## Phí giao dịch

### Sandbox
- Miễn phí hoàn toàn
- Chỉ dành cho testing

### Production
- Phí giao dịch tùy thuộc vào hợp đồng
- Thường dao động từ 1.1% - 2.2%
- Có thể thương lượng dựa trên volume

## Hỗ trợ

### Tài liệu VNPay
- Developer Portal: https://sandbox.vnpayment.vn/apis/
- API Documentation: https://sandbox.vnpayment.vn/apis/docs/
- Merchant Portal: https://merchant.vnpay.vn/

### Contact
- Email hỗ trợ: support@vnpay.vn
- Hotline: 1900 555 577
- Website: https://vnpay.vn/


| **Phí giao dịch** | 1.1% - 2.2% | 1.5% - 3% |
| **Thời gian xử lý** | Tức thì | Tức thì |
| **Bảo mật** | PCI DSS, 3D Secure | Mã hóa RSA, OTP |
| **Hỗ trợ quốc tế** | Có (thẻ Visa/Master) | Không |

## Lưu ý bảo mật

1. **Không bao giờ** commit các thông tin nhạy cảm như `VNPAY_HASH_SECRET` vào repository
2. Sử dụng HTTPS cho tất cả các URL callback trong production
3. Luôn validate và verify chữ ký từ VNPay
4. Implement rate limiting cho các endpoint thanh toán
5. Log tất cả các giao dịch để audit

## Troubleshooting

### Lỗi thường gặp

1. **Invalid signature**: Kiểm tra `VNPAY_HASH_SECRET`
2. **Invalid merchant**: Kiểm tra `VNPAY_TMN_CODE`
3. **Transaction not found**: Kiểm tra format `orderId`
4. **Amount mismatch**: Đảm bảo amount được format đúng (VND, không có dấu phẩy)

#### 1. Invalid signature
```
Nguyên nhân: Hash Secret không đúng hoặc cách tính signature sai
Giải pháp: Kiểm tra lại VNPAY_HASH_SECRET trong .env
```

#### 2. Invalid TMN Code
```
Nguyên nhân: TMN Code không tồn tại hoặc không đúng
Giải pháp: Kiểm tra lại VNPAY_TMN_CODE trong .env
```

#### 3. Return URL không accessible
```
Nguyên nhân: URL không thể truy cập từ internet
Giải pháp: Sử dụng ngrok hoặc deploy lên server public
```

#### 4. Giao dịch bị từ chối
```
Nguyên nhân: Thông tin thẻ sai hoặc không đủ số dư
Giải pháp: Sử dụng thông tin thẻ test đúng
```

## Tài liệu tham khảo

- **Tài liệu hướng dẫn tích hợp**: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- **Code demo tích hợp**: https://sandbox.vnpayment.vn/apis/vnpay-demo/code-demo-tích-hợp
- **Merchant Portal**: https://sandbox.vnpayment.vn/merchantv2/
- **Test Environment**: https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login

---

**Lưu ý**: Đây là tích hợp sandbox cho testing. Để sử dụng trong production, cần đăng ký tài khoản merchant và cập nhật credentials thực tế.