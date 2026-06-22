import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "vite";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const FORBIDDEN_PRIVATE_FIELD_PARTS = [
  "secret",
  "password",
  "votechoice",
  "candidatechoice",
  "proof",
  "nullifier",
  "txhash",
  "transactionhash",
  "wallet",
  "privatekey",
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error("Chrome or Edge executable was not found. Set CHROME_PATH to run the browser smoke.");
}

async function waitForJson(url, timeoutMs = 15_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response.json();
      }
    } catch {
      // Chrome is still starting.
    }

    await delay(150);
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function stopProcess(childProcess) {
  if (!childProcess || childProcess.exitCode !== null) {
    return;
  }

  childProcess.kill();
  await new Promise((resolve) => {
    childProcess.once("exit", resolve);
    setTimeout(resolve, 2_000);
  });
}

async function removeWithRetry(path) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 4) {
        console.warn(`Unable to remove temporary Chrome profile ${path}: ${error.message}`);
        return;
      }

      await delay(300);
    }
  }
}

class CdpClient {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ws = new WebSocket(wsUrl);
  }

  async open() {
    if (this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);

        if (message.error) {
          reject(new Error(message.error.message));
          return;
        }

        resolve(message.result);
        return;
      }

      if (message.method && this.listeners.has(message.method)) {
        for (const listener of this.listeners.get(message.method)) {
          listener(message.params);
        }
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;

    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.ws.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  waitForEvent(method, timeoutMs = 10_000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.listeners.set(
          method,
          (this.listeners.get(method) ?? []).filter((listener) => listener !== onEvent),
        );
        reject(new Error(`Timed out waiting for CDP event ${method}.`));
      }, timeoutMs);

      const onEvent = (params) => {
        clearTimeout(timeout);
        this.listeners.set(
          method,
          (this.listeners.get(method) ?? []).filter((listener) => listener !== onEvent),
        );
        resolve(params);
      };

      this.listeners.set(method, [...(this.listeners.get(method) ?? []), onEvent]);
    });
  }

  async evaluate(expression, options = {}) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
      ...options,
    });

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? "Runtime evaluation failed.");
    }

    return result.result.value;
  }

  close() {
    this.ws.close();
  }
}

async function waitForExpression(client, expression, timeoutMs = 15_000) {
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await client.evaluate(expression);

    if (lastValue) {
      return lastValue;
    }

    await delay(200);
  }

  throw new Error(`Timed out waiting for expression: ${expression}. Last value: ${JSON.stringify(lastValue)}`);
}

function collectJsonFieldNames(value, fieldNames = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonFieldNames(item, fieldNames));
    return fieldNames;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, childValue]) => {
      fieldNames.push(key.toLowerCase());
      collectJsonFieldNames(childValue, fieldNames);
    });
  }

  return fieldNames;
}

const registryFixture = JSON.parse(await readFile(new URL("../src/contracts/registry.local.json", import.meta.url)));
const chromePath = await findChrome();
const userDataDir = await mkdtemp(join(tmpdir(), "zkvote-chrome-"));
const server = await createServer({
  server: {
    host: "127.0.0.1",
    port: 0,
  },
});

let chrome;
let client;

try {
  await server.listen();
  const address = server.httpServer.address();
  const appUrl = `http://127.0.0.1:${address.port}`;
  const debugPort = 9223 + Math.floor(Math.random() * 1000);

  chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], {
    stdio: "ignore",
  });

  const version = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
  client = new CdpClient(version.webSocketDebuggerUrl);
  await client.open();
  const target = await client.send("Target.createTarget", { url: `${appUrl}/login` });
  const targetInfo = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const pageTarget = targetInfo.find((candidate) => candidate.id === target.targetId);

  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error("Unable to open Chrome page target.");
  }

  client.close();
  client = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.waitForEvent("Page.loadEventFired");

  await client.evaluate(`
    (() => {
      const setValue = (selector, value) => {
        const input = document.querySelector(selector);
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value").set;
        setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };

      setValue("#login-email", "admin@zkvote.local");
      setValue("#login-password", "password123");
      document.querySelector("form").requestSubmit();
      return true;
    })()
  `);

  await waitForExpression(client, `location.pathname === "/dashboard"`);
  await client.evaluate(`
    localStorage.setItem("zkvote.voterRegistrations", ${JSON.stringify(JSON.stringify([
      {
        id: "registration-fixture",
        userId: "seeded-voter",
        electionId: registryFixture.selectedElectionId,
        status: "APPROVED",
        identityCommitment: registryFixture.selectedIdentityCommitment,
        commitmentScheme: "FIXTURE_POSEIDON",
        createdAt: "2026-06-22T00:00:00.000Z",
        reviewedAt: "2026-06-22T00:01:00.000Z",
      },
      {
        id: "registration-poseidon",
        userId: "new-voter",
        electionId: registryFixture.selectedElectionId,
        status: "APPROVED",
        identityCommitment: "123456789987654321",
        commitmentScheme: "POSEIDON",
        createdAt: "2026-06-22T00:00:00.000Z",
        reviewedAt: "2026-06-22T00:01:00.000Z",
      },
      {
        id: "registration-old-sha",
        userId: "old-voter",
        electionId: registryFixture.selectedElectionId,
        status: "APPROVED",
        identityCommitment: "abcdef123456",
        createdAt: "2026-06-22T00:00:00.000Z",
        reviewedAt: "2026-06-22T00:01:00.000Z",
      },
    ]))});
    true;
  `);

  const navigation = client.waitForEvent("Page.loadEventFired");
  await client.send("Page.navigate", { url: `${appUrl}/admin` });
  await navigation;
  await waitForExpression(client, `document.body.innerText.includes("Registry Preview")`);
  await waitForExpression(client, `document.body.innerText.includes("Poseidon preview-only root")`);

  const runtimeLoadError = await client.evaluate(
    `document.body.innerText.includes("Poseidon registry preview failed to load in browser runtime.")`,
  );

  if (runtimeLoadError) {
    throw new Error("Admin Registry Preview showed a Poseidon runtime load error.");
  }

  await waitForExpression(client, `
    [...document.querySelectorAll("button")].some((candidate) =>
      candidate.textContent.includes("Refresh preview") && !candidate.disabled
    )
  `);
  await client.evaluate(`
    (() => {
      const button = [...document.querySelectorAll("button")].find((candidate) =>
        candidate.textContent.includes("Refresh preview")
      );
      button.click();
      return true;
    })()
  `);
  await waitForExpression(client, `
    [...document.querySelectorAll("button")].some((candidate) =>
      candidate.textContent.includes("Refresh preview") && !candidate.disabled
    ) && document.body.innerText.includes("Poseidon preview-only root")
  `);

  const refreshRuntimeLoadError = await client.evaluate(
    `document.body.innerText.includes("Poseidon registry preview failed to load in browser runtime.")`,
  );

  if (refreshRuntimeLoadError) {
    throw new Error("Refresh preview showed a Poseidon runtime load error.");
  }

  await client.evaluate(`
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__registryPreviewCopiedText = text;
        }
      }
    });
    true;
  `);

  await client.evaluate(`
    (() => {
      const button = [...document.querySelectorAll("button")].find((candidate) =>
        candidate.textContent.includes("Run runtime check")
      );
      button.click();
      return true;
    })()
  `);
  await waitForExpression(client, `document.body.innerText.includes("Runtime check passed")`, 20_000);

  await client.evaluate(`
    (() => {
      const button = [...document.querySelectorAll("button")].find((candidate) =>
        candidate.textContent.includes("Copy registry preview JSON")
      );
      button.click();
      return true;
    })()
  `);
  await waitForExpression(client, `Boolean(window.__registryPreviewCopiedText)`);

  const copiedText = await client.evaluate("window.__registryPreviewCopiedText");
  const copiedJson = JSON.parse(copiedText);
  const copiedFieldNames = collectJsonFieldNames(copiedJson);
  const forbiddenFieldName = copiedFieldNames.find((fieldName) =>
    FORBIDDEN_PRIVATE_FIELD_PARTS.some((forbiddenPart) => fieldName.includes(forbiddenPart)),
  );

  if (forbiddenFieldName) {
    throw new Error(`Copied registry preview JSON contains forbidden field name: ${forbiddenFieldName}.`);
  }

  await client.evaluate(`
    (() => {
      const button = [...document.querySelectorAll("button")].find((candidate) =>
        candidate.textContent.includes("Download registry preview JSON")
      );
      button.click();
      return true;
    })()
  `);
  await waitForExpression(client, `document.body.innerText.includes("Registry preview JSON download prepared.")`);

  const summary = {
    passed: true,
    appUrl,
    compatibleLeafCount: copiedJson.compatibleLeafCount,
    incompatibleLeafCount: copiedJson.incompatibleLeafCount,
    copiedJsonPrivateFieldCheck: "passed",
    runtimeCheckTextVisible: true,
  };

  console.log(JSON.stringify(summary, null, 2));
} finally {
  client?.close();
  await stopProcess(chrome);
  await server.close();
  await removeWithRetry(userDataDir);
}
