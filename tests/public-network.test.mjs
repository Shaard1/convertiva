import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile("lib/security/public-network.ts", "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const publicNetwork = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

test("blocks private and special-use IPv4 addresses", () => {
  for (const address of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
  ]) {
    assert.equal(publicNetwork.isBlockedNetworkAddress(address), true, address);
  }
});

test("allows globally routable IP addresses", () => {
  assert.equal(publicNetwork.isBlockedNetworkAddress("8.8.8.8"), false);
  assert.equal(
    publicNetwork.isBlockedNetworkAddress("2606:4700:4700::1111"),
    false,
  );
});

test("blocks private IPv6 and IPv4-mapped IPv6 addresses", () => {
  for (const address of [
    "::",
    "::1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "::ffff:c0a8:101",
  ]) {
    assert.equal(publicNetwork.isBlockedNetworkAddress(address), true, address);
  }
});

test("rejects non-HTTP URLs and embedded credentials", () => {
  assert.throws(
    () => publicNetwork.parsePublicHttpUrl("file:///etc/passwd"),
    /Only HTTP and HTTPS/,
  );
  assert.throws(
    () => publicNetwork.parsePublicHttpUrl("https://user:pass@example.com"),
    /cannot include usernames or passwords/,
  );
});

test("normalizes unusual IPv4 URL representations before validation", async () => {
  await assert.rejects(
    () => publicNetwork.validatePublicHttpUrl("http://2130706433"),
    /Local and private network addresses/,
  );
});
