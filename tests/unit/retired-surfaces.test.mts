import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { list, remove } from "../../convex/reports.ts";

function handler<TArgs, TResult>(value: unknown) {
  return (value as { _handler: (ctx: unknown, args: TArgs) => Promise<TResult> })._handler;
}

const retiredFiles = [
  "app/api/intake/route.ts",
  "components/chat/ConsultationFlow.tsx",
  "components/chat/ConsultationFlowLoader.tsx",
  "components/reports/ReportUploader.tsx",
  "lib/ai-intake.ts",
  "lib/case-summary.ts",
  "lib/intake-copy.ts",
  "lib/report-files.ts",
  "lib/specialty-routing.ts",
] as const;

test("removes every active AI-chat and report-upload entry point", () => {
  for (const path of retiredFiles) {
    assert.equal(existsSync(path), false, `${path} must be retired`);
  }
});

test("keeps historical report access and deletion but exposes no new upload mutations", () => {
  const reports = readFileSync("convex/reports.ts", "utf8");

  assert.match(reports, /export const list = query/);
  assert.match(reports, /export const remove = mutation/);
  assert.doesNotMatch(reports, /export const (?:generateUploadUrl|attach) = mutation/);
});

test("a saved report can still be listed and securely removed for its owning session", async () => {
  const consultationCase = {
    _id: "case-1",
    sessionId: "session-1",
    caseType: "consultation",
  };
  const report = {
    _id: "report-1",
    caseId: "case-1",
    storageId: "storage-1",
    fileName: "historical-report.pdf",
  };
  const deletedStorage: string[] = [];
  const deletedRows: string[] = [];
  const ctx = {
    db: {
      get: async (id: string) => id === consultationCase._id
        ? consultationCase
        : id === report._id
          ? report
          : null,
      delete: async (id: string) => { deletedRows.push(id); },
      query: () => ({
        withIndex: () => ({ collect: async () => [report] }),
      }),
    },
    storage: {
      delete: async (id: string) => { deletedStorage.push(id); },
    },
  };

  const listReports = handler<Record<string, unknown>, Array<Record<string, unknown>>>(list);
  const removeReport = handler<Record<string, unknown>, void>(remove);

  assert.deepEqual(await listReports(ctx, {
    caseId: "case-1",
    sessionId: "session-1",
  }), [report]);

  await removeReport(ctx, {
    caseId: "case-1",
    sessionId: "session-1",
    reportId: "report-1",
  });

  assert.deepEqual(deletedStorage, ["storage-1"]);
  assert.deepEqual(deletedRows, ["report-1"]);
});

test("a different session cannot list or delete a historical report", async () => {
  let storageDeleted = false;
  let rowDeleted = false;
  const ctx = {
    db: {
      get: async () => ({
        _id: "case-1",
        sessionId: "owning-session",
        caseType: "consultation",
      }),
      delete: async () => { rowDeleted = true; },
      query: () => ({
        withIndex: () => ({ collect: async () => [] }),
      }),
    },
    storage: {
      delete: async () => { storageDeleted = true; },
    },
  };
  const listReports = handler<Record<string, unknown>, Array<Record<string, unknown>>>(list);
  const removeReport = handler<Record<string, unknown>, void>(remove);

  await assert.rejects(
    listReports(ctx, { caseId: "case-1", sessionId: "different-session" }),
    /saved consultation case was not found/i,
  );
  await assert.rejects(
    removeReport(ctx, {
      caseId: "case-1",
      sessionId: "different-session",
      reportId: "report-1",
    }),
    /saved consultation case was not found/i,
  );
  assert.equal(storageDeleted, false);
  assert.equal(rowDeleted, false);
});

test("keeps guided and legacy payment recovery without legacy chat writes", () => {
  const cases = readFileSync("convex/cases.ts", "utf8");

  assert.match(cases, /export const getGuidedSessionSnapshot = query/);
  assert.match(cases, /kind: "legacy-payment"/);
  assert.doesNotMatch(
    cases,
    /export const (?:create|createUnsupportedEnquiry|saveProgress|setStage|getSessionSnapshot) =/,
  );
});

test("documents the guided Top Docs setup without an OpenAI launch key", () => {
  const envExample = readFileSync(".env.example", "utf8");
  const readme = readFileSync("README.md", "utf8");

  assert.doesNotMatch(envExample, /OPENAI_API_KEY/);
  assert.match(envExample, /^RAZORPAY_LIVE_ENABLED=false$/m);
  assert.match(readme, /^# Top Docs$/m);
  assert.match(readme, /guided/i);
  assert.match(readme, /reports.*WhatsApp/i);
});
