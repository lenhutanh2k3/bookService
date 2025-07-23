import Book from '../models/book_model.js';
import response from '../utils/response.js';

const rating_controller = {
    // Cập nhật rating trung bình của sách
    updateBookRating: async (req, res, next) => {
        try {
            const { bookId } = req.params;
            const { reviewId, rating, action } = req.body;

            if (!reviewId || !rating || !action) {
                let err = new Error('Thiếu thông tin bắt buộc');
                err.statusCode = 400;
                throw err;
            }

            if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
                let err = new Error('Rating không hợp lệ');
                err.statusCode = 400;
                throw err;
            }

            const book = await Book.findById(bookId);
            if (!book) {
                let err = new Error('Sách không tồn tại');
                err.statusCode = 404;
                throw err;
            }

            let newTotalReviews = book.totalReviews;
            let newAverageRating = book.averageRating;
            const newRatingDistribution = { ...book.ratingDistribution };

            switch (action) {
                case 'add':
                    // Thêm đánh giá mới
                    newTotalReviews += 1;
                    newRatingDistribution[rating] += 1;
                    break;
                case 'update': {
                    // Cập nhật đánh giá (có thể đổi số sao)
                    // Lấy review cũ từ DB để biết rating cũ
                    const Review = (await import('../models/review_model.js')).default;
                    const oldReview = await Review.findById(reviewId);
                    if (oldReview && oldReview.rating !== rating) {
                        // Trừ 1 ở rating cũ, cộng 1 ở rating mới
                        if (newRatingDistribution[oldReview.rating] > 0) {
                            newRatingDistribution[oldReview.rating] -= 1;
                        }
                        newRatingDistribution[rating] += 1;
                    }
                    // Không thay đổi totalReviews
                    break;
                }
                case 'remove':
                    // Xóa đánh giá
                    if (newTotalReviews > 0) {
                        newTotalReviews -= 1;
                        if (newRatingDistribution[rating] > 0) {
                            newRatingDistribution[rating] -= 1;
                        }
                    }
                    break;
                default:
                    let err = new Error('Action không hợp lệ');
                    err.statusCode = 400;
                    throw err;
            }

            // Tính toán rating trung bình mới
            if (newTotalReviews > 0) {
                const totalRating = Object.keys(newRatingDistribution).reduce((sum, key) => {
                    return sum + (parseInt(key) * newRatingDistribution[key]);
                }, 0);
                newAverageRating = totalRating / newTotalReviews;
            } else {
                newAverageRating = 0;
            }

            // Cập nhật sách
            const updatedBook = await Book.findByIdAndUpdate(
                bookId,
                {
                    averageRating: Math.round(newAverageRating * 10) / 10, // Làm tròn đến 1 chữ số thập phân
                    totalReviews: newTotalReviews,
                    ratingDistribution: newRatingDistribution
                },
                { new: true, runValidators: true }
            );

            return response(res, 200, 'Cập nhật rating thành công', {
                book: {
                    _id: updatedBook._id,
                    title: updatedBook.title,
                    averageRating: updatedBook.averageRating,
                    totalReviews: updatedBook.totalReviews,
                    ratingDistribution: updatedBook.ratingDistribution
                }
            });

        } catch (error) {
            next(error);
        }
    },

    // Lấy thống kê rating của sách
    getBookRatingStats: async (req, res, next) => {
        try {
            const { bookId } = req.params;

            const book = await Book.findById(bookId).select('averageRating totalReviews ratingDistribution title');
            if (!book) {
                let err = new Error('Sách không tồn tại');
                err.statusCode = 404;
                throw err;
            }

            return response(res, 200, 'Lấy thống kê rating thành công', {
                ratingStats: {
                    bookId: book._id,
                    title: book.title,
                    averageRating: book.averageRating,
                    totalReviews: book.totalReviews,
                    ratingDistribution: book.ratingDistribution
                }
            });

        } catch (error) {
            next(error);
        }
    }
};

export default rating_controller; 