require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const mongoConnect = require('./util/database').mongoConnect;
const User = require('./models/user');

const app = express();

// Cấu hình session store
const store = new MongoDBStore({
    uri: process.env.MONGODB_URI,
    collection: 'sessions'
});

store.on('error', function (error) {
    console.error('Lỗi session store:', error);
});

//Khai báo engine
app.set('view engine', 'ejs');
app.set('views', 'views')

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình session
app.use(session({
    secret: process.env.SESSION_SECRET || 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        secure: false // set to true if using HTTPS
    }
}));

// Middleware để lấy thông tin user từ session
app.use(async (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    try {
        const user = await User.findById(req.session.user._id);
        if (!user) {
            return next();
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('Lỗi middleware user:', err);
        next();
    }
});

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.user ? true : false;
    res.locals.isAdmin = req.session.user && req.session.user.role === 'admin';
    console.log('Session:', req.session);
    console.log('Session user:', req.session.user);
    console.log('Is authenticated:', res.locals.isAuthenticated);
    console.log('Is admin:', res.locals.isAdmin);
    next();
});

app.use('/admin', adminRoutes);
app.use(authRoutes);
app.use(shopRoutes);

// Xử lý lỗi 404
app.use((req, res, next) => {
    res.status(404).render('404', {
        pageTitle: 'Page not found',
        path: '/404',
        isAuthenticated: req.session.user ? true : false
    });
});

// Xử lý lỗi chung
app.use((error, req, res, next) => {
    console.error('Lỗi ứng dụng:', error);
    res.status(500).render('error', {
        pageTitle: 'Lỗi',
        path: '/error',
        error: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
        isAuthenticated: req.session.user ? true : false
    });
});

// Kết nối MongoDB và khởi động server
const startServer = async () => {
    try {
        await new Promise((resolve, reject) => {
            mongoConnect(() => {
                console.log('Đã kết nối MongoDB thành công!');
                resolve();
            });
        });

        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server đang chạy tại port ${process.env.PORT || 3000}`);
        });
    } catch (err) {
        console.error('Lỗi khởi động server:', err);
        process.exit(1);
    }
};

// Xử lý lỗi không bắt được
process.on('uncaughtException', (err) => {
    console.error('Lỗi không bắt được:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Promise rejection không được xử lý:', err);
    process.exit(1);
});

startServer();

