import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import busesRouter from "./buses";
import queueRouter from "./queue";
import notificationsRouter from "./notifications";
import campusRouter from "./campus";
import safetyRouter from "./safety";
import adminRouter from "./admin";
import aiRouter from "./ai";
import transportRouter from "./transport";
import publicTransportRouter from "./publicTransport";
import meRouter from "./me";
import mobilityRouter from "./mobility";
import mtcRouter from "./mtc";
import studentTransportRouter from "./studentTransport";
import mvpRouter from "./mvp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(busesRouter);
router.use(queueRouter);
router.use(notificationsRouter);
router.use(campusRouter);
router.use(safetyRouter);
router.use(adminRouter);
router.use(aiRouter);
router.use(transportRouter);
router.use(publicTransportRouter);
router.use(mobilityRouter);
router.use(mtcRouter);
router.use(studentTransportRouter);
router.use(mvpRouter);

export default router;
