import {
  JsonController,
  Post,
  Body,
  Req,
  Res,
  UseBefore,
} from "routing-controllers";

import { Request, Response } from "express";
import { SendReferralStatusMailDto } from "../../dto/send-referral-status.dto";
import { ReferralStatusLog } from "../../models/referral-status-log.model";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { Member } from "../../models/member.model";
import nodemailer from "nodemailer";

@JsonController("/api/mobile/referrals")
@UseBefore(AuthMiddleware)
export default class ReferralStatusController {
  @Post("/send-status-mail")
  async sendStatusMail(
    @Body({ validate: true }) body: SendReferralStatusMailDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const { status, toMember, fromMember, referralDetail } = body;

      // ⛔ From member must exist in DB to fetch email
      const fromMemberRecord = await Member.findOne({
        "personalDetails.firstName": fromMember.firstName,
        "personalDetails.lastName": fromMember.lastName,
      });

      if (!fromMemberRecord) {
        return res.status(404).json({
          success: false,
          message: "FromMember email not found",
        });
      }

      const receiverEmail = fromMemberRecord.contactDetails.email;

      if (!receiverEmail) {
        return res.status(400).json({
          success: false,
          message: "FromMember email missing in DB",
        });
      }

      // Build names
      const toFullName = `${toMember.firstName} ${toMember.lastName}`;
      const fromFullName = `${fromMember.firstName} ${fromMember.lastName}`;

      // Email Message
      const mailMessage = `
Hello ${fromFullName},

This is an update regarding the referral you provided to ${toFullName}.

Updated Status:
------------------------------------------------
${status}

Referral Details:
------------------------------------------------
Name       : ${referralDetail.name}
Phone      : ${referralDetail.mobileNumber}
Address    : ${referralDetail.address}
Comments   : ${referralDetail.comments}

Thank you for your continued support!

Regards,  
GripForum System
`;

      // Nodemailer Transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "gripbusinessforum@gmail.com",
          pass: process.env.MAIL_PASSWORD,
        },
      });

      // Send mail
      await transporter.sendMail({
        from: `"Grip Forum" <gripbusinessforum@gmail.com>`,
        to: receiverEmail,
        subject: `Referral Status Update - ${status}`,
        text: mailMessage,
      });

      // 6️⃣ Save email log
      await ReferralStatusLog.create({
        referralId: body.referralId,
        status: body.status,
        toMember: body.toMember,
        fromMember: body.fromMember,
        referralDetail: body.referralDetail,
        createdAt: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Status mail sent successfully",
      });
    } catch (error) {
      console.error("STATUS MAIL ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send mail",
      });
    }
  }
}
