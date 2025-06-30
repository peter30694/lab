require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const mongoConnect = require('./util/database').mongoConnect;
const User = require('./models/user');
const { notFoundHandler, errorHandler, asyncHandler } = require('./middleware/errorHandler');
const validationMiddleware = require('./middleware/validation');
const imageHandler = require('./middleware/imageHandler');
const { logger, requestLogger } = require('./util/logger');

const app = express();

// Bắt lỗi uncaught exception
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', err, { fatal: true });
    process.exit(1);
});

// Bắt lỗi unhandled rejection
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', reason, { promise: promise.toString(), fatal: true });
    process.exit(1);
});

// Cấu hình session store
const store = new MongoDBStore({
    uri: process.env.MONGODB_URI,
    collection: 'sessions'
});

store.on('error', function (error) {
    logger.error('Session store error', error);
});

//Khai báo engine
app.set('view engine', 'ejs');
app.set('views', 'views')

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const vnpayRoutes = require('./routes/vnpay');


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Thêm middleware để parse JSON
app.use(express.static(path.join(__dirname, 'public')));

// Add image handler middleware to handle missing product images
app.use(imageHandler);

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
app.use(asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    
    const user = await User.findById(req.session.user._id);
    if (!user) {
        // Xóa session nếu user không tồn tại
        req.session.destroy();
        return next();
    }
    
    req.user = user;
    next();
}));

// Request logging middleware
app.use(requestLogger);

// Authentication middleware
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.user ? true : false;
    res.locals.isAdmin = req.session.user && req.session.user.role === 'admin';
    res.locals.user = req.session.user || null; // Add user information
    
    logger.debug('Request authentication', {
        url: req.url,
        method: req.method,
        isAuthenticated: res.locals.isAuthenticated,
        isAdmin: res.locals.isAdmin,
        userId: req.session.user ? req.session.user._id : null
    });
    
    next();
});

app.use('/admin', adminRoutes);
app.use('/vnpay', vnpayRoutes);

app.use(authRoutes);
app.use(shopRoutes);

// Middleware xử lý lỗi 404 và lỗi chung
app.use(notFoundHandler);
app.use(errorHandler);

// Kết nối MongoDB và khởi động server
const startServer = async () => {
    try {
        await new Promise((resolve, reject) => {
            mongoConnect(() => {
                logger.info('MongoDB connected successfully');
                resolve();
            });
        });

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            logger.info(`Server started successfully`, { 
                port,
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString()
            });
        });
    } catch (err) {
        logger.error('Failed to start server', err);
        process.exit(1);
    }
};

startServer();

