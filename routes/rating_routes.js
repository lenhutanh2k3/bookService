import express from 'express';
import rating_controller from '../controllers/rating_controller.js';

const router = express.Router();

// Cập nhật rating trung bình của sách (được gọi từ userService)
router.post('/:bookId/update-rating', rating_controller.updateBookRating);

// Lấy thống kê rating của sách (public)
router.get('/:bookId/stats', rating_controller.getBookRatingStats);

export default router; 