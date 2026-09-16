/**
 * server/net.js — 物理 Wi-Fi 局域网地址探测。
 *
 * 严格排除：Tailscale / VPN 虚拟网卡 (utun*, tun*, tap*, tailscale*, ppp*)、
 * Apple 直连接口 (awdl*, llw*, bridge*, anpi*, ap1)、CGNAT 网段 100.*、
 * 链路本地 169.254.*、回环 127.*。优先选取 en0（Mac 上的物理 Wi-Fi）。
 *
 * Author: Claude Code (Claude Opus)
 */

import os from 'node:os';

/** 虚拟 / 非物理接口名前缀黑名单。 */
export const VIRTUAL_IFACE_PATTERN = /^(utun|tun|tap|tailscale|ts\d|wg|ppp|ipsec|awdl|llw|bridge|gif|stf|anpi|ap\d|vmnet|vnic|docker|lo)/i;

/** 需要排除的地址前缀：CGNAT（Tailscale 常用 100.64/10）、链路本地、回环。 */
export function isExcludedAddress(address) {
  if (typeof address !== 'string') return true;
  if (address.startsWith('100.')) return true; // 100.* CGNAT —— Spec 要求严格过滤
  if (address.startsWith('169.254.')) return true;
  if (address.startsWith('127.')) return true;
  if (address === '0.0.0.0') return true;
  return false;
}

export function isVirtualInterface(name) {
  return VIRTUAL_IFACE_PATTERN.test(name);
}

function isIPv4(entry) {
  return entry.family === 'IPv4' || entry.family === 4;
}

/** 私有网段优先级：192.168.* > 10.* > 172.16~31.* > 其他 */
function privateRank(address) {
  if (address.startsWith('192.168.')) return 0;
  if (address.startsWith('10.')) return 1;
  const m = /^172\.(\d+)\./.exec(address);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return 2;
  }
  return 3;
}

/** 接口名优先级：en0 最优先，其次 en1..enN，再次其他物理接口。 */
function ifaceRank(name) {
  if (name === 'en0') return 0;
  const m = /^en(\d+)$/.exec(name);
  if (m) return 1 + Number(m[1]);
  return 50;
}

/**
 * 列出所有可用作局域网访问的候选地址（已排序，最优在前）。
 * @param {Record<string, Array>} [interfaces] 可注入，便于单元测试
 */
export function listLanCandidates(interfaces = os.networkInterfaces()) {
  const candidates = [];
  for (const [name, entries] of Object.entries(interfaces ?? {})) {
    if (!Array.isArray(entries)) continue;
    if (isVirtualInterface(name)) continue;
    for (const entry of entries) {
      if (!entry || !isIPv4(entry)) continue;
      if (entry.internal) continue;
      if (isExcludedAddress(entry.address)) continue;
      candidates.push({ name, address: entry.address, netmask: entry.netmask });
    }
  }
  candidates.sort((a, b) => (
    ifaceRank(a.name) - ifaceRank(b.name)
    || privateRank(a.address) - privateRank(b.address)
    || a.address.localeCompare(b.address)
  ));
  return candidates;
}

/**
 * 选出最佳的物理 Wi-Fi 局域网地址。
 * @returns {{name:string,address:string}|null}
 */
export function pickLanAddress(interfaces = os.networkInterfaces()) {
  return listLanCandidates(interfaces)[0] ?? null;
}

/** 生成 iPad Safari 可直接访问的地址。 */
export function buildLanUrl(port, interfaces = os.networkInterfaces()) {
  const lan = pickLanAddress(interfaces);
  const host = lan ? lan.address : '127.0.0.1';
  return { url: `http://${host}:${port}/`, host, iface: lan ? lan.name : 'loopback', lan };
}

/** 诊断信息：列出全部接口并标注被过滤的原因（终端排障用）。 */
export function diagnoseInterfaces(interfaces = os.networkInterfaces()) {
  const rows = [];
  for (const [name, entries] of Object.entries(interfaces ?? {})) {
    for (const entry of entries ?? []) {
      if (!entry || !isIPv4(entry)) continue;
      let verdict = 'ok';
      if (isVirtualInterface(name)) verdict = '虚拟接口(已过滤)';
      else if (entry.internal) verdict = '内部回环(已过滤)';
      else if (isExcludedAddress(entry.address)) verdict = entry.address.startsWith('100.') ? 'CGNAT 100.*(已过滤)' : '保留地址(已过滤)';
      rows.push({ name, address: entry.address, verdict });
    }
  }
  return rows;
}
