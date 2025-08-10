import { Router } from 'express';
import { 
  getAllIssues,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
  addComment,
  getIssueComments,
  getIssuesSummary
} from '../controllers/issuesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All issue routes require authentication
router.use(authenticateToken);

router.get('/', getAllIssues);
router.get('/summary', getIssuesSummary);
router.get('/:id', getIssueById);
router.post('/', createIssue);
router.put('/:id', updateIssue);
router.delete('/:id', deleteIssue);
router.get('/:id/comments', getIssueComments);
router.post('/:id/comments', addComment);

export default router;