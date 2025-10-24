import styled from 'styled-components';

export const WeatherWrap = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 999; /* ensure above bg */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  cursor: pointer;
  font-size: 18px;
  backdrop-filter: blur(6px);
  background: rgba(255, 255, 255, 0.15);
  color: inherit;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition:
    transform 0.08s ease,
    box-shadow 0.08s ease,
    background 0.2s ease;
  .emoji {
    font-size: 20px;
    line-height: 1;
  }
  .temp {
    font-weight: 700;
    font-size: 18px;
  }
  .caret {
    opacity: 0.8;
    font-size: 14px;
  }
  .retry {
    margin-left: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    border: none;
    background: rgba(0, 0, 0, 0.25);
    color: #fff;
  }
  &:hover,
  &:focus-visible {
    outline: none;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
    background: rgba(255, 255, 255, 0.22);
  }
`;

export const ForecastPanel = styled.div`
  position: fixed;
  top: 68px;
  left: 20px;
  z-index: 999;
  width: 280px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);

  .row {
    display: grid;
    grid-template-columns: 1fr 40px 1fr;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  .row:last-child {
    border-bottom: none;
  }

  .day {
    opacity: 0.9;
    font-size: 14px;
  }
  .icon {
    text-align: center;
    font-size: 18px;
  }
  .temps {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    font-size: 14px;
  }
  .max {
    font-weight: 700;
  }
  .min {
    opacity: 0.8;
  }
`;
