const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { ethers } = require("ethers");

process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "test_auth_secret";

const { createApp } = require("../server");
const User = require("../models/User");
const Task = require("../models/Task");
const { rejectExpiredOpenTasks } = require("../services/taskDeadlineService");

test("GET /api/health returns status ok", async () => {
  const app = createApp();
  const res = await request(app).get("/api/health");

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(typeof res.body.timestamp, "string");
  assert.equal(typeof res.body.uptime, "number");
});

test("Unknown route returns JSON 404", async () => {
  const app = createApp();
  const res = await request(app).get("/api/does-not-exist");

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /Route not found/);
});

test("GET /api/auth/session rejects missing token", async () => {
  const app = createApp();
  const res = await request(app).get("/api/auth/session");

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /Missing auth token/);
});

test("POST /api/auth/nonce validates wallet format", async () => {
  const app = createApp();
  const res = await request(app)
    .post("/api/auth/nonce")
    .send({ walletAddress: "not-a-wallet" });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /Invalid wallet address/);
});

test("POST /api/auth/nonce returns challenge for valid wallet", async () => {
  const app = createApp();
  const walletAddress = "0xbc915cabd1e7951c96de688700fce3507ee0d0f5";

  const res = await request(app)
    .post("/api/auth/nonce")
    .send({ walletAddress });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.walletAddress, walletAddress);
  assert.equal(typeof res.body.data.nonce, "string");
  assert.equal(typeof res.body.data.message, "string");
  assert.equal(typeof res.body.data.expiresAt, "number");
});

test("POST /api/auth/verify returns token for valid signature", async () => {
  const app = createApp();
  const wallet = ethers.Wallet.createRandom();
  const walletAddress = wallet.address.toLowerCase();

  const nonceRes = await request(app)
    .post("/api/auth/nonce")
    .send({ walletAddress });

  assert.equal(nonceRes.statusCode, 200);
  assert.equal(nonceRes.body.success, true);

  const message = nonceRes.body.data?.message;
  assert.equal(typeof message, "string");

  const signature = await wallet.signMessage(message);

  const originalFindOneAndUpdate = User.findOneAndUpdate;
  User.findOneAndUpdate = async () => ({ walletAddress });

  try {
    const verifyRes = await request(app)
      .post("/api/auth/verify")
      .send({ walletAddress, signature });

    assert.equal(verifyRes.statusCode, 200);
    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.data.walletAddress, walletAddress);
    assert.equal(typeof verifyRes.body.data.token, "string");
    assert.ok(verifyRes.body.data.token.length > 10);
  } finally {
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("rejectExpiredOpenTasks also rejects stale in-review tasks", async () => {
  const originalUpdateMany = Task.updateMany;

  const calls = [];
  Task.updateMany = async (query, update) => {
    calls.push({ query, update });
    return { modifiedCount: 1 };
  };

  try {
    const count = await rejectExpiredOpenTasks(
      new Date("2026-04-06T12:00:00.000Z"),
    );

    assert.equal(count, 2);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].query.status, "open");
    assert.equal(calls[1].query.status, "in_review");
  } finally {
    Task.updateMany = originalUpdateMany;
  }
});
