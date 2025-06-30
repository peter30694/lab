const path = require('path');
const fs = require('fs');

const imageHandler = (req, res, next) => {
    // Check if the request is for a product image
    if (req.path.startsWith('/images/products/')) {
        const imagePath = path.join(__dirname, '..', 'public', req.path);
        
        // Check if the image file exists
        if (!fs.existsSync(imagePath)) {
            // If image doesn't exist, redirect to default image
            return res.redirect('/images/default-product.jpg');
        }
    }
    
    next();
};

module.exports = imageHandler; 