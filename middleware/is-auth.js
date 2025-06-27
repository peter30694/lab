module.exports = (req, res, next) => {
    try {
        console.log('🔐 Checking auth for:', req.url);
        console.log('🔐 Session exists:', !!req.session);
        console.log('🔐 Session user:', !!req.session?.user);
        
        if (!req.session.user) {
            console.log('Chưa đăng nhập, chuyển hướng đến trang tạo user mặc định');
            return res.redirect('/create-default-user');
        }

        if (!req.session.user._id) {
            console.log('User không có _id, chuyển hướng đến trang tạo user mặc định');
            return res.redirect('/create-default-user');
        }

        console.log('🔐 Auth passed for user:', req.session.user._id);
        next();
    } catch (error) {
        console.error('🚨 Error in is-auth middleware:', error);
        return res.status(500).json({ error: 'Authentication error' });
    }
};