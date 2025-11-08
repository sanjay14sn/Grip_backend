import cron from 'node-cron';
import { Attendance } from '../models/attendance.model';
import { Member } from '../models/member.model';
import Payment from '../models/payment.model';

cron.schedule('*/5 * * * *', async () => {
    console.log('Running absent marking cron job...');
    try {
        console.log('✅ Absent cron job is running at', new Date().toLocaleString());
        const now = new Date();

        // Find meetings that ended more than 1 hour ago and haven't been marked yet
        const cutoff = new Date(now.getTime() - 60 * 60 * 1000);

        const meetings = await Payment.find({
            endDate: { $lte: cutoff },
            isActive: 1,
            isDelete: 0,
        });

        for (const meeting of meetings) {
            const chapterIds = meeting.chapterId.map((id: any) => id.toString());

            // Get members in the chapters associated with the meeting
            const members = await Member.find({
                'chapterInfo.chapterId': { $in: chapterIds },
                isDelete: 0,
                isActive: 1
            });

            for (const member of members) {
                const existingAttendance = await Attendance.findOne({
                    memberId: member._id,
                    meetingId: meeting._id,
                    isDelete: 0
                });

                // If no attendance exists, mark as absent
                if (!existingAttendance) {
                    await Attendance.create({
                        meetingId: meeting._id,
                        memberId: member._id,
                        status: 'absent',
                        // createdBy: 'cron-job',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isDelete: 0,
                        isActive: 1
                    });
                    console.log(`Absent marked for member ${member._id} in meeting ${meeting._id}`);
                }
            }
        }
    } catch (error) {
        console.error('Error in absent marking cron job:', error);
    }
});
