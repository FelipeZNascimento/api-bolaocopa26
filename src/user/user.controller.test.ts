import { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MailerService } from "#mailer/mailer.service.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";

import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { IUser } from "./user.types";

// Mocks
const mockUserService = {
  getByEdition: vi.fn(),
  getByEmail: vi.fn(),
  getById: vi.fn(),
  getFavoritesById: vi.fn(),
  isEmailRegistered: vi.fn(),
  isNicknameRegistered: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  setOnCurrentEdition: vi.fn(),
  updateFavorites: vi.fn(),
  updateLastOnlineTime: vi.fn(),
  updatePassword: vi.fn(),
  updatePasswordFromToken: vi.fn(),
  updateProfile: vi.fn(),
};

const mockMailerService = {
  sendPasswordResetEmail: vi.fn(),
};

const mockCachedInfo = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

const mockCheckExistingEntries = vi.hoisted(() => vi.fn());
const mockGenerateVerificationToken = vi.hoisted(() => vi.fn(() => "token123"));
const mockClearRankingCache = vi.hoisted(() => vi.fn());
const mockEditionMapping = vi.hoisted(() =>
  vi.fn((edition: number | string) => {
    // Mock the edition mapping to return the edition as number for testing
    const editionNum = typeof edition === "string" ? parseInt(edition) : edition;
    if (editionNum === 2024) return 2024;
    if (editionNum === 2026) return 3;
    return 0;
  }),
);

vi.mock("#user/user.service.js", () => ({ UserService: vi.fn(() => mockUserService) }));
vi.mock("#mailer/mailer.service.js", () => ({ MailerService: vi.fn(() => mockMailerService) }));
vi.mock("#utils/dataCache.js", () => ({
  cachedInfo: mockCachedInfo,
}));
vi.mock("#user/user.utils.js", () => ({
  checkExistingEntries: mockCheckExistingEntries,
  generateVerificationToken: mockGenerateVerificationToken,
}));
vi.mock("#ranking/ranking.utils.js", () => ({
  clearRankingCache: mockClearRankingCache,
}));
vi.mock("#utils/editionMapping.js", () => ({
  editionMapping: mockEditionMapping,
}));
vi.mock("#utils/apiResponse.js", () => ({
  ApiResponse: {
    error: vi.fn(),
    success: vi.fn(),
  },
  isFulfilled: vi.fn((result: PromiseSettledResult<unknown>) => result.status === "fulfilled"),
  isRejected: vi.fn((result: PromiseSettledResult<unknown>) => result.status === "rejected"),
}));

const mockUser: IUser = {
  admin: false,
  editionId: 2024,
  email: "test@example.com",
  favorites: "[1, 2, 3]",
  id: 1,
  isActive: true,
  isOnline: false,
  name: "Test User",
  nickname: "testuser",
  timestamp: 123456789,
};

function getMockReqResSession(user: IUser | null = null) {
  const session = {
    destroy: vi.fn((cb?: (err?: Error) => void) => {
      if (cb) cb();
    }),
    regenerate: vi.fn((cb?: (err?: Error) => void) => {
      if (cb) cb();
    }),
    save: vi.fn((cb?: (err?: Error) => void) => {
      if (cb) cb();
    }),
    user,
  };
  return {
    next: vi.fn(),
    req: { body: {}, params: {}, session } as unknown as Request,
    res: {
      clearCookie: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as unknown as Response,
  };
}

describe("UserController", () => {
  let controller: UserController;

  beforeEach(() => {
    controller = new UserController(
      mockUserService as unknown as UserService,
      mockMailerService as unknown as MailerService,
    );
    vi.clearAllMocks();
    process.env.EDITION = "2024";
  });

  afterEach(() => {
    delete process.env.EDITION;
  });

  describe("getActiveProfile", () => {
    it("should return null if no user in session", async () => {
      const { next, req, res } = getMockReqResSession();

      await controller.getActiveProfile(req, res, next);

      expect(mockUserService.getById).not.toHaveBeenCalled();
    });

    it("should return user profile when user is in session", async () => {
      const { next, req, res } = getMockReqResSession(mockUser);
      mockUserService.getById.mockResolvedValue(mockUser);

      await controller.getActiveProfile(req, res, next);

      expect(mockUserService.getById).toHaveBeenCalledWith(1, 2024);
    });

    it("should throw error if edition is missing", async () => {
      delete process.env.EDITION;
      const { next, req, res } = getMockReqResSession(mockUser);

      await controller.getActiveProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });

    it("should use edition from params if provided", async () => {
      const { next, req, res } = getMockReqResSession(mockUser);
      req.params = { edition: "2026" };
      mockUserService.getById.mockResolvedValue(mockUser);

      await controller.getActiveProfile(req, res, next);

      expect(mockUserService.getById).toHaveBeenCalledWith(1, 3); // 2026 maps to 3
    });
  });

  describe("login", () => {
    it("should return existing session user if already logged in", async () => {
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { email: "test@example.com", password: "password123" };

      await controller.login(req, res, next);

      expect(mockUserService.login).not.toHaveBeenCalled();
    });

    it("should throw error if credentials are missing", async () => {
      const { next, req, res } = getMockReqResSession();
      req.body = { email: "test@example.com" };

      await controller.login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it("should throw error if login fails", async () => {
      mockUserService.login.mockResolvedValue([]);
      const { next, req, res } = getMockReqResSession();
      req.body = { email: "test@example.com", password: "wrongpassword" };

      await controller.login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });

    it("should login successfully and set session user", async () => {
      mockUserService.login.mockResolvedValue([mockUser]);
      mockUserService.getFavoritesById.mockResolvedValue("[1,2,3]");
      const { next, req, res } = getMockReqResSession();
      req.body = { email: "test@example.com", password: "password123" };

      await controller.login(req, res, next);

      expect(mockUserService.login).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockUserService.getFavoritesById).toHaveBeenCalledWith(1, 2024);
      expect(req.session.user).toEqual(expect.objectContaining({ email: "test@example.com", id: 1 }));
    });

    it("should throw error if edition is missing", async () => {
      delete process.env.EDITION;
      const { next, req, res } = getMockReqResSession();
      req.body = { email: "test@example.com", password: "password123" };

      await controller.login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe("logout", () => {
    it("should clear session", async () => {
      const { next, req, res } = getMockReqResSession(mockUser);

      await controller.logout(req, res, next);

      expect(req.session.user).toBeNull();
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith("connect.sid", { sameSite: "strict", secure: false });
    });

    it("should handle logout when no user in session", async () => {
      const { next, req, res } = getMockReqResSession();

      await controller.logout(req, res, next);

      expect(req.session.user).toBeNull();
      expect(req.session.destroy).toHaveBeenCalled();
    });
  });

  describe("register", () => {
    it("should throw error if required fields are missing", async () => {
      const { next, req, res } = getMockReqResSession();
      req.body = { email: "test@example.com", password: "password123" };

      await controller.register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    });

    it("should throw error if email or nickname already exists", async () => {
      mockCheckExistingEntries.mockResolvedValue(false);
      const { next, req, res } = getMockReqResSession();
      req.body = {
        email: "test@example.com",
        name: "Test User",
        nickname: "testuser",
        password: "password123",
      };

      await controller.register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it("should register user successfully and log them in", async () => {
      mockCheckExistingEntries.mockResolvedValue(true);
      mockUserService.register.mockResolvedValue({ affectedRows: 1, insertId: 10 });
      mockUserService.setOnCurrentEdition.mockResolvedValue({ affectedRows: 1 });
      mockUserService.login.mockResolvedValue([mockUser]);
      mockUserService.getFavoritesById.mockResolvedValue("[1,2,3]");
      const { next, req, res } = getMockReqResSession();
      req.body = {
        email: "new@example.com",
        name: "New User",
        nickname: "newuser",
        password: "password123",
      };

      await controller.register(req, res, next);

      expect(mockUserService.register).toHaveBeenCalledWith("new@example.com", "New User", "newuser", "password123");
      expect(mockUserService.setOnCurrentEdition).toHaveBeenCalledWith(2024, 10);
      expect(mockUserService.login).toHaveBeenCalledWith("new@example.com", "password123");
      expect(mockUserService.getFavoritesById).toHaveBeenCalledWith(1, 2024);
      expect(req.session.user).toEqual(mockUser);
    });

    it("should throw error if registration fails", async () => {
      mockCheckExistingEntries.mockResolvedValue(true);
      mockUserService.register.mockResolvedValue({ affectedRows: 0 });
      const { next, req, res } = getMockReqResSession();
      req.body = {
        email: "new@example.com",
        name: "New User",
        nickname: "newuser",
        password: "password123",
      };

      await controller.register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.DB_ERROR);
    });

    it("should throw error if setting user on edition fails", async () => {
      mockCheckExistingEntries.mockResolvedValue(true);
      mockUserService.register.mockResolvedValue({ affectedRows: 1, insertId: 10 });
      mockUserService.setOnCurrentEdition.mockResolvedValue({ affectedRows: 0 });
      const { next, req, res } = getMockReqResSession();
      req.body = {
        email: "new@example.com",
        name: "New User",
        nickname: "newuser",
        password: "password123",
      };

      await controller.register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(204);
    });
  });

  describe("updatePassword", () => {
    it("should update password with valid reset token", async () => {
      mockCachedInfo.get.mockReturnValue("token123");
      mockUserService.getByEmail.mockResolvedValue(mockUser);
      mockUserService.updatePasswordFromToken.mockResolvedValue({ affectedRows: 1 });
      const { next, req, res } = getMockReqResSession();
      req.body = {
        email: "test@example.com",
        newPassword: "newpassword123",
        token: "token123",
      };

      await controller.updatePassword(req, res, next);

      expect(mockCachedInfo.get).toHaveBeenCalledWith("PASSWORD_RESET_test@example.com");
      expect(mockCachedInfo.del).toHaveBeenCalledWith("PASSWORD_RESET_test@example.com");
      expect(mockUserService.updatePasswordFromToken).toHaveBeenCalledWith("newpassword123", 1);
    });

    it("should throw error if reset token is invalid", async () => {
      mockCachedInfo.get.mockReturnValue("differenttoken");
      const { next, req, res } = getMockReqResSession();
      req.body = {
        email: "test@example.com",
        newPassword: "newpassword123",
        token: "token123",
      };

      await controller.updatePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it("should throw error if current password is incorrect", async () => {
      mockUserService.updatePassword.mockResolvedValue({ affectedRows: 0 });
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = {
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      };

      await controller.updatePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.INVALID_PASSWORD);
    });

    it("should update password with correct current password", async () => {
      mockUserService.updatePassword.mockResolvedValue({ affectedRows: 1 });
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = {
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
      };

      await controller.updatePassword(req, res, next);

      expect(mockUserService.updatePassword).toHaveBeenCalledWith("oldpassword", "newpassword123", 1);
    });

    it("should throw error if required fields are missing", async () => {
      const { next, req, res } = getMockReqResSession();
      req.body = {};

      await controller.updatePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    });
  });

  describe("updateProfile", () => {
    it("should throw error if required fields are missing", async () => {
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { name: "Updated Name" };

      await controller.updateProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    });

    it("should throw error if nickname already exists", async () => {
      mockCheckExistingEntries.mockResolvedValue(false);
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { name: "Updated Name", nickname: "existingnick" };

      await controller.updateProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it("should update profile successfully and update session", async () => {
      mockCheckExistingEntries.mockResolvedValue(true);
      mockUserService.updateProfile.mockResolvedValue({ affectedRows: 1 });
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { name: "Updated Name", nickname: "updatednick" };

      await controller.updateProfile(req, res, next);

      expect(mockUserService.updateProfile).toHaveBeenCalledWith(1, "Updated Name", "updatednick");
      expect(req.session.user?.name).toBe("Updated Name");
      expect(req.session.user?.nickname).toBe("updatednick");
      expect(mockClearRankingCache).toHaveBeenCalled();
    });

    it("should fetch user if update returns no affected rows", async () => {
      mockCheckExistingEntries.mockResolvedValue(true);
      mockUserService.updateProfile.mockResolvedValue({ affectedRows: 0 });
      mockUserService.getById.mockResolvedValue(mockUser);
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { name: "Updated Name", nickname: "updatednick" };

      await controller.updateProfile(req, res, next);

      expect(mockUserService.getById).toHaveBeenCalledWith(1, 2024);
    });
  });

  describe("forgotPassword", () => {
    it("should throw error if email is missing", async () => {
      const { next, req, res } = getMockReqResSession();
      req.body = {};

      await controller.forgotPassword(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    });

    it("should send password reset email and cache token", async () => {
      mockUserService.isEmailRegistered.mockResolvedValue(true);
      mockMailerService.sendPasswordResetEmail.mockResolvedValue(undefined);
      const { next, req, res } = getMockReqResSession();
      req.body = { email: "test@example.com" };
      req.get = vi.fn().mockReturnValue("en-US");

      await controller.forgotPassword(req, res, next);

      expect(mockGenerateVerificationToken).toHaveBeenCalled();
      expect(mockCachedInfo.set).toHaveBeenCalledWith("PASSWORD_RESET_test@example.com", "token123", 3600);
      expect(mockMailerService.sendPasswordResetEmail).toHaveBeenCalledWith("test@example.com", "token123", "en-US");
    });
  });
});
