import { Alert, Linking } from 'react-native';
import {
  ABOUT_URL,
  COMMUNITY_STANDARDS_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
  TERMS_URL,
  emailSupport,
  openAbout,
  openCommunityStandards,
  openPrivacyPolicy,
  openSupport,
  openTerms,
} from '../legalLinks';

const EMAIL_SUPPORT_URL = 'mailto:support@myskoolclub.com?subject=My%20Skool%20Club%20Support';

describe('legal links', () => {
  let alertSpy;
  let openUrlSpy;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it.each([
    ['privacy policy', openPrivacyPolicy, PRIVACY_POLICY_URL],
    ['terms', openTerms, TERMS_URL],
    ['community standards', openCommunityStandards, COMMUNITY_STANDARDS_URL],
    ['support', openSupport, SUPPORT_URL],
    ['about', openAbout, ABOUT_URL],
    ['support email', emailSupport, EMAIL_SUPPORT_URL],
  ])('opens the %s URL', async (_label, open, url) => {
    await open();

    expect(openUrlSpy).toHaveBeenCalledWith(url);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['Privacy Policy', openPrivacyPolicy, PRIVACY_POLICY_URL],
    ['Terms of Service', openTerms, TERMS_URL],
    ['Community Standards', openCommunityStandards, COMMUNITY_STANDARDS_URL],
    ['Support', openSupport, SUPPORT_URL],
    ['About My Skool Club', openAbout, ABOUT_URL],
    ['Email', emailSupport, EMAIL_SUPPORT_URL],
  ])('shows a usable fallback when %s cannot be opened', async (label, open, url) => {
    openUrlSpy.mockRejectedValueOnce(new Error('No handler'));

    await open();

    expect(alertSpy).toHaveBeenCalledWith(
      `Unable to Open ${label}`,
      `Please visit ${url} in your browser.`
    );
  });
});
