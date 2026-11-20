/**
 * The signed-in user. Finance Quest runs inside the banking app, which owns login;
 * in the real app this id comes from the host app's session. For the prototype it is
 * fixed, or set per device with EXPO_PUBLIC_USER_ID in front/.env.
 */
export const USER_ID = process.env.EXPO_PUBLIC_USER_ID || 'demo-user';
