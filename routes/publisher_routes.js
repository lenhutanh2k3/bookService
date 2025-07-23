import express from 'express';
import publisherController from '../controllers/publisher_controller.js';
import verifyToken from '../middleware/verifyToken.js';
import checkAdminRole from '../middleware/checkAdminRole.js';

const router = express.Router();

router.post('/', verifyToken, checkAdminRole, publisherController.addPublisher);
router.get('/', publisherController.getAllPublishers);
router.get('/:id', publisherController.getPublisherById);
router.put('/:id', verifyToken, checkAdminRole, publisherController.updatePublisher);
router.delete('/:id', verifyToken, checkAdminRole, publisherController.deletePublisher);

export default router;
