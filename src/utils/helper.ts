import { PermissionTypeEnum } from "../modules/masters/interface/masters.enum";

// Production check
export const isProduction = process.env.NODE_ENV === "production";

// Function to check if permissionType is in the permissions array and is active
export const userHasPermission = (
  permissions: { type: PermissionTypeEnum; status: boolean }[],
  permissionType: PermissionTypeEnum | PermissionTypeEnum[]
): boolean => {
  // Ensure permissionType is treated as an array
  const permissionTypes = Array.isArray(permissionType)
    ? permissionType
    : [permissionType];

  return permissions.some(
    (permission) =>
      permissionTypes.includes(permission.type) && permission.status
  );
};

// Function to parse the user agent to get device details
export const parseUserAgent = (userAgent: string) => {
  // Define regex patterns to match device types and operating systems
  const deviceTypePatterns = {
    mobile: /Mobi|Android/i,
    tablet: /Tablet|iPad/i,
    desktop: /Win|Mac|Linux|X11/i,
  };

  const osPatterns = {
    Windows: /Windows NT (\d+\.\d+)/,
    macOS: /Mac OS X (\d+[\._]\d+)/,
    iOS: /iPhone OS (\d+[\._]\d+)/,
    Android: /Android (\d+\.\d+)/,
    Linux: /Linux/,
  };

  const browserPatterns = {
    Edge: /Edg\/(\d+\.\d+)/,
    Chrome: /Chrome\/(\d+\.\d+)/,
    Firefox: /Firefox\/(\d+\.\d+)/,
    Safari: /Version\/(\d+\.\d+).*Safari/,
    IE: /MSIE (\d+\.\d+);|Trident.*rv:(\d+\.\d+)/,
  };

  let deviceType = "unknown";
  for (const [type, pattern] of Object.entries(deviceTypePatterns)) {
    if (pattern.test(userAgent)) {
      deviceType = type;
      break;
    }
  }

  let deviceOS = "unknown";
  for (const [os, pattern] of Object.entries(osPatterns)) {
    const match = userAgent.match(pattern);
    if (match) {
      deviceOS = match[1] ? `${os} ${match[1].replace("_", ".")}` : os;
      break;
    }
  }

  let browserName = "unknown";
  for (const [browser, pattern] of Object.entries(browserPatterns)) {
    const match = userAgent.match(pattern);
    if (match) {
      browserName = match[1] ? `${browser} ${match[1]}` : browser;
      break;
    }
  }
  return { deviceType, deviceOS, browserName };
};

// Function to mask EIN number
export const maskEIN = (ein: string) => {
  return ein.replace(/\d{4}$/, "**");
};

// Function to mask user email
export const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  return local.replace(/.(?=.{3})/g, "*") + "@" + domain;
};

// Function to mask user number
export const maskPhone = (phone: string) => {
  return phone.replace(/\d(?=\d{4})/g, "*");
};
