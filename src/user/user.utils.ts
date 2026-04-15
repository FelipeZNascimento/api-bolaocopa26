import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";

import { UserService } from "./user.service.js";

export const checkExistingEntries = async (
  userService: UserService,
  email: string,
  nickname: string,
  userId?: number,
) => {
  const [emailCheckResponse, nicknameCheckResponse] = await Promise.allSettled([
    userService.isEmailValid(email, userId),
    userService.isNicknameValid(nickname, userId),
  ]);

  if (isRejected(emailCheckResponse) || isRejected(nicknameCheckResponse)) {
    throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
  }

  const isEmailValid = isFulfilled(emailCheckResponse) ? emailCheckResponse.value : false;
  const isNicknameValid = isFulfilled(nicknameCheckResponse) ? nicknameCheckResponse.value : false;

  return isEmailValid && isNicknameValid;
};

export const validateEmail = (email: string) => {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
};

export const generateVerificationToken = (): string => {
  const randomA = Math.random().toString(36).substring(2); // remove `0.`
  const randomB = Math.random().toString(36).substring(2); // remove `0.`

  return `${randomA}${randomB}`;
};
