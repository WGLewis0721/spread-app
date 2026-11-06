import { test, expect } from '../fixtures.js';
import path from 'node:path';
const screenshots=path.resolve('screenshots');
async function navigate(page,name){ const rail=page.locator('.sidebar');if(await rail.isVisible()) await rail.getByRole('button',{name:name==='Responsibilities'?'Life':name,exact:true}).click();else{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:name==='Responsibilities'?'Life':name,exact:true}).click();} }
test.beforeEach(async({page})=>{await page.goto('/');});
test('Wallet selects and collapses cards; details remain a separate field',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.getByRole('heading',{name:'Family this week'})).toBeVisible();
  await page.getByTestId('card-work').click();await expect(page.getByRole('heading',{name:'Work this week'})).toBeVisible();
  await expect(page.getByTestId('card-work')).toHaveAttribute('aria-expanded','true');
  await expect(page.getByTestId('card-work').getByText('Shape the next release')).toHaveCount(0);
  await page.getByTestId('card-work').click();await expect(page.locator('.detail-panel')).toHaveCount(0);
  await page.getByTestId('card-family').click();await expect(page.getByRole('heading',{name:'Family this week'})).toBeVisible();
  await expect(page.locator('.wallet-card')).toHaveCount(4);expect(errors).toEqual([]);
});
test('task edit, add, completion, undo and persistence',async({page})=>{
  await page.getByRole('button',{name:'Edit Dinner together',exact:true}).click();
  await page.screenshot({path:path.join(screenshots,'task-details.png'),animations:'disabled'});
  await page.getByLabel('What would you like to do?').fill('Dinner and a long conversation');
  await page.getByRole('textbox',{name:'Task notes',exact:true}).fill('Bring dessert.');
  await page.getByRole('button',{name:'Save task',exact:true}).click();
  await expect(page.getByRole('button',{name:'Edit Dinner and a long conversation',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Complete Dinner and a long conversation',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reopen Dinner and a long conversation',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(page.getByRole('button',{name:'Complete Dinner and a long conversation',exact:true})).toBeVisible();
  await page.locator('.detail-panel').getByRole('button',{name:'Add task',exact:true}).click();
  await page.getByLabel('What would you like to do?').fill('Pick a board game');await page.getByLabel('Make room on').selectOption('4');
  await page.getByRole('dialog').getByRole('button',{name:'Add task',exact:true}).click();
  await page.reload();await expect(page.getByRole('button',{name:'Edit Pick a board game',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Edit Dinner and a long conversation',exact:true}).click();await expect(page.getByRole('textbox',{name:'Task notes',exact:true})).toHaveText('Bring dessert.');
});
test('hours budget and day reservations update every view, with bank limits',async({page})=>{
  await navigate(page,'Hours');await page.getByRole('button',{name:'Increase Family budget',exact:true}).click();
  await expect(page.getByLabel('Family budget',{exact:true})).toHaveText('6.5h');
  const family=page.locator('.hours-role').filter({has:page.getByRole('heading',{name:'Family',exact:true})});
  await family.locator('summary').click();await page.getByRole('button',{name:'Add half hour Family Thursday',exact:true}).click();
  await expect(family.getByText('4.5h reserved',{exact:true})).toBeVisible();
  await navigate(page,'Responsibilities');await expect(page.getByTestId('card-family')).toContainText('6.5h');await expect(page.locator('.detail-stats')).toContainText('4.5h');
  await navigate(page,'Week');await page.getByRole('button',{name:/^Thursday /}).click();await expect(page.locator('.day-panel').getByRole('heading',{name:'Family',exact:true})).toBeVisible();
});
test('week and day navigation preserve independent planning state; Crown has keyboard control',async({page})=>{
  await navigate(page,'Week');await page.getByRole('button',{name:/^Friday /}).click();await expect(page.getByRole('button',{name:'Edit Dinner together',exact:true})).toBeVisible();
  const old=await page.locator('.week-control h2').innerText();await page.getByRole('button',{name:'Crown next week',exact:true}).click();await expect(page.locator('.week-control h2')).not.toHaveText(old);await expect(page.getByText('A day with room.',{exact:true})).toBeVisible();
  await page.locator('.crown-control').focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('.week-control h2')).toHaveText(old);await expect(page.getByRole('button',{name:'Edit Dinner together',exact:true})).toBeVisible();
});
test('Crown responds to wheel and pointer swipes',async({page})=>{
  const old=await page.locator('.date-line').innerText();
  await page.locator('.crown-control').hover();await page.mouse.wheel(0,100);
  await expect(page.locator('.date-line')).not.toHaveText(old);
  const box=await page.locator('.crown-control').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2,{steps:5});await page.mouse.up();
  await expect(page.locator('.date-line')).toHaveText(old);
});
test('mobile overlay, keyboard close, Crown preference and appearance survive reload',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open navigation',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:path.join(screenshots,'390-navigation.png'),animations:'disabled'});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();
  await navigate(page,'Hours');await expect(page.getByRole('heading',{name:'Your available hours'})).toBeVisible();
  await page.locator('.topbar').getByRole('button',{name:'Preferences',exact:true}).click();await page.getByRole('button',{name:'Left',exact:true}).click();await page.getByRole('button',{name:'Dark',exact:true}).click();await page.keyboard.press('Escape');
  await page.reload();await expect(page.locator('.app')).toHaveAttribute('data-crown','left');await expect(page.locator('html')).toHaveAttribute('data-appearance','dark');
  expect(await page.locator('.crown-dock').evaluate(el=>el.getBoundingClientRect().left)).toBe(20);
  await expect(page.locator('.modal')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('responsive light/dark matrix, reduced motion, assets, console and screenshots',async({page})=>{
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  for(const width of [390,820,1024,1440]){
    await page.setViewportSize({width,height:width===390?844:1100});
    for(const theme of ['light','dark']){
      await page.locator('.topbar').getByRole('button',{name:'Preferences',exact:true}).click();await page.getByRole('button',{name:theme==='light'?'Light':'Dark',exact:true}).click();await page.keyboard.press('Escape');
      for(const view of ['Responsibilities','Hours','Week']){
        await navigate(page,view);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${theme} ${view}`).toBe(true);
        await expect(page.locator('.main-column')).toBeVisible();
        if((width===390||width===1440)&&theme==='light') {
          await page.screenshot({path:path.join(screenshots,`${width}-${theme}-${view.toLowerCase()}.png`),fullPage:true,animations:'disabled'});
          if(width===390&&view==='Responsibilities'){
            await page.locator('.detail-panel').scrollIntoViewIfNeeded();
            await page.screenshot({path:path.join(screenshots,'390-light-details.png'),animations:'disabled'});
          }
        }
      }
      if(width===390&&theme==='dark')await page.screenshot({path:path.join(screenshots,'390-dark-week.png'),fullPage:true,animations:'disabled'});
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});await navigate(page,'Responsibilities');await page.getByTestId('card-work').click();expect(await page.getByTestId('card-work').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
  expect(failed).toEqual([]);expect(errors).toEqual([]);
});
test('task dialog keeps focus, rejects empty names, closes with Escape',async({page})=>{
  await page.locator('.detail-panel').getByRole('button',{name:'Add task',exact:true}).click();await expect(page.getByLabel('What would you like to do?')).toBeFocused();
  await page.getByRole('dialog').getByRole('button',{name:'Add task',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>document.activeElement.closest('dialog')!==null)).toBe(true);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
