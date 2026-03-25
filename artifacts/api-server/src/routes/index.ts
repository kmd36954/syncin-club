import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import emailAuthRouter from "./email-auth";
import otpRouter from "./otp";
import ridesRouter from "./rides";
import profileRouter from "./profile";
import interestsRouter from "./interests";
import journeyRequestsRouter from "./journey-requests";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(emailAuthRouter);
router.use(otpRouter);
router.use(ridesRouter);
router.use(profileRouter);
router.use(interestsRouter);
router.use(journeyRequestsRouter);
router.use(adminRouter);

export default router;
