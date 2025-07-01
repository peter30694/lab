const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');

// Ensure PDF directory exists
const pdfDirPath = path.join(__dirname, '..', 'data', 'pdfs');
if (!fs.existsSync(pdfDirPath)) {
    console.log('Creating PDF directory:', pdfDirPath);
    fs.mkdirSync(pdfDirPath, { recursive: true });
}

// Format currency and date
const formatCurrency = (amount) => {
    try {
        return '$' + amount.toLocaleString('en-US');
    } catch (error) {
        console.error('Error formatting currency:', error);
        return '$' + amount;
    }
};

// Format date using Moment.js
const formatDate = (date, format = 'MM/DD/YYYY') => {
    try {
        // Kiểm tra date có hợp lệ không trước khi format
        const mDate = moment(date);
        if (mDate.isValid()) {
            return mDate.format(format);
        } else {
            console.warn('Invalid date provided to formatDate:', date);
            // Trả về ngày hiện tại nếu date không hợp lệ
            return moment().format(format); 
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return moment().format(format); // Trả về ngày hiện tại nếu có lỗi
    }
};

// Draw a horizontal line
const drawLine = (doc, y) => {
    try {
        doc.strokeColor('#aaa').moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
    } catch (error) {
        console.error('Error drawing line:', error);
    }
};

// Generate Order Invoice PDF - NO HEADER/FOOTER
const generateOrderPDF = async (order, user) => {
    return new Promise((resolve, reject) => {
        try {
            const fileName = `order-${order._id}-${moment().format('YYYYMMDD')}.pdf`;
            const filePath = path.join(pdfDirPath, fileName);
            const doc = new PDFDocument({ 
                size: 'A4', 
                margin: 50,
                font: 'Helvetica'
            });

            const writeStream = fs.createWriteStream(filePath);
            writeStream.on('error', (error) => reject(error));
            doc.pipe(writeStream);

            // --- Variables & Colors ---
            const pageMargins = doc.page.margins;
            const startY = pageMargins.top;
            const contentWidth = doc.page.width - pageMargins.left - pageMargins.right;
            const endY = doc.page.height - pageMargins.bottom;
            let currentY = startY;
            const lineGap = 4;
            const primaryColor = '#2563EB';
            const greyColor = '#F3F4F6';
            const darkGreyColor = '#E5E7EB';
            const textColor = '#1F2937';
            const lightTextColor = '#6B7280';

            // --- Helper Function to Add New Page ---
            const addNewPageIfNeeded = (neededHeight) => {
                if (currentY + neededHeight > endY - lineGap) {
                    doc.addPage();
                    currentY = startY;
                    return true; 
                }
                return false; 
            };
            
            // --- Invoice Title ---
            addNewPageIfNeeded(36);
            doc.font('Helvetica-Bold').fontSize(20).fillColor(textColor)
               .text('ORDER INVOICE', pageMargins.left, currentY, { align: 'center', width: contentWidth });
            currentY += 28;
            drawLine(doc, currentY);
            currentY += 8;

            // --- Info Boxes (side by side, same height, balanced, sát bảng) ---
            addNewPageIfNeeded(120);
            const infoBoxGap = 12;
            const infoBoxWidth = (contentWidth - infoBoxGap) / 2;
            const infoBoxHeight = 110;
            const infoBoxStartY = currentY;
            const infoBoxPadX = 18;
            const infoBoxPadY = 16;

            // Box 1: Order Info
            doc.roundedRect(pageMargins.left, infoBoxStartY, infoBoxWidth, infoBoxHeight, 10).fillAndStroke(greyColor, darkGreyColor);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11).text('Order Information', pageMargins.left + infoBoxPadX, infoBoxStartY + infoBoxPadY - 2);
            doc.font('Helvetica').fontSize(9);
            let y = infoBoxStartY + infoBoxPadY + 14;
            doc.text(`Order ID: ${order._id}`, pageMargins.left + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Order Date: ${formatDate(order.createdAt, 'MMM D, YYYY HH:mm')}`, pageMargins.left + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Status: ${order.status || 'Pending'}`, pageMargins.left + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Payment Method: ${order.paymentMethod || 'N/A'}`, pageMargins.left + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Payment Status: ${order.paymentStatus || 'N/A'}`, pageMargins.left + infoBoxPadX, y, { lineGap });

            // Box 2: Customer Info
            doc.roundedRect(pageMargins.left + infoBoxWidth + infoBoxGap, infoBoxStartY, infoBoxWidth, infoBoxHeight, 10).fillAndStroke(greyColor, darkGreyColor);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11).text('Customer Information', pageMargins.left + infoBoxWidth + infoBoxGap + infoBoxPadX, infoBoxStartY + infoBoxPadY - 2);
            doc.font('Helvetica').fontSize(9);
            y = infoBoxStartY + infoBoxPadY + 14;
            doc.text(`Name: ${user.name || (order.shippingInfo && order.shippingInfo.name) || 'N/A'}`, pageMargins.left + infoBoxWidth + infoBoxGap + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Email: ${user.email || (order.shippingInfo && order.shippingInfo.email) || 'N/A'}`, pageMargins.left + infoBoxWidth + infoBoxGap + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Phone: ${(order.shippingInfo && order.shippingInfo.phone) || user.phone || 'N/A'}`, pageMargins.left + infoBoxWidth + infoBoxGap + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Shipping Address: ${(order.shippingInfo && order.shippingInfo.address) || user.address || 'N/A'}`, pageMargins.left + infoBoxWidth + infoBoxGap + infoBoxPadX, y, { lineGap, width: infoBoxWidth - 2 * infoBoxPadX });
            currentY = infoBoxStartY + infoBoxHeight + 10;

            // --- Table Header ---
            addNewPageIfNeeded(32);
            const tableHeaderY = currentY;
            doc.rect(pageMargins.left, tableHeaderY, contentWidth, 24).fill(darkGreyColor);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
            doc.text('Product', pageMargins.left + 12, tableHeaderY + 8, { width: contentWidth * 0.3 - 12 })
               .text('SKU', pageMargins.left + contentWidth * 0.3, tableHeaderY + 8, { width: contentWidth * 0.15, align: 'left' })
               .text('Quantity', pageMargins.left + contentWidth * 0.45, tableHeaderY + 8, { width: contentWidth * 0.12, align: 'right' })
               .text('Unit Price', pageMargins.left + contentWidth * 0.57, tableHeaderY + 8, { width: contentWidth * 0.18, align: 'right' })
               .text('Total Price', pageMargins.left + contentWidth * 0.75, tableHeaderY + 8, { width: contentWidth * 0.25 - 12, align: 'right' });
            currentY = tableHeaderY + 26;
            doc.font('Helvetica');

            // --- Table Body ---
            let i = 0;
            let subtotal = 0;
            order.items.forEach((item) => {
                const productName = item.title || (item.product ? item.product.name : 'Unknown product');
                const sku = item.sku || (item.product ? item.product.sku : '') || 'N/A';
                const quantity = item.quantity || 1;
                const price = item.price || 0;
                const totalPrice = price * quantity;
                subtotal += totalPrice;

                const productNameHeight = doc.fontSize(9).heightOfString(productName, { width: contentWidth * 0.3 - 12, lineGap });
                const itemHeight = productNameHeight + lineGap * 3.5;
                const rowNeededHeight = itemHeight + 4;
                if (addNewPageIfNeeded(rowNeededHeight)) {
                    // Draw table header again
                    const newTableHeaderY = currentY;
                    doc.rect(pageMargins.left, newTableHeaderY, contentWidth, 24).fill(darkGreyColor);
                    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
                    doc.text('Product', pageMargins.left + 12, newTableHeaderY + 8, { width: contentWidth * 0.3 - 12 })
                       .text('SKU', pageMargins.left + contentWidth * 0.3, newTableHeaderY + 8, { width: contentWidth * 0.15, align: 'left' })
                       .text('Quantity', pageMargins.left + contentWidth * 0.45, newTableHeaderY + 8, { width: contentWidth * 0.12, align: 'right' })
                       .text('Unit Price', pageMargins.left + contentWidth * 0.57, newTableHeaderY + 8, { width: contentWidth * 0.18, align: 'right' })
                       .text('Total Price', pageMargins.left + contentWidth * 0.75, newTableHeaderY + 8, { width: contentWidth * 0.25 - 12, align: 'right' });
                    currentY = newTableHeaderY + 26;
                    doc.font('Helvetica');
                }
                if (i % 2 !== 0) {
                     doc.rect(pageMargins.left, currentY, contentWidth, itemHeight).fill(greyColor);
                }
                const rowY = currentY + lineGap + 2;
                doc.fillColor(textColor).fontSize(9)
                   .text(productName, pageMargins.left + 12, rowY, { width: contentWidth * 0.3 - 12, lineGap })
                   .text(sku, pageMargins.left + contentWidth * 0.3, rowY, { width: contentWidth * 0.15, align: 'left' })
                   .text(quantity.toString(), pageMargins.left + contentWidth * 0.45, rowY, { width: contentWidth * 0.12, align: 'right' })
                   .text(formatCurrency(price), pageMargins.left + contentWidth * 0.57, rowY, { width: contentWidth * 0.18, align: 'right' })
                   .text(formatCurrency(totalPrice), pageMargins.left + contentWidth * 0.75, rowY, { width: contentWidth * 0.25 - 12, align: 'right' });
                currentY += itemHeight;
                i++;
            });

            // --- Order Summary & Payment Info (dư không gian, box lớn hơn) ---
            addNewPageIfNeeded(80);
            currentY += 14;
            const shippingFee = order.shippingFee || 0;
            const discount = order.discount || 0;
            const grandTotal = subtotal + shippingFee - discount;
            const summaryBoxWidth = 260;
            const summaryBoxX = pageMargins.left + contentWidth - summaryBoxWidth;
            const summaryBoxY = currentY;
            const summaryBoxHeight = 80;
            // Order Summary box (phải)
            doc.roundedRect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 12).fillAndStroke(primaryColor, primaryColor);
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11)
                .text('Subtotal:', summaryBoxX + 22, summaryBoxY + 14)
                .text(`${formatCurrency(subtotal)}`, summaryBoxX + 150, summaryBoxY + 14, { width: 90, align: 'right' })
                .text('Shipping Fee:', summaryBoxX + 22, summaryBoxY + 32)
                .text(`${formatCurrency(shippingFee)}`, summaryBoxX + 150, summaryBoxY + 32, { width: 90, align: 'right' })
                .text('Discount:', summaryBoxX + 22, summaryBoxY + 50)
                .text(`- ${formatCurrency(discount)}`, summaryBoxX + 150, summaryBoxY + 50, { width: 90, align: 'right' })
                .text('Grand Total:', summaryBoxX + 22, summaryBoxY + 68)
                .text(`${formatCurrency(grandTotal)}`, summaryBoxX + 150, summaryBoxY + 68, { width: 90, align: 'right' });
            // Payment Info box (trái, box lớn hơn)
            const paymentBoxX = pageMargins.left;
            const paymentBoxY = summaryBoxY;
            const paymentBoxWidth = summaryBoxX - pageMargins.left - 14 > 200 ? summaryBoxX - pageMargins.left - 14 : summaryBoxWidth;
            const paymentBoxHeight = 80;
            doc.roundedRect(paymentBoxX, paymentBoxY, paymentBoxWidth, paymentBoxHeight, 12).fillAndStroke(greyColor, darkGreyColor);
            doc.font('Helvetica-Bold').fontSize(11).fillColor(textColor).text('Payment Information', paymentBoxX + 18, paymentBoxY + 14, { underline: true });
            doc.font('Helvetica').fontSize(9).fillColor(lightTextColor);
            doc.text(`Method: ${order.paymentMethod || 'N/A'}`, paymentBoxX + 18, paymentBoxY + 32, { lineGap });
            doc.text(`Status: ${order.paymentStatus || 'N/A'}`, paymentBoxX + 18, paymentBoxY + 46, { lineGap });
            let notesSectionHeight = 0;
            if (order.notes && order.notes.trim() !== '') {
                doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor).text('Notes', paymentBoxX + 18, paymentBoxY + 62, { underline: true });
                doc.font('Helvetica').fontSize(9).fillColor(lightTextColor);
                doc.text(order.notes, paymentBoxX + 18, paymentBoxY + 76, { width: paymentBoxWidth - 36, lineGap });
                notesSectionHeight = 22;
            }
            currentY = summaryBoxY + summaryBoxHeight + notesSectionHeight + 16;
            doc.end();
            writeStream.on('finish', () => resolve(filePath));
        } catch (error) {
            reject(error);
        }
    });
};

// Validate product data using Lodash
const validateProduct = (product) => {
    try {
        // Kiểm tra product có phải object không và không phải null/array
        if (!_.isObject(product) || _.isNull(product) || _.isArray(product)) {
            console.error('Invalid product data (not an object):', product);
            return false;
        }

        // Kiểm tra các trường bắt buộc
        const requiredFields = ['title', 'price'];
        if (!_.every(requiredFields, (field) => _.has(product, field))) {
            const missing = _.difference(requiredFields, _.keys(product));
            console.error(`Missing required field(s): ${missing.join(', ')}`, product);
            return false;
        }

        // Kiểm tra kiểu dữ liệu
        if (!_.isString(product.title)) {
            console.error('Invalid title type:', product.title);
            return false;
        }
        // isFinite kiểm tra cả number và không phải Infinity/-Infinity
        if (!_.isFinite(product.price)) {
            console.error('Invalid price type or value:', product.price);
            return false;
        }
        // Kiểm tra giá không âm
        if (product.price < 0) {
            console.error('Invalid price value (negative):', product.price);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating product:', error);
        return false;
    }
};

// Format product data using Lodash
const formatProductData = (product) => {
    try {
        return {
            // _.get(object, path, [defaultValue])
            title: _.trim(_.get(product, 'title', 'No name')),
            category: _.trim(_.get(product, 'category', 'No category')),
            // _.toNumber chuyển đổi giá trị thành số, trả về 0 nếu không hợp lệ
            price: _.toNumber(_.get(product, 'price', 0)) || 0, 
            description: _.trim(_.get(product, 'description', 'No description'))
        };
    } catch (error) {
        console.error('Error formatting product data:', error);
        // Trả về giá trị mặc định an toàn
        return {
            title: 'No name', category: 'No category', price: 0, description: 'No description'
        };
    }
};

// Generate Product List PDF - Use Lodash for sum
const generateProductsPDF = async (products) => {
    return new Promise((resolve, reject) => {
        try {
            if (!_.isArray(products)) throw new Error('Products must be an array');
            
            // Sử dụng lodash để map và filter (tương tự nhưng có thể thay thế)
            const validProducts = _.chain(products)
                                    .filter(validateProduct)
                                    .map(formatProductData)
                                    .value(); // Kết thúc chain và lấy kết quả

            if (_.isEmpty(validProducts)) throw new Error('No valid products to export');

            // Sử dụng moment để định dạng ngày trong tên file
            const fileName = `products-catalog-${moment().format('YYYY-MM-DD')}.pdf`;
            const filePath = path.join(pdfDirPath, fileName);
            const doc = new PDFDocument({ 
                size: 'A4', margin: 50, font: 'Helvetica', bufferPages: true
            });

            const writeStream = fs.createWriteStream(filePath);
            writeStream.on('error', reject);
            doc.pipe(writeStream);

            // --- Variables & Colors ---
            const pageMargins = doc.page.margins;
            const startY = pageMargins.top;
            const contentWidth = doc.page.width - pageMargins.left - pageMargins.right;
            const endY = doc.page.height - pageMargins.bottom - 20;
            let currentY = startY;
            const primaryColor = '#2563EB';
            const greyColor = '#F3F4F6';
            const darkGreyColor = '#D1D5DB';
            const textColor = '#1F2937';
            const lightTextColor = '#6B7280';
            const rowHeight = 30;
            const headerHeight = 20;
            const pageNumber = 1;
            
            // --- Helper to draw table header ---
            const drawTableHeader = (yPos) => {
                doc.rect(pageMargins.left, yPos, contentWidth, headerHeight).fill(darkGreyColor);
                doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9);
                const textY = yPos + 7;
                doc.text('No.', pageMargins.left + 10, textY, { width: 30 });
                doc.text('Product Name', pageMargins.left + 50, textY, { width: 180 }); 
                doc.text('Category', pageMargins.left + 240, textY, { width: 80 });
                doc.text('Price', pageMargins.left + 330, textY, { width: 70, align: 'right' });
                doc.text('Description', pageMargins.left + 410, textY, { width: contentWidth - 410 - 10 });
                doc.font('Helvetica'); 
                return yPos + headerHeight + 5; 
            };

            // --- Title & Info ---
            doc.font('Helvetica-Bold').fontSize(18).fillColor(textColor)
               .text('Product Catalog', pageMargins.left, currentY, { align: 'center', width: contentWidth });
            currentY += 25;
            doc.font('Helvetica').fontSize(10).fillColor(lightTextColor)
               .text(`Generated on: ${formatDate(new Date(), 'MMMM Do, YYYY')}`, pageMargins.left, currentY, { align: 'right', width: contentWidth });
            currentY += 20;

            // --- Draw Table Header for first page ---
            currentY = drawTableHeader(currentY);

            // --- Table Body ---
            let i = 0;
            validProducts.forEach((product, index) => {
                 if (currentY + rowHeight > endY) {
                    doc.addPage();
                    currentY = startY;
                    currentY = drawTableHeader(currentY);
                }
                if (i % 2 !== 0) {
                     doc.rect(pageMargins.left, currentY, contentWidth, rowHeight).fill(greyColor);
                }
                const textY = currentY + (rowHeight - 10) / 2;
                doc.fillColor(textColor).fontSize(9);
                doc.text(index + 1, pageMargins.left + 10, textY, { width: 30 });
                doc.text(product.title, pageMargins.left + 50, textY, { width: 180, ellipsis: true }); 
                doc.text(product.category, pageMargins.left + 240, textY, { width: 80, ellipsis: true });
                doc.text(formatCurrency(product.price), pageMargins.left + 330, textY, { width: 70, align: 'right' });
                doc.text(product.description, pageMargins.left + 410, textY, { width: contentWidth - 410 - 10, ellipsis: true, lineBreak: false }); 
                currentY += rowHeight;
                i++;
            });

            // --- Total Summary - Use Lodash _.sumBy ---
            if (currentY + 50 > endY) { 
                doc.addPage();
                currentY = startY;
            }
            currentY += 20;
            // Sử dụng _.sumBy(collection, [iteratee=_.identity])
            const totalValue = _.sumBy(validProducts, 'price'); 
            
            const summaryBoxY = currentY;
            const summaryBoxHeight = 40;
            doc.rect(pageMargins.left, summaryBoxY, contentWidth, summaryBoxHeight).fill(darkGreyColor);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
            doc.text(`Total Products: ${validProducts.length}`, pageMargins.left + 15, summaryBoxY + 15)
               .text(`Total Value: ${formatCurrency(totalValue)}`, pageMargins.left + contentWidth / 2, summaryBoxY + 15, { width: contentWidth / 2 - 15, align: 'right' });
            currentY = summaryBoxY + summaryBoxHeight + 10;

            // --- Finalize PDF (như cũ) ---
            const range = doc.bufferedPageRange(); 
            for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex++) {
                doc.switchToPage(pageIndex);
                doc.fontSize(8).fillColor(lightTextColor)
                   .text(`Page ${pageIndex + 1} of ${range.count} | Generated: ${formatDate(new Date(), 'L LT')}`,
                         pageMargins.left, 
                         doc.page.height - pageMargins.bottom + 5, 
                         { align: 'center', width: contentWidth });
            }
            doc.flushPages(); 
            doc.end();

            writeStream.on('finish', () => {
                console.log('Products PDF write completed');
                resolve(filePath);
            });
        } catch (error) {
            console.error('Error generating products PDF:', error);
            reject(error);
        }
    });
};

module.exports = {
    generateOrderPDF,
    generateProductsPDF
};
