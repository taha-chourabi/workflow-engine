const express = require('express');
const { protect } = require('../middleware/auth');
const { createRequest, submitRequest, updateDraftRequest, getRequests, getRequestById, takeAction, deleteRequest, uploadAttachment } = require('../controllers/requestController');
const upload = require('../middleware/upload');
const router = express.Router();

router.use(protect);
router.route('/').get(getRequests).post(createRequest);
router.post('/:id/submit', submitRequest);
router.put('/:id/draft', updateDraftRequest);
router.get('/:id', getRequestById);
router.post('/:id/action', takeAction);
router.delete('/:id', deleteRequest);
router.post('/upload', upload.single('file'), uploadAttachment);
router.post('/:id/upload', upload.single('file'), uploadAttachment);

module.exports = router;