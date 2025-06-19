module.exports = (req, res, next) => {
    if (!req.session.user) {
        console.log('Chưa đăng nhập, chuyển hướng đến trang tạo user mặc định');
        return res.redirect('/create-default-user');
    }

    if (!req.session.user._id) {
        console.log('User không có _id, chuyển hướng đến trang tạo user mặc định');
        return res.redirect('/create-default-user');
    }

    next();
}; 