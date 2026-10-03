import api from "../api/axios";

export interface SearchUser {
  _id: string;
  name: string;
  photo?: string;
  headline?: string;
}

export interface Experience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface UserProfile extends SearchUser {
  email: string;
  about?: string;
  experience: Experience[];
  education: string[];
  skills: string[];
}

export interface UpdateProfileData {
  name: string;
  photo: string;
  headline: string;
  about: string;
  experience: Experience[];
  education: string[];
  skills: string[];
}

export const searchUsers = async (search: string) =>
  (
    await api.get("/users/search", {
      params: { search },
    })
  ).data;

export const getUserProfile = async (userId: string) =>
  (
    await api.get(`/users/${userId}`)
  ).data;

/*
 * Update the currently logged-in user's profile.
 */
export const updateMyProfile = async (
  profile: UpdateProfileData,
) =>
  (
    await api.put("/users/me", profile)
  ).data;