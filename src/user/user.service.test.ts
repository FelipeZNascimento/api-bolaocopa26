import bcrypt from "bcrypt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserService } from "./user.service";
import { IUser } from "./user.types";

const mockDb = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("#database/db.js", () => ({ default: mockDb }));

const BCRYPT_HASH = "$2b$12$placeholder.hash.for.testing.purposes.only.xxxxxx";

const mockUser: IUser = {
  admin: false,
  editionId: 1,
  email: "test@example.com",
  favorites: null,
  id: 1,
  isActive: true,
  isOnline: false,
  locale: null,
  name: "Test User",
  nickname: "testuser",
  timestamp: 0,
};

describe("UserService", () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("login", () => {
    it("returns empty array when email is not found", async () => {
      mockDb.query.mockResolvedValueOnce([]);

      const result = await service.login("unknown@example.com", "anypassword");

      expect(result).toEqual([]);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it("returns empty array when password does not match", async () => {
      mockDb.query.mockResolvedValueOnce([{ password: BCRYPT_HASH }]);
      vi.spyOn(bcrypt, "compare").mockResolvedValueOnce(false as never);

      const result = await service.login("test@example.com", "wrongpassword");

      expect(result).toEqual([]);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it("returns user rows when credentials are correct", async () => {
      mockDb.query.mockResolvedValueOnce([{ password: BCRYPT_HASH }]).mockResolvedValueOnce([mockUser]);
      vi.spyOn(bcrypt, "compare").mockResolvedValueOnce(true as never);

      const result = await service.login("test@example.com", "correctpassword");

      expect(result).toEqual([mockUser]);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it("normalises email to lower-case before querying", async () => {
      mockDb.query.mockResolvedValueOnce([]);

      await service.login("TEST@EXAMPLE.COM", "password");

      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), ["test@example.com"]);
    });
  });

  describe("register", () => {
    it("hashes the password before inserting", async () => {
      const hashedPassword = "hashed-value";
      vi.spyOn(bcrypt, "hash").mockResolvedValueOnce(hashedPassword as never);
      mockDb.query.mockResolvedValueOnce({ affectedRows: 1, insertId: 42 });

      await service.register("new@example.com", "Name", "nick", "plaintextpassword");

      expect(bcrypt.hash).toHaveBeenCalledWith("plaintextpassword", expect.any(Number));
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [
        "new@example.com",
        hashedPassword,
        "Name",
        "nick",
      ]);
    });

    it("normalises email to lower-case before inserting", async () => {
      vi.spyOn(bcrypt, "hash").mockResolvedValueOnce("hashed" as never);
      mockDb.query.mockResolvedValueOnce({ affectedRows: 1, insertId: 1 });

      await service.register("UPPER@EXAMPLE.COM", "Name", "nick", "pass");

      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), ["upper@example.com", "hashed", "Name", "nick"]);
    });
  });

  describe("updatePassword", () => {
    it("returns affectedRows 0 when user is not found", async () => {
      mockDb.query.mockResolvedValueOnce([]);

      const result = await service.updatePassword("current", "new", 99);

      expect(result.affectedRows).toBe(0);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it("returns affectedRows 0 when current password does not match", async () => {
      mockDb.query.mockResolvedValueOnce([{ password: BCRYPT_HASH }]);
      vi.spyOn(bcrypt, "compare").mockResolvedValueOnce(false as never);

      const result = await service.updatePassword("wrongcurrent", "new", 1);

      expect(result.affectedRows).toBe(0);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it("hashes new password and updates when current password matches", async () => {
      const newHash = "new-bcrypt-hash";
      mockDb.query.mockResolvedValueOnce([{ password: BCRYPT_HASH }]).mockResolvedValueOnce({ affectedRows: 1 });
      vi.spyOn(bcrypt, "compare").mockResolvedValueOnce(true as never);
      vi.spyOn(bcrypt, "hash").mockResolvedValueOnce(newHash as never);

      const result = await service.updatePassword("correctcurrent", "newpassword", 1);

      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", expect.any(Number));
      expect(mockDb.query).toHaveBeenLastCalledWith(expect.any(String), [newHash, 1]);
      expect(result.affectedRows).toBe(1);
    });
  });

  describe("updatePasswordFromToken", () => {
    it("hashes the new password before updating", async () => {
      const newHash = "token-reset-hash";
      vi.spyOn(bcrypt, "hash").mockResolvedValueOnce(newHash as never);
      mockDb.query.mockResolvedValueOnce({ affectedRows: 1 });

      await service.updatePasswordFromToken("newpassword", 1);

      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", expect.any(Number));
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [newHash, 1]);
    });
  });
});
