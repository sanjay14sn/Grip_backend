import cron from "node-cron";
import { IMember, Member } from "../models/member.model";
import Period from "../models/period.model";
import mongoose from "mongoose";

/**
 * 🔄 Auto reset + period rollover with NEW SCHEMA
 */
async function rolloverPeriod(member: IMember) {
    const period = await Period.findOne({
        _id: member.activePeriodId,
        isClosed: false
    });

    const now = new Date();
    if (!period || now <= period.endDate) return;

    console.log(`🔄 Period ending for member ${member._id}`);

    // 1️⃣ Move last period metrics → Member.carryForward
    member.carryForward = { ...period.metrics };
    await member.save();

    // 2️⃣ Close old period
    period.isClosed = true;
    await period.save();

    // 3️⃣ Create new fresh period
    const start = new Date(period.endDate);
    start.setDate(start.getDate() + 1);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 6);
    end.setDate(end.getDate() - 1);

    const newPeriod = await Period.create({
        memberId: member._id,
        startDate: start,
        endDate: end,
        metrics: {
            oneToOne: 0,
            referrals: 0,
            visitors: 0,
            trainings: 0,
            business: 0,
            testimonials: 0
        }
    });

    // 4️⃣ Assign new activePeriod
    member.activePeriodId = newPeriod._id as  mongoose.Types.ObjectId;
    await member.save();

    console.log(`✨ New active period started for ${member._id}`);
}

/**
 * Cron runs everyday midnight
 */
cron.schedule("0 0 * * *", async () => {
    console.log("⏳ Checking for expired periods...");

    const members = await Member.find({ isActive: 1, isDelete: 0, status: "active" });

    for (const member of members) {
        await rolloverPeriod(member);
    }

    console.log("✅ Period rollover complete");
});
