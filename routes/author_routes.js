import express from 'express';
import authorController from '../controllers/author_controller.js';
import verifyToken from '../middleware/verifyToken.js';
import checkAdminRole from '../middleware/checkAdminRole.js';

const router = express.Router();

router.post('/', verifyToken, checkAdminRole, authorController.addAuthor);
router.get('/', authorController.getAllAuthors);
router.get('/:id', authorController.getAuthorById);
router.put('/:id', verifyToken, checkAdminRole, authorController.updateAuthor);
router.delete('/:id', verifyToken, checkAdminRole, authorController.deleteAuthor);

export default router;
