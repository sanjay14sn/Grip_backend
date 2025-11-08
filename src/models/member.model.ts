import mongoose, { Document, ObjectId, Schema, Types, model } from "mongoose";
import bcrypt from "bcrypt";

interface IBusinessReference {
  firstName: string;
  lastName: string;
  businessName: string;
  phoneNumber: string;
  relationship: string;
  contactSharingGRIP: boolean;
  contactSharingGRIPReferences: boolean;
}

interface ITermsAndCertifications {
  willAttendMeetingsOnTime: boolean;
  willBringVisitors: boolean;
  willDisplayPositiveAttitude: boolean;
  understandsContributorsWin: boolean;
  willAbideByPolicies: boolean;
  willContributeBestAbility: boolean;
}

export interface IMember extends Document {
  // Authentication
  pin: string;
  fcmToken?: string;

  // Chapter Information
  chapterInfo: {
    countryName: string;
    stateName: string;
    zoneId: Schema.Types.ObjectId;
    chapterId: Schema.Types.ObjectId;
    CIDId: Schema.Types.ObjectId[];
    whoInvitedYou?: string;
    howDidYouHearAboutGRIP?: string;
  };

  // Personal Details
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
    previouslyGRIPMember?: boolean;
    otherNetworkingOrgs?: string;
    isOtherNetworkingOrgs?: boolean;
    education?: string;
  };

  // Business Address
  businessAddress: {
    addressLine1?: string;
    addressLine2?: string;
    state?: string;
    city?: string;
    postalCode?: string;
  };

  // Contact Details
  contactDetails: {
    email: string;
    mobileNumber: string;
    secondaryPhone?: string;
    website?: string;
    gstNumber?: string;
  };

  // Business Details
  businessDetails: {
    businessDescription?: string;
    yearsInBusiness?: string;
  };

  // Business References
  businessReferences: IBusinessReference[];

  // Terms and Certifications
  termsAndCertifications: ITermsAndCertifications;

  // Role and Status
  role?: Types.ObjectId;
  isHeadtable?: boolean;
  status?: "pending" | "active" | "decline";
  type?: string;

  // System Fields
  isActive: number;
  isDelete: number;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
  deletedBy?: ObjectId;
}

const businessReferenceSchema = new Schema<IBusinessReference>({
  firstName: { type: String, },
  lastName: { type: String },
  businessName: { type: String },
  phoneNumber: { type: String, },
  relationship: { type: String, },
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

const memberSchema = new Schema<IMember>(
  {
    // Authentication
    pin: {
      type: String,
    },
    fcmToken: { type: String },
    chapterInfo: {
      countryName: {
        type: String,
        required: true,
        trim: true,
      },
      stateName: {
        type: String,
        required: true,
        trim: true,
      },
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
    },
    businessAddress: {
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, required: true },
      state: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    contactDetails: {
      email: { type: String, required: true },
      mobileNumber: { type: String, required: true },
      secondaryPhone: { type: String },
      website: { type: String },
      gstNumber: { type: String },
    },
    businessDetails: {
      businessDescription: { type: String },
      yearsInBusiness: { type: String },
    },
    businessReferences: [businessReferenceSchema],
    termsAndCertifications: termsAndCertificationsSchema,
    role: { type: Schema.Types.ObjectId, ref: "Role" },
    isHeadtable: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "active", "decline"],
      default: "pending",
    },
    type: {
      type: String,
      default: "member",
    },
    isActive: { type: Number, default: 0 },
    isDelete: { type: Number, default: 0 },
    deletedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Indexes for better query performance
memberSchema.index({ "contactDetails.mobileNumber": 1 }, { unique: true });
memberSchema.index({
  "personalDetails.firstName": 1,
  "personalDetails.lastName": 1,
});
memberSchema.index({ "chapterInfo.chapterId": 1 });
memberSchema.index({ isDelete: 1 });

// Hash pin before saving
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
