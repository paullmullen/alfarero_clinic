import assert from "node:assert/strict";
import test from "node:test";
import {
  createGenerateScannerCloudQrHandler,
  scannerQrCorsHandler,
} from "./generateScannerCloudQr.js";

const ID_TOKEN = "fake-firebase-id-token";
const ADMIN_TOKEN = "fake-qr-admin-token";
const SHARED_SECRET = "fake-shared-secret";
const WIFI_PASSWORD = "fake-wifi-password";
const ENDPOINT_URL = "https://example.invalid/receiveRoomScanEvent";

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
    end(value) {
      this.ended = true;
      this.body = value;
    },
  };
}

function makeRequest({ authorization, body = {}, origin } = {}) {
  return {
    method: "POST",
    headers: {
      ...(authorization === undefined ? {} : { authorization }),
      ...(origin ? { origin } : {}),
    },
    body,
  };
}

function makeHandler({
  settings = true,
  verifyIdToken,
  getAdminToken,
  getSharedSecret,
  logger,
} = {}) {
  return createGenerateScannerCloudQrHandler({
    verifyIdToken:
      verifyIdToken ||
      (async (token) => {
        assert.equal(token, ID_TOKEN);
        return { uid: "fake-user-id" };
      }),
    findUserByAuthUid: async () => ({
      uid: "fake-user-id",
      permissions: { settings },
    }),
    getAdminToken: getAdminToken || (() => ADMIN_TOKEN),
    getSharedSecret: getSharedSecret || (() => SHARED_SECRET),
    endpointUrl: ENDPOINT_URL,
    logger,
  });
}

function qrPayload(response) {
  assert.equal(response.body.ok, true);
  assert.match(response.body.qrValue, /^MMCFG:/);
  return JSON.parse(response.body.qrValue.slice("MMCFG:".length));
}

test("missing Authorization header returns 401", async () => {
  const response = makeResponse();
  await makeHandler()(makeRequest(), response);
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { ok: false, error: "Unauthorized" });
});

test("malformed Authorization header returns 401", async () => {
  const response = makeResponse();
  await makeHandler()(makeRequest({ authorization: "Basic fake" }), response);
  assert.equal(response.statusCode, 401);
});

test("invalid Firebase ID token returns 401", async () => {
  const response = makeResponse();
  await makeHandler({
    verifyIdToken: async () => {
      throw new Error("fake token rejected");
    },
  })(makeRequest({ authorization: "Bearer invalid-id-token" }), response);
  assert.equal(response.statusCode, 401);
  assert.equal(JSON.stringify(response.body).includes("fake token"), false);
});

test("authenticated user without settings permission returns 403", async () => {
  const response = makeResponse();
  await makeHandler({ settings: false })(
    makeRequest({ authorization: `Bearer ${ID_TOKEN}` }),
    response,
  );
  assert.equal(response.statusCode, 403);
});

test("authenticated settings user can generate cloud QR", async () => {
  const response = makeResponse();
  await makeHandler()(
    makeRequest({ authorization: `Bearer ${ID_TOKEN}` }),
    response,
  );
  const payload = qrPayload(response);
  assert.equal(payload.kind, "cloud_config");
  assert.equal(payload.version, 1);
  assert.equal(payload.payload.endpoint_url, ENDPOINT_URL);
  assert.equal(payload.payload.shared_secret, SHARED_SECRET);
  assert.equal(payload.auth.admin_token, ADMIN_TOKEN);
});

test("cloud QR rejects an invalid server-owned endpoint", async () => {
  const response = makeResponse();
  const handler = createGenerateScannerCloudQrHandler({
    verifyIdToken: async () => ({ uid: "fake-user-id" }),
    findUserByAuthUid: async () => ({ permissions: { settings: true } }),
    getAdminToken: () => ADMIN_TOKEN,
    getSharedSecret: () => SHARED_SECRET,
    endpointUrl: "http://insecure.invalid/receiveRoomScanEvent",
  });
  await handler(makeRequest({ authorization: `Bearer ${ID_TOKEN}` }), response);
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: "QR generation unavailable",
  });
});

test("station QR validates fields and adds only admin_token", async () => {
  const response = makeResponse();
  await makeHandler()(
    makeRequest({
      authorization: `Bearer ${ID_TOKEN}`,
      body: {
        kind: "station_config",
        location_id: "fake-location",
        room_id: "fake-room",
        station_id: "fake-station",
        device_id: "fake-device",
      },
    }),
    response,
  );
  const payload = qrPayload(response);
  assert.deepEqual(payload.payload, {
    location_id: "fake-location",
    room_id: "fake-room",
    station_id: "fake-station",
    device_id: "fake-device",
  });
  assert.deepEqual(payload.auth, { admin_token: ADMIN_TOKEN });
  assert.equal(Object.hasOwn(payload.payload, "shared_secret"), false);
});

test("wifi QR validates fields and adds only admin_token", async () => {
  let sharedSecretReads = 0;
  const response = makeResponse();
  await makeHandler({
    getSharedSecret: () => {
      sharedSecretReads += 1;
      return SHARED_SECRET;
    },
  })(
    makeRequest({
      authorization: `Bearer ${ID_TOKEN}`,
      body: {
        kind: "wifi_config",
        ssid: "fake-network",
        password: WIFI_PASSWORD,
        security: "wpa-psk",
      },
    }),
    response,
  );
  const payload = qrPayload(response);
  assert.deepEqual(payload.payload, {
    ssid: "fake-network",
    password: WIFI_PASSWORD,
    security: "wpa-psk",
  });
  assert.deepEqual(payload.auth, { admin_token: ADMIN_TOKEN });
  assert.equal(sharedSecretReads, 0);
});

test("unknown and show_identity kinds are rejected by the backend", async () => {
  for (const kind of ["unknown_kind", "show_identity"]) {
    const response = makeResponse();
    await makeHandler()(
      makeRequest({
        authorization: `Bearer ${ID_TOKEN}`,
        body: { kind },
      }),
      response,
    );
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.ok, false);
  }
});

test("protected QR requests validate their fields", async () => {
  const cases = [
    {
      kind: "station_config",
      body: { kind: "station_config", location_id: "x" },
    },
    { kind: "wifi_config", body: { kind: "wifi_config", ssid: "x" } },
  ];
  for (const item of cases) {
    const response = makeResponse();
    await makeHandler()(
      makeRequest({
        authorization: `Bearer ${ID_TOKEN}`,
        body: item.body,
      }),
      response,
    );
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.ok, false);
  }
});

test("missing Secret Manager values fail safely", async () => {
  for (const options of [
    { getAdminToken: () => null, body: { kind: "station_config" } },
    {
      getSharedSecret: () => null,
      body: { kind: "cloud_config" },
    },
  ]) {
    const response = makeResponse();
    await makeHandler(options)(
      makeRequest({
        authorization: `Bearer ${ID_TOKEN}`,
        body: options.body,
      }),
      response,
    );
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, {
      ok: false,
      error: "QR generation unavailable",
    });
  }
});

test("secret-provider failures do not log or return secret-bearing data", async () => {
  const logs = [];
  const response = makeResponse();
  await makeHandler({
    getAdminToken: () => {
      throw new Error(`${ADMIN_TOKEN} ${WIFI_PASSWORD}`);
    },
    logger: (...args) => logs.push(args.join(" ")),
  })(makeRequest({ authorization: `Bearer ${ID_TOKEN}` }), response);
  const output = JSON.stringify({ response: response.body, logs });
  assert.equal(response.statusCode, 500);
  assert.equal(output.includes(ADMIN_TOKEN), false);
  assert.equal(output.includes(WIFI_PASSWORD), false);
  assert.equal(output.includes("QR generation failed"), true);
});

test("direct non-browser calls receive the same authentication checks", async () => {
  const response = makeResponse();
  await makeHandler()(
    makeRequest({ body: { kind: "cloud_config" } }),
    response,
  );
  assert.equal(response.statusCode, 401);
});

test("CORS preflight allows Authorization without invoking generation", async () => {
  const response = makeResponse();
  let invoked = false;
  const request = {
    method: "OPTIONS",
    headers: {
      origin: "http://localhost:3000",
      "access-control-request-method": "POST",
      "access-control-request-headers": "Authorization,Content-Type",
    },
  };

  await new Promise((resolve) => {
    scannerQrCorsHandler(request, response, () => {
      invoked = true;
      resolve();
    });
    setImmediate(resolve);
  });

  assert.equal(invoked, false);
  assert.equal(response.ended, true);
  assert.match(
    String(response.headers["access-control-allow-headers"]),
    /Authorization/i,
  );
});
