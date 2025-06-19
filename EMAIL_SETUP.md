# Hướng dẫn cấu hình Gmail cho gửi email

## Bước 1: Tạo App Password cho Gmail

1. Đăng nhập vào tài khoản Gmail của bạn
2. Truy cập [Google Account Settings](https://myaccount.google.com/)
3. Chọn "Security" (Bảo mật)
4. Bật "2-Step Verification" (Xác minh 2 bước) nếu chưa bật
5. Tìm "App passwords" (Mật khẩu ứng dụng)
6. Chọn "Mail" và "Other" (custom name)
7. Nhập tên ứng dụng: "ITC School Store"
8. Copy mật khẩu 16 ký tự được tạo

## Bước 2: Cấu hình file .env

Mở file `.env` và cập nhật:

```env
# Cấu hình Gmail SMTP
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
ADMIN_EMAIL=admin@phuongstore.com
```

**Lưu ý:**
- `EMAIL_USER`: Địa chỉ Gmail của bạn
- `EMAIL_PASSWORD`: App Password 16 ký tự (KHÔNG phải mật khẩu Gmail thường)
- `ADMIN_EMAIL`: Email nhận thông báo đơn hàng mới

## Bước 3: Kiểm tra cấu hình

Khi khởi động ứng dụng, bạn sẽ thấy thông báo:
- ✅ Kết nối email thành công! (nếu cấu hình đúng)
- ❌ Lỗi kết nối email (nếu cấu hình sai)

## Tính năng mới

### Form checkout đã được cập nhật:
- Thêm trường nhập email
- Email này sẽ được sử dụng để gửi xác nhận đơn hàng
- Thông tin email được lưu trong database cùng đơn hàng

### Email được gửi:
1. **Email xác nhận đơn hàng** → Gửi đến email khách hàng nhập trong form
2. **Email thông báo admin** → Gửi đến ADMIN_EMAIL

### Thông tin trong email:
- Chi tiết đơn hàng
- Thông tin giao hàng đầy đủ (bao gồm email)
- Danh sách sản phẩm
- Tổng tiền

## Troubleshooting

### Lỗi "Invalid login"
- Kiểm tra EMAIL_USER có đúng định dạng email
- Đảm bảo đã bật 2-Step Verification
- Sử dụng App Password, không phải mật khẩu Gmail thường

### Lỗi "Connection timeout"
- Kiểm tra kết nối internet
- Thử lại sau vài phút

### Email không được gửi
- Kiểm tra console log để xem lỗi chi tiết
- Đảm bảo ADMIN_EMAIL được cấu hình đúng