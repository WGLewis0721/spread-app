import {test as base,expect} from '@playwright/test';

// Freeze wall-clock dates, while allowing timers, gestures and animation frames to run.
// The approved screenshots show the week of November 2, 2026.
export const test=base.extend({
  page:async({page},use)=>{
    await page.clock.setFixedTime(new Date('2026-11-06T12:00:00-06:00'));
    await use(page);
  },
});
export {expect};
