import { app } from 'electron';

const REMOVE_CHROME_COMPONENT_PATTERNS = [
  /^https:\/\/accounts\.google\.com(\/|$)/,
];

const CHROME_COMPONENT_PATTERN = / Chrome\\?.([^\s]+)/g;

const COMPONENTS_TO_REMOVE = [
  / Electron\\?.([^\s]+)/g,
  ` ${app.name}/${app.getVersion()}`,
];

const getChromeVersion = () => {
  const chromeVersion = process.versions.chrome;
  const versionParts = chromeVersion.split('.');

  return ` Chrome/${versionParts[0]}.${versionParts[1]}.${versionParts[2]}.${versionParts[3]}`;
};

const COMPONENTS_TO_REPLACE: [string | RegExp, string][] = [
  [CHROME_COMPONENT_PATTERN, getChromeVersion()],
];

const urlMatchesPatterns = (url: string, patterns: RegExp[]) =>
  patterns.some((pattern) => url.match(pattern));

/**
 * Checks if a given url is suitable for removal of Chrome
 * component from the user agent string.
 * @param url
 */
const shouldRemoveChromeString = (url: string) =>
  urlMatchesPatterns(url, REMOVE_CHROME_COMPONENT_PATTERNS);

export const getUserAgentForURL = (userAgent: string, url: string) => {
  let componentsToRemove = [...COMPONENTS_TO_REMOVE];

  if (shouldRemoveChromeString(url)) {
    componentsToRemove = [...componentsToRemove, CHROME_COMPONENT_PATTERN];
  }

  [
    ...componentsToRemove.map((x): [string | RegExp, string] => [x, '']),
    ...COMPONENTS_TO_REPLACE,
  ].forEach((x) => (userAgent = userAgent.replace(x[0], x[1])));

  return userAgent;
};
