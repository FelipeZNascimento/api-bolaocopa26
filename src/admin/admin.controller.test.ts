import { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MailerService } from "#mailer/mailer.service.js";
import { UserService } from "#user/user.service.js";
import { IUser } from "#user/user.types.js";
import { AppError } from "#utils/appError.js";
import { ErrorCode } from "#utils/errorCodes.js";

import { AdminController } from "./admin.controller";

// Mocks
const mockUserService = {
  deleteFromEdition: vi.fn(),
  getAllByEdition: vi.fn(),
  getById: vi.fn(),
  updateActiveStatus: vi.fn(),
};

const mockMailerService = {
  sendActivationEmail: vi.fn(),
};

const mockEditionMapping = vi.hoisted(() =>
  vi.fn((edition: number | string) => {
    const editionNum = typeof edition === "string" ? parseInt(edition) : edition;
    if (editionNum === 2024) return 2024;
    if (editionNum === 2026) return 3;
    return 0;
  }),
);

vi.mock("#user/user.service.js", () => ({ UserService: vi.fn(() => mockUserService) }));
vi.mock("#mailer/mailer.service.js", () => ({ MailerService: vi.fn(() => mockMailerService) }));
vi.mock("#utils/editionMapping.js", () => ({
  editionMapping: mockEditionMapping,
}));
vi.mock("#utils/apiResponse.js", () => ({
  ApiResponse: {
    error: vi.fn(),
    success: vi.fn(),
  },
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

function getMockReqRes() {
  return {
    next: vi.fn(),
    req: { body: {}, params: {} } as unknown as Request,
    res: {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as unknown as Response,
  };
}

describe("AdminController", () => {
  let controller: AdminController;

  beforeEach(() => {
    controller = new AdminController(
      mockUserService as unknown as UserService,
      mockMailerService as unknown as MailerService,
    );
    vi.clearAllMocks();
    process.env.EDITION = "2024";
  });

  afterEach(() => {
    delete process.env.EDITION;
  });

  describe("getAll", () => {
    it("should return all users by edition", async () => {
      const users = [mockUser, { ...mockUser, id: 2, nickname: "user2" }];
      mockUserService.getAllByEdition.mockResolvedValue(users);
      const { next, req, res } = getMockReqRes();

      await controller.getAll(req, res, next);

      expect(mockUserService.getAllByEdition).toHaveBeenCalledWith(2024);
    });

    it("should throw error if edition is missing", async () => {
      delete process.env.EDITION;
      const { next, req, res } = getMockReqRes();

      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });

    it("should use edition from params if provided", async () => {
      const users = [mockUser];
      mockUserService.getAllByEdition.mockResolvedValue(users);
      const { next, req, res } = getMockReqRes();
      req.params = { edition: "2026" };

      await controller.getAll(req, res, next);

      expect(mockUserService.getAllByEdition).toHaveBeenCalledWith(3); // 2026 maps to 3
    });
  });

  describe("getById", () => {
    it("should return user by id and edition", async () => {
      mockUserService.getById.mockResolvedValue(mockUser);
      const { next, req, res } = getMockReqRes();
      req.params = { userId: "1" };

      await controller.getById(req, res, next);

      expect(mockUserService.getById).toHaveBeenCalledWith(1, 2024);
    });

    it("should throw error if edition is missing", async () => {
      delete process.env.EDITION;
      const { next, req, res } = getMockReqRes();
      req.params = { userId: "1" };

      await controller.getById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });

    it("should throw error if userId is missing", async () => {
      const { next, req, res } = getMockReqRes();
      req.params = { edition: "1" };

      await controller.getById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    });

    it("should throw error for invalid edition mapping", async () => {
      const { next, req, res } = getMockReqRes();
      req.params = { userId: "1" };
      mockEditionMapping.mockReturnValueOnce(0);

      await controller.getById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should use edition from params if provided", async () => {
      mockUserService.getById.mockResolvedValue(mockUser);
      const { next, req, res } = getMockReqRes();
      req.params = { edition: "2026", userId: "1" };

      await controller.getById(req, res, next);

      expect(mockUserService.getById).toHaveBeenCalledWith(1, 3); // 2026 maps to 3
    });
  });

  describe("deleteFromEdition", () => {
    it("should delete user from edition", async () => {
      const remainingUsers = [{ ...mockUser, id: 2 }];
      mockUserService.deleteFromEdition.mockResolvedValue({ affectedRows: 1 });
      mockUserService.getAllByEdition.mockResolvedValue(remainingUsers);
      const { next, req, res } = getMockReqRes();
      req.body = { userId: 1 };

      await controller.deleteFromEdition(req, res, next);

      expect(mockUserService.deleteFromEdition).toHaveBeenCalledWith(1, 2024);
      expect(mockUserService.getAllByEdition).toHaveBeenCalledWith(2024);
    });

    it("should throw error if userId is missing", async () => {
      const { next, req, res } = getMockReqRes();
      req.body = {};

      await controller.deleteFromEdition(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should throw error if edition is missing", async () => {
      delete process.env.EDITION;
      const { next, req, res } = getMockReqRes();
      req.body = { userId: 1 };

      await controller.deleteFromEdition(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });
  });

  describe("updateActiveStatus", () => {
    it("should update user active status to false", async () => {
      const users = [mockUser];
      mockUserService.updateActiveStatus.mockResolvedValue({ affectedRows: 1 });
      mockUserService.getAllByEdition.mockResolvedValue(users);
      const { next, req, res } = getMockReqRes();
      req.body = { newStatus: false, userId: 1 };

      await controller.updateActiveStatus(req, res, next);

      expect(mockUserService.updateActiveStatus).toHaveBeenCalledWith(1, 2024, false);
      expect(mockUserService.getAllByEdition).toHaveBeenCalledWith(2024);
      expect(mockMailerService.sendActivationEmail).not.toHaveBeenCalled();
    });

    it("should update user active status to true and send activation email", async () => {
      const users = [mockUser];
      mockUserService.updateActiveStatus.mockResolvedValue({ affectedRows: 1 });
      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.getAllByEdition.mockResolvedValue(users);
      mockMailerService.sendActivationEmail.mockResolvedValue(undefined);
      const { next, req, res } = getMockReqRes();
      req.body = { newStatus: true, userId: 1 };

      await controller.updateActiveStatus(req, res, next);

      expect(mockUserService.updateActiveStatus).toHaveBeenCalledWith(1, 2024, true);
      expect(mockUserService.getById).toHaveBeenCalledWith(1, 2024);
      expect(mockMailerService.sendActivationEmail).toHaveBeenCalledWith("test@example.com", "testuser");
      expect(mockUserService.getAllByEdition).toHaveBeenCalledWith(2024);
    });

    it("should throw error if user not found when activating", async () => {
      mockUserService.updateActiveStatus.mockResolvedValue({ affectedRows: 1 });
      mockUserService.getById.mockResolvedValue(null);
      const { next, req, res } = getMockReqRes();
      req.body = { newStatus: true, userId: 1 };

      await controller.updateActiveStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
    });

    it("should throw error if userId is missing", async () => {
      const { next, req, res } = getMockReqRes();
      req.body = { newStatus: true };

      await controller.updateActiveStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should throw error if newStatus is missing", async () => {
      const { next, req, res } = getMockReqRes();
      req.body = { userId: 1 };

      await controller.updateActiveStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should throw error if edition is missing", async () => {
      delete process.env.EDITION;
      const { next, req, res } = getMockReqRes();
      req.body = { newStatus: true, userId: 1 };

      await controller.updateActiveStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });
  });
});
