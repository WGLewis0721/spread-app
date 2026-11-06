import { test, expect } from '../fixtures.js';
import path from 'node:path';
test.use({viewport:{width:1440,height:1100},isMobile:false,hasTouch:false,deviceScaleFactor:1});
test('desktop viewer fits a real phone viewport and preserves interactive navigation',async({page},testInfo)=>{
  await page.goto('/iphone');
  await expect(page.getByRole('heading',{name:'The same calm. A closer connection.'})).toBeVisible();
  const phone=page.frameLocator('iframe[title="Interactive Spread iPhone prototype"]');
  await expect(phone.getByRole('heading',{name:'Life',exact:true})).toBeVisible();
  expect(await phone.locator('body').evaluate(()=>innerWidth)).toBe(390);
  const box=await page.locator('.ip-device-space').boundingBox();expect(box.y+box.height).toBeLessThan(1100);
  if(testInfo.project.name==='Chrome iPhone')await page.screenshot({path:path.resolve('screenshots/iphone/desktop-iphone-viewer.png'),animations:'disabled'});
  await page.getByLabel('Phone size').selectOption('2');await expect.poll(()=>phone.locator('body').evaluate(()=>innerWidth)).toBe(430);
  await phone.getByRole('button',{name:'Open navigation',exact:true}).click();await phone.getByRole('button',{name:'Hours',exact:true}).click();await expect(phone.getByRole('heading',{name:'Your hours',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Dark',exact:true}).click();await expect(phone.locator('.ip-app')).toHaveAttribute('data-theme','dark');
  await expect(page.getByRole('link',{name:'Open desktop prototype',exact:true})).toHaveAttribute('href','/');
});
