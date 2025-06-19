module.exports = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).render('error', {
            pageTitle: 'Không có quyền truy cập',
            path: '/error',
            error: 'Bạn không có quyền truy cập trang này'
        });
    }
    next();
}; 