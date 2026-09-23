import { Router, type IRouter } from "express";
import healthRouter from "./health";
import busesRouter from "./buses";
import queueRouter from "./queue";
import notificationsRouter from "./notifications";
import campusRouter from "./campus";
import safetyRouter from "./safety";
import adminRouter from "./admin";
import aiRouter from "./ai";
import transportRouter from "./transport";

const router: IRouter = Router();

router.use(healthRouter);
router.use(busesRouter);
router.use(queueRouter);
router.use(notificationsRouter);
router.use(campusRouter);
router.use(safetyRouter);
router.use(adminRouter);
router.use(aiRouter);
router.use(transportRouter);

export default router;
