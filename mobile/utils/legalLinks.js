import { Alert, Linking } from 'react-native';

export const PRIVACY_POLICY_URL = 'https://myskoolclub.com/privacy';
export const TERMS_URL = 'https://myskoolclub.com/terms';
export const COMMUNITY_STANDARDS_URL = 'https://myskoolclub.com/community-standards';
export const SUPPORT_URL = 'https://myskoolclub.com/support';
export const ABOUT_URL = 'https://myskoolclub.com/about';

export async function openPrivacyPolicy() {
  try {
    await Linking.openURL(PRIVACY_POLICY_URL);
  } catch {
    Alert.alert(
      'Unable to Open Privacy Policy',
      `Please visit ${PRIVACY_POLICY_URL} in your browser.`
    );
  }
}

async function openLegalUrl(url, label) {
  try { await Linking.openURL(url); }
  catch { Alert.alert(`Unable to Open ${label}`, `Please visit ${url} in your browser.`); }
}

export const openTerms = () => openLegalUrl(TERMS_URL, 'Terms of Service');
export const openCommunityStandards = () => openLegalUrl(COMMUNITY_STANDARDS_URL, 'Community Standards');
export const openSupport = () => openLegalUrl(SUPPORT_URL, 'Support');
export const openAbout = () => openLegalUrl(ABOUT_URL, 'About My Skool Club');
export const emailSupport = () => openLegalUrl('mailto:support@myskoolclub.com?subject=My%20Skool%20Club%20Support', 'Email');
