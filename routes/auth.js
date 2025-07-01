const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { sendPasswordChangeNotification } = require('../util/email');

// GET /login
router.get('/login', (req, res, next) => {
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Đăng nhập',
        error: null,
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
});

// POST /login
router.post('/login', async (req, res, next) => {
    try {
        const email = req.body.email;
        const user = await User.findByEmail(email);
        if (!user) {
            return res.render('auth/login', {
                path: '/login',
                pageTitle: 'Đăng nhập',
                error: 'Email không tồn tại',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                user: req.session.user || null
            });
        }

        // Đảm bảo user có role
        if (!user.role) {
            user.role = 'user'; // Set role mặc định là user
        }

        req.session.user = user;
        await req.session.save();
        console.log('User logged in:', user);
        if(user.role === 'admin') {
          return res.redirect('/admin/dashboard');
        }
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.render('auth/login', {
            path: '/login',
            pageTitle: 'Đăng nhập',
            error: 'Có lỗi xảy ra khi đăng nhập',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
});

// POST /logout
router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Lỗi khi đăng xuất:', err);
        }
        res.redirect('/');
    });
});

// GET /profile
router.get('/profile', (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile', {
        path: '/profile',
        pageTitle: 'Thông tin cá nhân',
        user: req.session.user,
        isAuthenticated: true,
        isAdmin: req.session.user && req.session.user.role === 'admin'
    });
});

// GET /profile/edit
router.get('/profile/edit', (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile-edit', {
        path: '/profile/edit',
        pageTitle: 'Chỉnh sửa thông tin cá nhân',
        user: req.session.user,
        isAuthenticated: true,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        error: null,
        success: null
    });
});

// POST /profile/edit
router.post('/profile/edit', async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const { name } = req.body;
        // Cập nhật tên user trong DB
        const User = require('../models/user');
        await User.updateName(req.session.user._id, name);
        req.session.user.name = name;
        await req.session.save();
        res.render('profile-edit', {
            path: '/profile/edit',
            pageTitle: 'Chỉnh sửa thông tin cá nhân',
            user: req.session.user,
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            error: null,
            success: 'Cập nhật thành công!'
        });
    } catch (err) {
        res.render('profile-edit', {
            path: '/profile/edit',
            pageTitle: 'Chỉnh sửa thông tin cá nhân',
            user: req.session.user,
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            error: 'Có lỗi xảy ra khi cập nhật',
            success: null
        });
    }
});

// GET /profile/change-password
router.get('/profile/change-password', (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile-change-password', {
        path: '/profile/change-password',
        pageTitle: 'Đổi mật khẩu',
        user: req.session.user,
        isAuthenticated: true,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        error: null,
        success: null
    });
});

// POST /profile/change-password
router.post('/profile/change-password', async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const { oldPassword, newPassword } = req.body;
        const User = require('../models/user');
        const user = await User.findById(req.session.user._id);
        if (!user) {
            throw new Error('Không tìm thấy user');
        }
        // Giả sử user có phương thức kiểm tra mật khẩu (tuỳ vào model thực tế)
        if (user.password !== oldPassword) {
            return res.render('profile-change-password', {
                path: '/profile/change-password',
                pageTitle: 'Đổi mật khẩu',
                user: req.session.user,
                isAuthenticated: true,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                error: 'Mật khẩu cũ không đúng',
                success: null
            });
        }
        await User.updatePassword(req.session.user._id, newPassword);
        // Gửi email thông báo đổi mật khẩu
        await sendPasswordChangeNotification(user);
        res.render('profile-change-password', {
            path: '/profile/change-password',
            pageTitle: 'Đổi mật khẩu',
            user: req.session.user,
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            error: null,
            success: 'Đổi mật khẩu thành công! Email xác nhận đã được gửi.'
        });
    } catch (err) {
        res.render('profile-change-password', {
            path: '/profile/change-password',
            pageTitle: 'Đổi mật khẩu',
            user: req.session.user,
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            error: 'Có lỗi xảy ra khi đổi mật khẩu',
            success: null
        });
    }
});

// GET /signup
router.get('/signup', (req, res, next) => {
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Đăng ký',
        error: null,
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
});

// POST /signup
router.post('/signup', async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword, phone, address } = req.body;
        if (!name || !email || !password || !confirmPassword) {
            return res.render('auth/signup', {
                path: '/signup',
                pageTitle: 'Đăng ký',
                error: 'Vui lòng nhập đầy đủ thông tin',
                isAuthenticated: false,
                isAdmin: false,
                user: null
            });
        }
        if (password !== confirmPassword) {
            return res.render('auth/signup', {
                path: '/signup',
                pageTitle: 'Đăng ký',
                error: 'Mật khẩu nhập lại không khớp',
                isAuthenticated: false,
                isAdmin: false,
                user: null
            });
        }
        if (phone && !/^\d{10,11}$/.test(phone)) {
            return res.render('auth/signup', {
                path: '/signup',
                pageTitle: 'Đăng ký',
                error: 'Số điện thoại không hợp lệ',
                isAuthenticated: false,
                isAdmin: false,
                user: null
            });
        }
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.render('auth/signup', {
                path: '/signup',
                pageTitle: 'Đăng ký',
                error: 'Email đã được sử dụng',
                isAuthenticated: false,
                isAdmin: false,
                user: null
            });
        }
        // Lưu user mới
        const newUser = await User.create({ name, email, password, phone, address, role: 'user' });
        // Gửi email xác nhận
        const { sendSignupConfirmation } = require('../util/email');
        try {
            await sendSignupConfirmation(newUser);
        } catch (e) { console.error('Không gửi được email xác nhận:', e); }
        // Tự động đăng nhập
        req.session.user = newUser;
        await req.session.save();
        // Hiển thị popup thông báo trên trang chủ
        req.session.signupSuccess = true;
        res.redirect('/');
    } catch (err) {
        res.render('auth/signup', {
            path: '/signup',
            pageTitle: 'Đăng ký',
            error: 'Có lỗi xảy ra khi đăng ký',
            isAuthenticated: false,
            isAdmin: false,
            user: null
        });
    }
});

module.exports = router; 