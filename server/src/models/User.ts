import mongoose, { Document, Schema } from "mongoose";

export interface IExperience {
  company: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  photo?: string;
  headline?: string;
  about?: string;
  experience: IExperience[];
  education: string[];
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
}

const experienceSchema = new Schema<IExperience>(
  {
    company: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
    },

    description: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    photo: {
      type: String,
      default: "",
    },

    headline: {
      type: String,
      default: "",
      trim: true,
    },

    about: {
      type: String,
      default: "",
      trim: true,
    },

    experience: {
      type: [experienceSchema],
      default: [],
    },

    education: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model<IUser>("User", userSchema);