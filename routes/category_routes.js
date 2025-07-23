import express from 'express';
import categoryController from '../controllers/category_controller.js';
import verifyToken from '../middleware/verifyToken.js';
import checkAdminRole from '../middleware/checkAdminRole.js';

const router = express.Router();

router.post('/', verifyToken, checkAdminRole, categoryController.addCategory);
router.get('/', categoryController.getAllCategoriesByIdsOrAll);
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', verifyToken, checkAdminRole, categoryController.updateCategory);
router.delete('/:id', verifyToken, checkAdminRole, categoryController.deleteCategory);

export default router;