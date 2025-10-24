import styled, { css } from 'styled-components';

import {
  robotoRegular,
  centerVertical,
  robotoMedium,
  centerIcon,
  coloredCursor,
} from '~/renderer/mixins';
import { transparency, EASING_FUNCTION } from '~/renderer/constants';

interface StyledTextfieldProps {
  width?: number;
  dark: boolean;
}
export const StyledTextfield = styled.div.withConfig({
  shouldForwardProp: (p) => !['width', 'dark'].includes(p as string),
})<{ width?: number; dark?: boolean }>`
  ${({ width, dark }: Partial<StyledTextfieldProps>) => css`
    width: ${width === undefined ? 280 : width}px;
    background-color: ${dark ? 'rgba(255, 255, 255, 0.06)' : '#f5f5f5'};
  `}
  position: relative;
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
  overflow: hidden;
  cursor: text;
  user-select: none;
`;

interface InputProps {
  color: string;
  hasLabel: boolean;
  hasIcon: boolean;
  dark: boolean;
}

export const Input = styled.input.withConfig({
  shouldForwardProp: (p) =>
    !['color', 'hasLabel', 'hasIcon', 'dark'].includes(p as string),
})<{ color?: string; hasLabel?: boolean; hasIcon?: boolean; dark?: boolean }>`
  width: 100%;
  height: 55px;
  font-size: 16px;
  padding-left: 12px;
  border: none;
  outline: none;
  background-color: transparent;
  user-select: auto;
  ${robotoRegular()};

  ${({ color, hasLabel, hasIcon, dark }: Partial<InputProps>) => css`
    padding-top: ${hasLabel ? 12 : 0}px;
    padding-right: ${hasIcon ? 48 : 12}px;
    ${coloredCursor(color, dark ? 255 : 0)};
    border-bottom: 1px solid
      ${dark ? `rgba(255, 255, 255, 0.12)` : `rgba(0, 0, 0, 0.42)`};

    &::placeholder {
      text-shadow: 0px 0px 0px
        ${dark
          ? `rgba(255, 255, 255, ${transparency.text.medium})`
          : `rgba(0, 0, 0, ${transparency.text.medium})`};
    }
  `}

  &[type='number']::-webkit-inner-spin-button,
  &[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }
`;

interface LabelProps {
  activated: boolean;
  focused: boolean;
  color: string;
  dark: boolean;
}

export const Label = styled.div.withConfig({
  shouldForwardProp: (p) =>
    !['activated', 'focused', 'color', 'dark'].includes(p as string),
})<{ activated?: boolean; focused?: boolean; color?: string; dark?: boolean }>`
  left: 12px;
  position: absolute;
  transition:
    0.2s font-size,
    0.2s color,
    0.2s margin-top;
  transition-timing-function: ${EASING_FUNCTION};
  -webkit-font-smoothing: antialiased;
  ${centerVertical()};

  ${({ activated, focused, color, dark }: Partial<LabelProps>) => css`
    font-size: ${activated ? 12 : 16}px;
    margin-top: ${activated ? -12 : 0}px;
    color: ${focused
      ? color
      : dark
        ? `rgba(255, 255, 255, ${transparency.text.medium})`
        : `rgba(0, 0, 0, ${transparency.text.medium})`};
    ${activated ? robotoMedium() : robotoRegular()};
  `}
`;

export const Indicator = styled.div.withConfig({
  shouldForwardProp: (p) => !['focused', 'color'].includes(p as string),
})<{ focused?: boolean; color?: string }>`
  height: 2px;
  margin-left: auto;
  margin-right: auto;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  transition: 0.2s width ${EASING_FUNCTION};

  ${({ focused, color }: { focused?: boolean; color?: string }) => css`
    width: ${focused ? 100 : 0}%;
    background-color: ${color};
  `}
`;

export const Icon = styled.div.withConfig({
  shouldForwardProp: (p) => !['src', 'dark'].includes(p as string),
})<{ src?: string; dark?: boolean }>`
  width: 36px;
  height: 36px;
  position: absolute;
  right: 8px;
  opacity: ${transparency.icons.inactive};
  border-radius: 100%;
  overflow: hidden;
  cursor: pointer;
  transition: 0.2s background-image;
  ${centerVertical()};
  ${centerIcon(24)};

  ${({ src, dark }: { src?: string; dark?: boolean }) => css`
    background-image: url(${src});
    filter: ${dark ? 'invert(100%)' : 'none'};
  `}

  &:hover {
    background-color: rgba(0, 0, 0, 0.12);
  }
`;
