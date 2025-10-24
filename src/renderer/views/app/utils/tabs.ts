import { animate, utils } from 'animejs';
import { TAB_ANIMATION_DURATION } from '../constants';

export const animateTab = (
  property: 'translateX' | 'width',
  value: number,
  domElement: any,
  animation: boolean,
) => {
  if (animation) {
    animate(domElement, {
      [property]: value,
      duration: TAB_ANIMATION_DURATION,
      easing: 'easeOutCirc',
    });
  } else {
    utils.set(domElement, {
      [property]: value,
    });
  }
};
