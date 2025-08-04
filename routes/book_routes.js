import express from 'express';
import bookController from '../controllers/book_controller.js';
import verifyToken from '../middleware/verifyToken.js';
import checkAdminRole from '../middleware/checkAdminRole.js';
import { upload } from '../utils/multer.js';

const bookRoutes = express.Router();

// Routes yêu cầu xác thực và phân quyền Admin
bookRoutes.post('/', verifyToken, checkAdminRole, upload.array('images', 5), bookController.addBook);
bookRoutes.put('/:id', verifyToken, checkAdminRole, upload.array('images', 5), bookController.updateBook);
bookRoutes.delete('/:id', verifyToken, checkAdminRole, bookController.deleteBook);
bookRoutes.put('/:id/stock', verifyToken, bookController.updateBookStock);
bookRoutes.put('/:id/stock/cron', bookController.updateBookStock); // Route cho cronjob không cần xác thực
bookRoutes.put('/:id/sales', bookController.updateBookSales);

// Routes không yêu cầu xác thực (hoặc xác thực tùy chọn)
bookRoutes.get('/', bookController.getAllBooks);
bookRoutes.get('/multiple', bookController.getBooksByIds); // Phải đặt trước /:id



bookRoutes.get('/:id', bookController.getBookById);

// Route khôi phục sách đã xóa mềm
bookRoutes.put('/:id/restore', verifyToken, checkAdminRole, bookController.restoreBook);

export default bookRoutes;