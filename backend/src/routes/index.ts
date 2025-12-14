import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as accountController from '../controllers/account.controller';
import * as balanceController from '../controllers/balance.controller';
import * as initController from '../controllers/init.controller';
import * as currencyRateController from '../controllers/currencyRate.controller';
import * as dashboardController from '../controllers/dashboard.controller';
import * as planScenarioController from '../controllers/planScenario.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/profile', authMiddleware, authController.profile);
router.put('/auth/settings', authMiddleware, authController.updateSettings);

router.post('/init', initController.init);

router.get('/accounts', authMiddleware, accountController.list);
router.post('/accounts', authMiddleware, accountController.create);
router.put('/accounts/:accountId', authMiddleware, accountController.update);
router.delete('/accounts/:accountId', authMiddleware, accountController.remove);

router.get('/balances', authMiddleware, balanceController.list);
router.post('/balances/batch', authMiddleware, balanceController.batch);
router.get('/balances/months', authMiddleware, balanceController.periods);
router.post('/balances/close', authMiddleware, balanceController.close);

router.get('/currency-rates', authMiddleware, currencyRateController.list);
router.get('/dashboard/series', authMiddleware, dashboardController.series);

router.get('/plan-scenarios', authMiddleware, planScenarioController.list);
router.post('/plan-scenarios', authMiddleware, planScenarioController.create);
router.put('/plan-scenarios/:planScenarioId', authMiddleware, planScenarioController.update);
router.delete('/plan-scenarios/:planScenarioId', authMiddleware, planScenarioController.remove);

export default router;
