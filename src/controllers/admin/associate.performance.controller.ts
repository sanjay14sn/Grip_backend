import {
    JsonController, Post, Body, Res, UseBefore
} from "routing-controllers";
import { Response } from "express";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";

// Models
import { Member } from "../../models/member.model";
import PeriodModel from "../../models/period.model";
import { OneToOne } from "../../models/onetoone.model";
import { ReferralSlipModel } from "../../models/referralslip.model";
import { Visitor } from "../../models/visitor.model";
import Payment from "../../models/payment.model";
import { TestimonialSlip } from "../../models/testimonialslip.model";
import { Attendance } from "../../models/attendance.model";
import thankyouslipModel from "../../models/thankyouslip.model";

// Constants
import { MINIMUMS, MAX_POINTS } from "../../services/constants";

type Key = "oneToOne" | "referrals" | "visitors";

@JsonController("/api/admin/period-report")
@UseBefore(AuthMiddleware)
export default class PeriodReportController {

    @Post("/run")
    async runReport(
        @Body() body: { memberIds: string[], page: number, limit: number },
        @Res() res: Response
    ) {
        try {
            const { memberIds, page = 1, limit = 10 } = body;
            const sliceStart = (page - 1) * limit;
            const ids = memberIds.slice(sliceStart, sliceStart + limit);

            const results = [];
            for (const id of ids) {
                results.push(await this.processMember(id));
            }

            return res.json({
                success: true,
                data: results,
                total: memberIds.length,
                page,
                totalPages: Math.ceil(memberIds.length / limit)
            });

        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    private async processMember(memberId: string) {
        const member = await Member.findById(memberId);
        if (!member) throw new Error("Member not found");

        let period: any = await PeriodModel.findOne({ memberId, isClosed: false });
        if (!period) period = await this.createInitialPeriod(member);

        // 1️⃣ Compute last 6 months + current month periods based on Nov16–Dec15 logic
        const monthPeriods = this.getLast6MonthsPeriods();

        // 2️⃣ Fetch counts month-wise
        const totals: Record<string, any> = {};
        for (const { start, end, key } of monthPeriods) {
            totals[key] = await this.fetchCounts(memberId, start, end);
        }

        // 3️⃣ Apply carry-forward / 6-month reset (from join date) + calculate points
        const applied = this.applyCarryForward(member, totals);

        // 4️⃣ Update period
        period.metrics = totals;
        period.carryForwardUsed = applied.used;
        await period.save();

        return {
            memberId,
            memberName: member.personalDetails.firstName,
            period,
            totals,
            score: applied.score,
            monthlyScore: applied.monthlyScore, // ✅ Add this
            cfRemaining: applied.cfRemaining
        };
    }

    private async createInitialPeriod(member: any) {
        const start = new Date(member.createdAt);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 6); // 6-month window
        const p = await PeriodModel.create({
            memberId: member._id,
            startDate: start,
            endDate: end,
            halfCount: 0,
            carryForward: {}
        });

        member.activePeriodId = p._id;
        await member.save();
        return p;
    }

    /** Returns last 6 months + current month periods based on Nov16–Dec15 half-month logic */
    private getLast6MonthsPeriods() {
        const today = new Date();
        const periods: { start: Date, end: Date, key: string }[] = [];

        for (let i = 6; i >= 0; i--) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            let start: Date, end: Date;

            // Half-month logic: 16th–15th
            start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 16);
            end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 15);

            // Month key in YYYY-MM format
            const key = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
            periods.push({ start, end, key });
        }

        return periods;
    }

    /** Fetch counts for given member and period */
    private async fetchCounts(memberId: string, start: Date, end: Date) {
        return {
            oneToOne: await OneToOne.countDocuments({ fromMember: memberId, createdAt: { $gte: start, $lte: end } }),
            referrals: await ReferralSlipModel.countDocuments({ fromMember: memberId, createdAt: { $gte: start, $lte: end } }),
            visitors: await Visitor.countDocuments({ invitedBy: memberId, createdAt: { $gte: start, $lte: end } }),
            trainings: await Payment.countDocuments({ memberId, date: { $gte: start, $lte: end } }),
            business: await thankyouslipModel.aggregate([
                { $match: { fromMember: memberId, createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]).then(r => r[0]?.total || 0),
            testimonials: await TestimonialSlip.countDocuments({ fromMember: memberId, createdAt: { $gte: start, $lte: end } }),
            attendanceDays: await Attendance.countDocuments({ memberId, isPresent: true, date: { $gte: start, $lte: end } }),
            onTimeDays: await Attendance.countDocuments({ memberId, onTime: true, date: { $gte: start, $lte: end } })
        };
    }

    /** Apply carry-forward and calculate points */
    private applyCarryForward(member: any, totals: Record<string, Record<Key, number>>) {
        let cf: Record<Key, number> = member.carryForward || { oneToOne: 0, referrals: 0, visitors: 0 };
        const used: Record<Key, number> = { oneToOne: 0, referrals: 0, visitors: 0 };

        const months = Object.keys(totals);
        const score: Record<Key, number> = { oneToOne: 0, referrals: 0, visitors: 0 };
        const monthlyScore: Record<string, Record<Key, number>> = {};

        months.forEach(month => {
            monthlyScore[month] = { oneToOne: 0, referrals: 0, visitors: 0 };

            (["oneToOne", "referrals", "visitors"] as Key[]).forEach(key => {
                const min = MINIMUMS[`${key}PerMonth` as keyof typeof MINIMUMS];
                const maxPoint = MAX_POINTS[key];

                // Carry-forward adjustment
                if (totals[month][key] < min) {
                    const need = min - totals[month][key];
                    const take = Math.min(cf[key] || 0, need);
                    totals[month][key] += take;
                    used[key] += take;
                    cf[key] -= take;
                }

                // Monthly points calculation
                const actualCount = totals[month][key];
                let monthlyPoints = 0;
                if (actualCount >= min) monthlyPoints = maxPoint;
                else monthlyPoints = (actualCount / min) * maxPoint;

                monthlyScore[month][key] = monthlyPoints;
                score[key] += monthlyPoints;
            });
        });

        // Reset CF every 6 months from join date
        const monthsSinceJoin = Math.floor(
            (new Date().getTime() - new Date(member.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        if (monthsSinceJoin >= 6) cf = { oneToOne: 0, referrals: 0, visitors: 0 };

        member.carryForward = cf;
        member.periodHalfCount = monthsSinceJoin % 6;
        member.save();

        return { used, score, cfRemaining: cf, monthlyScore };
    }





}
