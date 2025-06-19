const express = require('express');
const router = express.Router();
const User = require('../models/user');

// GET /login
router.get('/login', (req, res, next) => {
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Đăng nhập',
        error: null
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
                error: 'Email không tồn tại'
            });
        }

        // Đảm bảo user có role
        if (!user.role) {
            user.role = 'user'; // Set role mặc định là user
        }

        req.session.user = user;
        await req.session.save();
        console.log('User logged in:', user);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.render('auth/login', {
            path: '/login',
            pageTitle: 'Đăng nhập',
            error: 'Có lỗi xảy ra khi đăng nhập'
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

module.exports = router; 