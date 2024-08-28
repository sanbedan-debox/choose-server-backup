export function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const getServerUrl = () => {
  const appUrl = process.env.APP_URL ?? "";
  if (appUrl === "http://localhost:3000") {
    return "http://localhost:4000";
  } else {
    return "https://api.choosepos.com";
  }
};
