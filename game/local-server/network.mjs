import {networkInterfaces} from 'node:os';

// On this Mac, en* are the physical Wi-Fi/Ethernet adapters. Do not expose the
// game on VPN/tunnel adapters, public addresses or every interface (0.0.0.0).
export function lanAddresses(interfaces=networkInterfaces()) {
  return [...new Set(Object.entries(interfaces).flatMap(([name,addresses])=>
    /^en\d+$/.test(name)?(addresses??[]).filter(a=>
      !a.internal&&a.family==='IPv4'&&
      /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(a.address)
    ).map(a=>a.address):[]
  ))];
}
