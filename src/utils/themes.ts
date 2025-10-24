import { lightTheme, darkTheme } from '~/renderer/constants/themes';

export const getTheme = (name: string) => {
  if (name === 'syra-light') return lightTheme;
  else if (name === 'syra-dark') return darkTheme;
  return lightTheme;
};
