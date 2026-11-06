import { test, expect } from '../fixtures.js';
import path from 'node:path';
const screenshotRoot=path.resolve('screenshots/iphone');
async function nav(page,view){await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('dialog',{name:'Navigate Spread'}).getByRole('button',{name:view==='Responsibilities'?'Life':view,exact:true}).click();}
async function preferences(page){await page.getByRole('button',{name:'Preferences',exact:true}).click();}
test.beforeEach(async({page})=>{await page.goto('/iphone/app');await page.getByTestId('ip-card-family').tap();});
test('compact stack reveals an independent, readable field; taps remain reachable',async({page})=>{
  await expect(page.getByRole('heading',{name:'Life',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Family this week',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'All Life areas',exact:false}).tap();await page.getByTestId('ip-card-work').tap();await expect(page.getByRole('heading',{name:'Work this week',exact:true})).toBeVisible();
  await page.getByTestId('ip-card-work').tap();await expect(page.locator('.ip-detail-field')).toBeHidden();
  await page.getByTestId('ip-card-family').tap();
  await expect(page.getByTestId('ip-card-family')).toHaveAttribute('aria-expanded','true');
  await expect(page.getByTestId('ip-card-family').getByText('Dinner together')).toHaveCount(0);
  const field=await page.locator('.ip-detail-field').boundingBox(),card=await page.getByTestId('ip-card-family').boundingBox();expect(field.y).toBeGreaterThan(card.y+card.height);
  const heading=await page.locator('.ip-field-heading').boundingBox(),dock=await page.locator('.ip-dock').boundingBox();expect(heading.y).toBeLessThan(dock.y);
});
test('task sheet edits, schedules, persists, completes and undoes',async({page},testInfo)=>{
  await page.getByRole('button',{name:'Open Dinner together',exact:true}).tap();
  if(testInfo.project.name==='WebKit iPhone')await page.screenshot({path:path.join(screenshotRoot,'task-sheet.png'),scale:'css',animations:'disabled'});
  await expect(page.getByRole('dialog')).toBeVisible();await page.getByLabel('Task name',{exact:true}).fill('Dinner and a good conversation');await page.getByLabel('Task notes',{exact:true}).fill('Bring dessert.');
  await page.getByLabel('Task estimate',{exact:true}).selectOption('60');await page.getByLabel('Task day',{exact:true}).selectOption('6');
  await page.getByRole('button',{name:'Save',exact:true}).tap();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();await page.getByTestId('ip-card-family').tap();await page.getByRole('button',{name:'Open Dinner and a good conversation',exact:true}).tap();await expect(page.getByRole('textbox',{name:'Task notes',exact:true})).toHaveText('Bring dessert.');await expect(page.getByLabel('Task day')).toHaveValue('6');await page.getByRole('button',{name:'Cancel',exact:true}).tap();
  await page.getByRole('button',{name:'Complete Dinner and a good conversation',exact:true}).tap();await expect(page.getByRole('button',{name:'Reopen Dinner and a good conversation',exact:true})).toBeVisible();await page.getByRole('button',{name:'Undo',exact:true}).tap();await expect(page.getByRole('button',{name:'Complete Dinner and a good conversation',exact:true})).toBeVisible();
});
test('new task, required name and dirty-dismiss protection',async({page})=>{
  await page.locator('.ip-dock').getByRole('button',{name:'Add task',exact:true}).tap();
  await page.getByRole('button',{name:'Add',exact:true}).tap();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Task name').fill('Choose a board game');await page.getByRole('button',{name:'Cancel',exact:true}).tap();await expect(page.getByRole('alert')).toContainText('Keep your changes');
  await page.getByRole('button',{name:'Keep editing',exact:true}).tap();await page.getByRole('button',{name:'Add',exact:true}).tap();await expect(page.getByRole('button',{name:'Open Choose a board game',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open Choose a board game',exact:true}).tap();await page.getByLabel('Task name').fill('Unsaved draft');await page.getByRole('button',{name:'Cancel',exact:true}).tap();await page.getByRole('button',{name:'Discard changes',exact:true}).tap();await expect(page.getByRole('button',{name:'Open Choose a board game',exact:true})).toBeVisible();
});
test('hour bank and allocation sheet feed the week and cannot overdraw',async({page})=>{
  await nav(page,'Hours');await page.getByRole('button',{name:'Select Family hours',exact:true}).tap();await page.getByRole('button',{name:'Increase Family budget',exact:true}).tap();await expect(page.getByLabel('Family budget',{exact:true})).toHaveText('6.5h');
  await page.getByRole('button',{name:'Place Family hours',exact:true}).tap();await page.getByRole('button',{name:'Add half hour Thursday',exact:true}).tap();await expect(page.locator('.ip-allocation-intro strong')).toHaveText('2h');
  await page.getByRole('button',{name:'Undo',exact:true}).tap();await expect(page.locator('.ip-allocation-intro strong')).toHaveText('2.5h');await page.getByRole('button',{name:'Add half hour Thursday',exact:true}).tap();
  await page.getByRole('button',{name:'Done',exact:true}).tap();await nav(page,'Week');await page.getByRole('button',{name:/^Thursday /}).tap();await expect(page.getByTestId('ip-card-family')).toContainText('0.5h');
  await nav(page,'Hours');await page.getByRole('button',{name:'Select Family hours',exact:true}).tap();await page.getByRole('button',{name:'Place Family hours',exact:true}).tap();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Add half hour Thursday',exact:true}).tap();await expect(page.getByRole('button',{name:'Add half hour Thursday',exact:true})).toBeDisabled();
});
test('day/week/Crown keyboard preserve state; preference and appearance persist',async({page})=>{
  await nav(page,'Week');await page.getByRole('button',{name:/^Friday /}).tap();await page.getByTestId('ip-card-family').tap();await expect(page.getByRole('button',{name:'Open Dinner together',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Next day',exact:true}).tap();await expect(page.locator('.ip-day-heading h2')).toHaveText('Saturday');await page.getByRole('button',{name:'Previous day',exact:true}).tap();
  const label=await page.locator('.ip-header-week').innerText();await page.getByRole('button',{name:'Next week',exact:true}).tap();await expect(page.locator('.ip-header-week')).not.toHaveText(label);await expect(page.getByText('A day with room.',{exact:true})).toBeVisible();
  await page.locator('.ip-crown').focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('.ip-header-week')).toHaveText(label);await page.getByTestId('ip-card-family').tap();await expect(page.getByRole('button',{name:'Open Dinner together',exact:true})).toBeVisible();
  await preferences(page);await page.getByRole('button',{name:'Left',exact:true}).tap();await page.getByRole('button',{name:'Dark',exact:true}).tap();await page.getByRole('button',{name:'Done',exact:true}).tap();await page.reload();await expect(page.locator('.ip-app')).toHaveAttribute('data-theme','dark');await expect(page.locator('.ip-dock')).toHaveAttribute('data-side','left');
  const crown=await page.locator('.ip-crown').boundingBox(),menu=await page.locator('.ip-dock-nav').boundingBox();expect(crown.x).toBeLessThan(menu.x);
});
test('sheet keyboard containment, navigation and motion setting',async({page})=>{
  await page.getByRole('button',{name:'Open Dinner together',exact:true}).tap();await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement.closest('dialog')!==null)).toBe(true);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await preferences(page);await page.getByRole('checkbox',{name:'Reduce motion',exact:true}).check();await page.getByRole('button',{name:'Done',exact:true}).tap();await page.getByRole('button',{name:'All Life areas',exact:false}).tap();await page.getByTestId('ip-card-work').tap();expect(await page.getByTestId('ip-card-work').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
  await page.getByRole('button',{name:'Open navigation',exact:true}).tap();await expect(page.getByRole('dialog',{name:'Navigate Spread'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('Crown swipe changes weeks and the task-sheet grabber dismisses by drag',async({page})=>{
  const before=await page.locator('.ip-header-week').innerText();const crown=await page.locator('.ip-crown').boundingBox();
  await page.mouse.move(crown.x+crown.width/2+20,crown.y+26);await page.mouse.down();await page.mouse.move(crown.x+crown.width/2-30,crown.y+26,{steps:8});await page.mouse.up();await expect(page.locator('.ip-header-week')).not.toHaveText(before);
  await page.getByRole('button',{name:'Previous week',exact:true}).tap();await expect(page.locator('.ip-header-week')).toHaveText(before);
  await page.getByRole('button',{name:'Open Dinner together',exact:true}).tap();await page.locator('.ip-grabber').hover();const handle=await page.locator('.ip-grabber').boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+20);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2,handle.y+125,{steps:10});await page.mouse.up();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('phone sizes, dark/light, larger text, touch targets, console and screenshot matrix',async({page},testInfo)=>{
  test.setTimeout(60000);
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  for(const width of [375,390,430]){await page.setViewportSize({width,height:width===430?932:844});for(const theme of ['light','dark']){await preferences(page);await page.getByRole('button',{name:theme==='light'?'Light':'Dark',exact:true}).tap();await page.getByRole('button',{name:'Done',exact:true}).tap();for(const view of ['Responsibilities','Hours','Week']){await nav(page,view);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.ip-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);if(testInfo.project.name==='WebKit iPhone'&&width===390)await page.screenshot({path:path.join(screenshotRoot,`${width}-${theme}-${view.toLowerCase()}.png`),animations:'disabled'});}}
  }
  await page.emulateMedia({reducedMotion:'reduce'});await nav(page,'Responsibilities');await page.getByTestId('ip-card-home').tap();expect(await page.getByTestId('ip-card-home').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
  await page.setViewportSize({width:375,height:812});await preferences(page);await page.getByRole('combobox',{name:'Text size',exact:true}).selectOption('2');await page.getByRole('button',{name:'Done',exact:true}).tap();
  for(const view of ['Responsibilities','Hours','Week']){await nav(page,view);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.ip-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);}
  const dock=await page.locator('.ip-dock button').evaluateAll(nodes=>nodes.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));expect(dock.every(d=>d.w>=44&&d.h>=44)).toBe(true);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
