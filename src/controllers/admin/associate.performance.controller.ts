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
import { ObjectId } from "mongodb";
import mongoose from "mongoose";

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
        const applied: any = this.applyCarryForward(member, totals);

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

        // TRAININGS ATTENDED (Present Only)
        // ATTENDANCE - ONLY FOR TRAINING MEETINGS (16th→15th month logic respected)
        const trainingData = await Attendance.aggregate([
            {
                $match: {
                    memberId: new ObjectId(memberId),
                    status: "present",
                    isDelete: 0
                }
            },
            {
                $lookup: {
                    from: "payments",
                    localField: "meetingId",
                    foreignField: "_id",
                    as: "payment"
                }
            },
            { $unwind: "$payment" },

            // Filter to only TRAINING sessions
            {
                $addFields: {
                    purpose: { $toLower: "$payment.purpose" },
                    sessionDate: "$payment.startDate"
                }
            },
            {
                $match: {
                    purpose: "training",
                    sessionDate: { $gte: start, $lte: end }
                }
            },
            { $count: "trainingDays" }
        ]);

        const attendanceData = await Attendance.aggregate([
            {
                $match: {
                    memberId: new ObjectId(memberId),
                    status: "present",
                    isDelete: 0
                }
            },
            {
                $lookup: {
                    from: "payments",
                    localField: "meetingId",
                    foreignField: "_id",
                    as: "payment"
                }
            },
            { $unwind: "$payment" },

            // Normalize purpose + extract date from payment
            {
                $addFields: {
                    purpose: { $toLower: "$payment.purpose" },
                    sessionDate: "$payment.startDate" // session happening date
                }
            },

            // Only meetings — NOT training, NOT others
            {
                $match: {
                    purpose: "meeting",
                    sessionDate: { $gte: start, $lte: end }  // your 16th→15th logic
                }
            },

            { $count: "attendanceDays" }
        ]);

        const trainingDays =
            trainingData?.length > 0 ? trainingData[0].trainingDays : 0;

        const attendanceDays = attendanceData?.[0]?.attendanceDays ?? 0;



        // FINAL RETURN OBJECT
        return {
            oneToOne: await OneToOne.countDocuments({ fromMember: memberId, createdAt: { $gte: start, $lte: end } }),
            referrals: await ReferralSlipModel.countDocuments({ fromMember: memberId, createdAt: { $gte: start, $lte: end } }),
            visitors: await Visitor.countDocuments({ invitedBy: memberId, createdAt: { $gte: start, $lte: end } }),
            trainings: trainingDays,                   //  <-- Final Correct Value ✔
            business: await thankyouslipModel.aggregate([
                { $match: { fromMember: new mongoose.Types.ObjectId(memberId), createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]).then(r => r[0]?.total || 0),
            testimonials: await TestimonialSlip.countDocuments({ fromMember: memberId, createdAt: { $gte: start, $lte: end } }),
            attendanceDays: attendanceDays,
        };
    }

    /** Apply carry-forward and calculate points */
    private applyCarryForward(member: any, totals: Record<string, any>) {

        const finalScore: Record<string, number> = {
            oneToOne: 0, referrals: 0, visitors: 0,
            trainings: 0, business: 0, testimonials: 0,
            attendance: 0
        };

        const monthlyScore: Record<string, any> = {};

        Object.keys(totals).forEach(month => {
            const m = totals[month];

            function calculateScore(count: number, minimum: number, maxPoints: number) {
                if (count >= minimum) return maxPoints;       // full points
                return Number(((count / minimum) * maxPoints).toFixed(2)); // proportional
            }

            monthlyScore[month] = {
                oneToOne: calculateScore(m.oneToOne, MINIMUMS.oneToOnePerMonth, MAX_POINTS.oneToOne),
                referrals: calculateScore(m.referrals, MINIMUMS.referralsPerMonth, MAX_POINTS.referrals),
                visitors: calculateScore(m.visitors, MINIMUMS.visitorsPerMonth, MAX_POINTS.visitors),
                trainings: calculateScore(m.trainings, MINIMUMS.trainingsPerMonth, MAX_POINTS.trainings),
                business: calculateScore(m.business, MINIMUMS.businessPerMonth, MAX_POINTS.business),
                testimonials: calculateScore(m.testimonials, MINIMUMS.testimonialsPerMonth, MAX_POINTS.testimonials),
                attendance: calculateScore(m.attendanceDays, MINIMUMS.attendancePerMonth, MAX_POINTS.attendance),
            };

            // overwrite business with capped rule
            monthlyScore[month].business =
                m.business >= MINIMUMS.businessPerMonth ? MAX_POINTS.business : monthlyScore[month].business;

            // Add to final total score
            Object.keys(monthlyScore[month]).forEach(key => {
                finalScore[key] += monthlyScore[month][key];
            });
        });

        return { score: finalScore, monthlyScore };
    }


}
