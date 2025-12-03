import mongoose, { Document, ObjectId, Schema, Types, model } from "mongoose";
import bcrypt from "bcrypt";

/**
 * Interface: Business Reference
 */
interface IBusinessReference {
  firstName: string;
  lastName: string;
  businessName: string;
  phoneNumber: string;
  relationship: string;
  contactSharingGRIP: boolean;
  contactSharingGRIPReferences: boolean;
}

/**
 * Interface: Terms & Certifications
 */
interface ITermsAndCertifications {
  willAttendMeetingsOnTime: boolean;
  willBringVisitors: boolean;
  willDisplayPositiveAttitude: boolean;
  understandsContributorsWin: boolean;
  willAbideByPolicies: boolean;
  willContributeBestAbility: boolean;
}

/**
 * Interface: Member (Main)
 */
export interface IMember extends Document {
  pin: string;
  fcmToken?: string;

  chapterInfo: {
    countryName: string;
    stateName: string;
    zoneId: Schema.Types.ObjectId;
    chapterId: Schema.Types.ObjectId;
    CIDId: Schema.Types.ObjectId[];
    whoInvitedYou?: string;
    howDidYouHearAboutGRIP?: string;
  };

  personalDetails: {
    profileImage?: {
      docName: string;
      docPath: string;
      originalName: string;
    };
    firstName: string;
    lastName: string;
    companyName: string;
    industry?: string;
    categoryRepresented?: string;
    dob?: Date;
    renewalDate?: Date;
    previouslyGRIPMember?: boolean;
    otherNetworkingOrgs?: string;
    isOtherNetworkingOrgs?: boolean;
    education?: string;
    pins?: mongoose.Types.ObjectId[];
  };

  businessAddress: {
    addressLine1?: string;
    addressLine2?: string;
    state?: string;
    city?: string;
    postalCode?: string;
  };

  contactDetails: {
    email: string;
    mobileNumber: string;
    secondaryPhone?: string;
    website?: string;
    gstNumber?: string;
  };

  businessDetails: {
    businessDescription?: string;
    yearsInBusiness?: string;
  };

  businessReferences: IBusinessReference[];

  termsAndCertifications: ITermsAndCertifications;

  role?: Types.ObjectId;
  isHeadtable?: boolean;
  status?: "pending" | "active" | "decline";
  type?: string;

  // ⭐ Metric Fields
  carryForward: {
    oneToOne: number;
    referrals: number;
    visitors: number;
    trainings: number;
    business: number;
    testimonials: number;
  };

  activePeriodId?: Types.ObjectId; // links member to their current 6-month period

  isActive: number;
  isDelete: number;
  createdAt: Date; // join date
  updatedAt?: Date;
  deletedAt?: Date;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  deletedBy?: ObjectId;
}

/**
 * Subschemas
 */
const businessReferenceSchema = new Schema<IBusinessReference>({
  firstName: { type: String },
  lastName: { type: String },
  businessName: { type: String },
  phoneNumber: { type: String },
  relationship: { type: String },
  contactSharingGRIP: { type: Boolean, default: false },
  contactSharingGRIPReferences: { type: Boolean, default: false },
});

const termsAndCertificationsSchema = new Schema<ITermsAndCertifications>({
  willAttendMeetingsOnTime: { type: Boolean, default: false },
  willBringVisitors: { type: Boolean, default: false },
  willDisplayPositiveAttitude: { type: Boolean, default: false },
  understandsContributorsWin: { type: Boolean, default: false },
  willAbideByPolicies: { type: Boolean, default: false },
  willContributeBestAbility: { type: Boolean, default: false },
});

/**
 * Main Member Schema
 */
const memberSchema = new Schema<IMember>(
  {
    // Authentication
    pin: { type: String },
    fcmToken: { type: String },

    // Chapter Info
    chapterInfo: {
      countryName: { type: String, required: true, trim: true },
      stateName: { type: String, required: true, trim: true },
      zoneId: { type: Schema.Types.ObjectId, ref: "Zone", required: true },
      chapterId: {
        type: Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
      },
      CIDId: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
      whoInvitedYou: { type: String, required: true },
      howDidYouHearAboutGRIP: { type: String, required: true },
    },

    // Personal Details
    personalDetails: {
      profileImage: {
        docName: { type: String },
        docPath: { type: String },
        originalName: { type: String },
      },
      firstName: { type: String, required: true },
      lastName: { type: String },
      companyName: { type: String, required: true },
      industry: { type: String },
      categoryRepresented: { type: String, required: true },
      dob: { type: Date },
      previouslyGRIPMember: { type: Boolean, required: true, default: false },
      otherNetworkingOrgs: { type: String },
      isOtherNetworkingOrgs: { type: Boolean, required: true },
      education: { type: String },
      pins: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, ref: "Pin" },
          name: String,
          image: String,
        },
      ],
      renewalDate: { type: Date }
    },

    // Business Address
    businessAddress: {
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, required: true },
      state: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
    },

    // Contact Details
    contactDetails: {
      email: { type: String, required: true },
      mobileNumber: { type: String, required: true },
      secondaryPhone: { type: String },
      website: { type: String },
      gstNumber: { type: String },
    },

    // Business Details
    businessDetails: {
      businessDescription: { type: String },
      yearsInBusiness: { type: String },
    },

    // References & Terms
    businessReferences: [businessReferenceSchema],
    termsAndCertifications: termsAndCertificationsSchema,

    // Role & Status
    role: { type: Schema.Types.ObjectId, ref: "Role" },
    isHeadtable: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "active", "decline"],
      default: "pending",
    },
    type: { type: String, default: "member" },

    // ⭐ CARRY FORWARD FIELDS
    carryForward: {
      oneToOne: { type: Number, default: 0 },
      referrals: { type: Number, default: 0 },
      visitors: { type: Number, default: 0 },
      trainings: { type: Number, default: 0 },
      business: { type: Number, default: 0 },
      testimonials: { type: Number, default: 0 },
    },

    // ⭐ ACTIVE PERIOD FOR 6-MONTH CYCLE
    activePeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Period",
      default: null,
    },

    // System Fields
    isActive: { type: Number, default: 0 },
    isDelete: { type: Number, default: 0 },
    deletedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

/**
 * Indexes
 */
memberSchema.index({ "contactDetails.mobileNumber": 1 }, { unique: true });
memberSchema.index({
  "personalDetails.firstName": 1,
  "personalDetails.lastName": 1,
});
memberSchema.index({ "chapterInfo.chapterId": 1 });
memberSchema.index({ isDelete: 1 });

/**
 * Hash pin before saving
 */
memberSchema.pre("save", async function (next) {
  const member = this as any;
  if (member.isModified("pin")) {
    if (!member.pin.startsWith("$2")) {
      const salt = await bcrypt.genSalt(10);
      member.pin = await bcrypt.hash(member.pin, salt);
    }
  }
  next();
});

export const Member = model<IMember>("Member", memberSchema);
