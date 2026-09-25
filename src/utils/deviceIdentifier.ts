/**
 * Device & Hardware Identifier Service
 * 
 * Provides deterministic hardware device fingerprinting (CPU core count, GPU renderer & vendor,
 * screen resolution, audio engine hardware signature, persistent machine node UUID) formatted as
 * a standard Hardware MAC Identifier (e.g. "E4:5F:01:8A:2C:9D") or CPU/Hardware ID ("HWID-XXXX-XXXX-XXXX").
 * 
 * Also supports manual physical MAC Address or CPU Processor ID entry (e.g., from Windows `getmac`
 * or `wmic cpu get processorid` command).
 */

export interface DeviceHardwareInfo {
  hardwareId: string;        // Full unique Hardware Identifier (e.g. HWID-CPU8-GPU-XXXX...)
  macAddress: string;        // Standard MAC address format (e.g. E4:5F:01:8A:2C:9D)
  hardwareHash?: string;     // Unique hardware hash string
  osPlatform?: string;       // OS platform name
  cpuCores: number;          // Logical CPU core count
  gpuRenderer: string;       // WebGL GPU driver/renderer string
  gpuVendor: string;         // WebGL GPU vendor
  screenResolution: string;  // e.g. 1920x1080 @ 24-bit
  platform: string;          // e.g. Win32, Linux x86_64, MacIntel
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet';
  isPhysicalMacOverridden?: boolean;
}

const HARDWARE_STORAGE_KEY = 'sayonika_pc_hardware_id_v2';
const MANUAL_MAC_STORAGE_KEY = 'sayonika_manual_pc_mac_override_v2';

/**
 * Generate a fast 32-bit FNV-1a or murmur-style hash string
 */
function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Convert a number to 2 hex characters uppercase
 */
function toHexByte(n: number): string {
  return (n & 0xff).toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Generate a standard 6-byte hexadecimal MAC address format from hashes
 * Format: XX:XX:XX:XX:XX:XX
 */
function formatAsMacAddress(hash1: number, hash2: number, hash3: number): string {
  const b1 = (hash1 >>> 24) & 0xfe | 0x02; // Locally administered unicast bit
  const b2 = (hash1 >>> 16) & 0xff;
  const b3 = (hash1 >>> 8) & 0xff;
  const b4 = (hash2 >>> 16) & 0xff;
  const b5 = (hash2 >>> 8) & 0xff;
  const b6 = (hash3 >>> 8) & 0xff;
  return `${toHexByte(b1)}:${toHexByte(b2)}:${toHexByte(b3)}:${toHexByte(b4)}:${toHexByte(b5)}:${toHexByte(b6)}`;
}

/**
 * Retrieve WebGL unmasked GPU vendor & renderer
 */
function getGpuHardwareDetails(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) {
      return { vendor: 'Generic Vendor', renderer: 'Standard Graphics Adapter' };
    }
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return { 
        vendor: gl.getParameter(gl.VENDOR) || 'Standard Vendor', 
        renderer: gl.getParameter(gl.RENDERER) || 'Standard Renderer' 
      };
    }
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Generic GPU';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Generic Adapter';
    return { vendor: String(vendor).trim(), renderer: String(renderer).trim() };
  } catch {
    return { vendor: 'Unknown GPU Vendor', renderer: 'Direct3D / OpenGL Graphics' };
  }
}

/**
 * Get or create persistent persistent machine UUID in localStorage
 */
function getPersistentMachineSeed(): string {
  try {
    let seed = localStorage.getItem(HARDWARE_STORAGE_KEY);
    if (!seed || seed.length < 16) {
      // Create cryptographically random 128-bit machine seed
      const array = new Uint8Array(16);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
      } else {
        for (let i = 0; i < 16; i++) array[i] = Math.floor(Math.random() * 256);
      }
      seed = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(HARDWARE_STORAGE_KEY, seed);
    }
    return seed;
  } catch {
    return 'fallback_device_seed_' + Math.random().toString(36).substring(2);
  }
}

/**
 * Clean & standardize MAC address format (converts hyphens or no delimiters to XX:XX:XX:XX:XX:XX)
 */
export function normalizeMacAddress(rawMac: string): string {
  if (!rawMac) return '';
  const clean = rawMac.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
  if (clean.length === 12) {
    const parts = clean.match(/.{1,2}/g);
    return parts ? parts.join(':') : clean;
  }
  return rawMac.trim().toUpperCase();
}

/**
 * Validate whether an identifier is formatted as a valid MAC address
 */
export function isValidMacAddress(mac: string): boolean {
  const norm = normalizeMacAddress(mac);
  return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(norm);
}

/**
 * Set a manual Physical MAC Address or CPU ID override for this machine
 * (Useful when Xerox shop operator knows their Windows physical MAC from `getmac`)
 */
export function setManualMacOverride(macOrCpuId: string): void {
  try {
    const trimmed = macOrCpuId.trim().toUpperCase();
    if (!trimmed) {
      localStorage.removeItem(MANUAL_MAC_STORAGE_KEY);
    } else {
      localStorage.setItem(MANUAL_MAC_STORAGE_KEY, trimmed);
    }
  } catch {}
}

/**
 * Get manual Physical MAC Address override if set
 */
export function getManualMacOverride(): string | null {
  try {
    return localStorage.getItem(MANUAL_MAC_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Inspect physical and browser hardware signals to generate the complete DeviceHardwareInfo
 */
export async function getDeviceHardwareInfo(): Promise<DeviceHardwareInfo> {
  const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || 'PC') : 'PC';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  const deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet' = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  const screenWidth = typeof window !== 'undefined' ? window.screen.width : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.screen.height : 1080;
  const colorDepth = typeof window !== 'undefined' ? window.screen.colorDepth : 24;
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const screenResolution = `${screenWidth}x${screenHeight} @ ${colorDepth}bpp (scale ${pixelRatio}x)`;

  const gpu = getGpuHardwareDetails();
  const machineSeed = getPersistentMachineSeed();

  // Compute multi-layer hardware hashes
  const h1 = hashString(`CPU:${cpuCores}|PLAT:${platform}|RES:${screenResolution}`);
  const h2 = hashString(`GPU:${gpu.vendor}|${gpu.renderer}|SEED:${machineSeed}`);
  const h3 = hashString(`SEED_REV:${machineSeed.split('').reverse().join('')}|CORES:${cpuCores}`);

  const computedMac = formatAsMacAddress(h1, h2, h3);
  const hardwareId = `HWID-CPU${cpuCores}-${toHexByte(h1 >>> 16)}${toHexByte(h2 >>> 8)}-${toHexByte(h3 >>> 16)}${toHexByte(h3 >>> 8)}`;
  const hardwareHash = `${toHexByte(h1 >>> 24)}${toHexByte(h1 >>> 16)}${toHexByte(h2 >>> 24)}${toHexByte(h2 >>> 16)}${toHexByte(h3 >>> 24)}${toHexByte(h3 >>> 8)}`;

  // Check if operator set a manual physical MAC address (e.g. from `getmac`)
  const manualMac = getManualMacOverride();
  const effectiveMac = manualMac ? normalizeMacAddress(manualMac) : computedMac;

  return {
    hardwareId: manualMac ? `MANUAL-${effectiveMac}` : hardwareId,
    macAddress: effectiveMac,
    hardwareHash,
    osPlatform: platform,
    cpuCores,
    gpuRenderer: gpu.renderer,
    gpuVendor: gpu.vendor,
    screenResolution,
    platform,
    deviceType,
    isPhysicalMacOverridden: !!manualMac,
  };
}

/**
 * Get primary device hardware identifier string for binding & authentication checks.
 * Uses MAC address as the primary hardware identifier token.
 */
export async function getDetectedHardwareId(): Promise<string> {
  const info = await getDeviceHardwareInfo();
  return info.macAddress;
}

/**
 * Clear manual MAC override and restore native hardware detection
 */
export function clearDeviceHardwareOverride(): void {
  try {
    localStorage.removeItem(MANUAL_MAC_STORAGE_KEY);
  } catch {}
}

/**
 * Re-registers and re-generates the local machine's cryptographic hardware identity token.
 * This completely clears the local seed and creates a new cryptographic seed and hardware MAC token.
 */
export async function reRegisterDeviceHardware(): Promise<DeviceHardwareInfo> {
  try {
    localStorage.removeItem(HARDWARE_STORAGE_KEY);
    localStorage.removeItem(MANUAL_MAC_STORAGE_KEY);
  } catch {}
  return getDeviceHardwareInfo();
}

/**
 * Refresh and re-detect device hardware information.
 * Can optionally regenerate the cryptographic seed or apply/clear a manual physical MAC override.
 */
export async function refreshDeviceHardwareInfo(options?: {
  regenerateSeed?: boolean;
  manualMac?: string;
  clearOverride?: boolean;
}): Promise<DeviceHardwareInfo> {
  if (options?.regenerateSeed) {
    try {
      localStorage.removeItem(HARDWARE_STORAGE_KEY);
    } catch {}
  }
  if (options?.clearOverride) {
    clearDeviceHardwareOverride();
  } else if (options?.manualMac !== undefined) {
    setManualMacOverride(options.manualMac);
  }
  return getDeviceHardwareInfo();
}

/**
 * Windows / Linux command helpers for finding physical MAC & CPU ID
 */
export const HARDWARE_HELP_COMMANDS = {
  windowsGetMac: 'getmac /v',
  windowsCpuId: 'wmic cpu get processorid',
  windowsIpConfig: 'ipconfig /all',
  linuxMac: 'ip link show',
  macOsMac: 'ifconfig en0 | grep ether',
};
