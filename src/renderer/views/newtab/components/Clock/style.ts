import styled from 'styled-components';

export const ClockWrap = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 48px;
  margin-bottom: 16px;
  .time {
    font-size: 64px;
    line-height: 1;
    font-weight: 600;
    letter-spacing: 1px;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }
`;
