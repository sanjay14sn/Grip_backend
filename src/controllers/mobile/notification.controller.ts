import {
  JsonController,
  Get,
  Put,
  Param,
  Res,
  Req,
  UseBefore,
  QueryParams,
  NotFoundError,
  InternalServerError,
} from "routing-controllers";
import { Request, Response } from "express";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { Notification, INotification } from "../../models/notification.model";
import { FilterQuery } from "mongoose";
import { ListNotificationDto } from "../../dto/list-notification.dto";
import { SocketService } from "../../services/socket.service";
import PushNotificationService from "../../services/PushNotificationService";
import { Member } from "../../models/member.model";

@JsonController("/api/mobile/notifications")
@UseBefore(AuthMiddleware)
export default class NotificationController {
  @Get("/list")
  async listNotifications(
    @QueryParams() queryParams: ListNotificationDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const page = queryParams.page || 1;
    const limit = queryParams.limit || 100;
    const { filter } = queryParams;
    const skip = (page - 1) * limit;
    const currentUserId = (req as any).user.id;

    const query: FilterQuery<INotification> = {
      toMember: currentUserId,
      isDelete: 0,
    };
    if (filter === "read") {
      query.isRead = true;
    } else if (filter === "unread") {
      query.isRead = false;
    }

    try {
      const [records, total] = await Promise.all([
        Notification.find(query)
          .populate({
            path: "fromMember",
            select: "personalDetails.firstName personalDetails.lastName personalDetails.profileImage"
          })
          .populate({
            path: "relatedId",
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        message: "Notifications fetched successfully",
        data: records,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch notifications");
    }
  }

  @Get("/unread-count")
  async getUnreadCount(@Req() req: Request, @Res() res: Response) {
    const currentUserId = (req as any).user.id;
    try {
      const count = await Notification.countDocuments({
        toMember: currentUserId,
        isRead: false,
        isDelete: 0,
      });
      return res.status(200).json({
        success: true,
        message: "Unread count fetched successfully",
        data: { count },
      });
    } catch (error) {
      throw new InternalServerError(
        "Failed to fetch unread notification count"
      );
    }
  }

  @Put("/:id/read")
  async markAsRead(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const currentUserId = (req as any).user.id;
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: id, toMember: currentUserId },
        { isRead: true, updatedAt: new Date() },
        { new: true }
      );

      if (!notification) {
        throw new NotFoundError(
          "Notification not found or you do not have permission to update it."
        );
      }

      return res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError("Failed to mark notification as read");
    }
  }

  @Put("/read-all")
  async markAllAsRead(@Req() req: Request, @Res() res: Response) {
    const currentUserId = (req as any).user.id;
    try {
      await Notification.updateMany(
        { toMember: currentUserId, isRead: false },
        { isRead: true, updatedAt: new Date() }
      );

      return res
        .status(200)
        .json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      throw new InternalServerError("Failed to mark all notifications as read");
    }
  }

  static async createNotification(
    type: INotification['type'],
    toMember: string,
    fromMember: string,
    relatedId: any,
    refPath: INotification['refPath']
  ) {
    try {
      const notification = new Notification({
        type,
        toMember,
        fromMember,
        relatedId,
        refPath,
      });
      await notification.save();

      // Fetch latest notifications for the user
      const notifications = await Notification.find({
        toMember: toMember,
        isDelete: 0,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Emit socket event
      SocketService.emitToMember(
        toMember.toString(),
        'notifications:update',
        notifications
      );

      const toMemberDoc = await Member.findById(toMember).lean();
      if (toMemberDoc && toMemberDoc.fcmToken) {
        const fromMemberDoc = await Member.findById(fromMember).lean();
        const fromMemberName = fromMemberDoc ? `${fromMemberDoc.personalDetails.firstName} ${fromMemberDoc.personalDetails.lastName}` : 'Someone';
        await PushNotificationService.sendPushNotification(
          toMemberDoc.fcmToken,
          'New Notification',
          `${fromMemberName} sent you a ${type} slip.`
        );
      }
    } catch (error) {
      console.error('Failed to create notification and send update:', error);
    }
  }
}
