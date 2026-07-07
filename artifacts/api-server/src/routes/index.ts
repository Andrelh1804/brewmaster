import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import recipesRouter from "./recipes";
import productionsRouter from "./productions";
import equipmentRouter from "./equipment";
import sensorsRouter from "./sensors";
import actuatorsRouter from "./actuators";
import alarmsRouter from "./alarms";
import historyRouter from "./history";
import reportsRouter from "./reports";
import usersRouter from "./users";
import aiRouter from "./ai";
import simulatorRouter from "./simulator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(recipesRouter);
router.use(productionsRouter);
router.use(equipmentRouter);
router.use(sensorsRouter);
router.use(actuatorsRouter);
router.use(alarmsRouter);
router.use(historyRouter);
router.use(reportsRouter);
router.use(usersRouter);
router.use(aiRouter);
router.use(simulatorRouter);

export default router;
