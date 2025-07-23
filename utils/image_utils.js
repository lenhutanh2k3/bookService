import fs from 'fs/promises';
import path from 'path';


export const deletePhysicalImages = async (images) => {
    if (!images || images.length === 0) {
        return;
    }

    const errors = [];
    const deletePromises = images.map(async (img) => {
        if (img && img.path) {

            const fullPath = path.join(process.cwd(), 'public', img.path);
            try {

                await fs.access(fullPath); // Sẽ ném lỗi nếu file không tồn tại
                await fs.unlink(fullPath); // Xóa file
            } catch (unlinkError) {
                // Chỉ log lỗi nếu file thực sự tồn tại và có lỗi khác ngoài "file not found" (ENOENT)
                if (unlinkError.code !== 'ENOENT') {
                    errors.push(`Lỗi khi xóa file ảnh ${fullPath}: ${unlinkError.message}`);
                }
                // Nếu lỗi là ENOENT (file không tồn tại), chúng ta bỏ qua vì mục tiêu là đảm bảo nó không còn
            }
        }
    });

    await Promise.all(deletePromises);

    if (errors.length > 0) {
        // Nếu có lỗi trong quá trình xóa, ném ra AppError
        let err = new Error(`Lỗi khi xóa một số file ảnh: ${errors.join(', ')}`);
        err.statusCode = 500;
        throw err;
    }
};
