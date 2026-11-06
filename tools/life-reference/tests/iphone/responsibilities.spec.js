import { test, expect } from '../fixtures.js';
import path from 'node:path';
const runtimeErrors=new WeakMap();
async function nav(page,view){await page.getByRole('button',{name:'Open navigation',exact:true}).tap();await page.getByRole('dialog',{name:'Navigate Spread'}).getByRole('button',{name:view==='Responsibilities'?'Life':view,exact:true}).tap();}
async function edit(page){await page.getByRole('button',{name:'Edit responsibilities',exact:true}).tap();}
test.beforeEach(async({page})=>{const errors=[];runtimeErrors.set(page,errors);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});await page.goto('/iphone/app');await page.getByTestId('ip-card-family').tap();});
test.afterEach(async({page})=>{expect(runtimeErrors.get(page)).toEqual([]);});
test('weekly priority reserves its goal using only unassigned time and persists across views',async({page},info)=>{
  await page.getByRole('button',{name:'Make this week’s priority',exact:true}).tap();
  await expect(page.getByRole('dialog')).toContainText('4h reserved this week');await expect(page.getByLabel('Weekly priority goal',{exact:true})).toHaveValue('8');
  if(info.project.name==='WebKit iPhone')await page.screenshot({path:path.resolve('screenshots/iphone/priority-plan.png'),scale:'css',animations:'disabled'});
  await page.getByRole('button',{name:'Reserve 4h for Family',exact:true}).tap();await expect(page.getByRole('region',{name:'Weekly priority'})).toContainText('8h of 8h reserved');
  await nav(page,'Hours');await expect(page.getByLabel('Family budget',{exact:true})).toHaveText('8h');await expect(page.getByLabel('Work budget',{exact:true})).toHaveText('12h');
  await nav(page,'Week');await expect(page.getByRole('region',{name:'Weekly priority'})).toContainText('Family');
  await page.getByRole('button',{name:'Next week',exact:true}).tap();await expect(page.getByRole('region',{name:'Weekly priority'})).toHaveCount(0);await page.getByRole('button',{name:'Previous week',exact:true}).tap();
  await page.reload();await expect(page.getByRole('region',{name:'Weekly priority'})).toContainText('8h of 8h reserved');
});
test('an unfunded priority goal explains the limit without taking another role’s hours',async({page})=>{
  await page.getByRole('button',{name:'Make this week’s priority',exact:true}).tap();await page.getByLabel('Weekly priority goal',{exact:true}).fill('168');
  await expect(page.getByRole('dialog')).toContainText('only 9h is unassigned');await expect(page.getByRole('button',{name:/^Reserve /})).toHaveCount(0);
  await page.getByRole('button',{name:'Save priority goal',exact:true}).tap();await expect(page.getByRole('region',{name:'Weekly priority'})).toContainText('4h of 168h reserved');await nav(page,'Hours');await expect(page.getByLabel('Family budget',{exact:true})).toHaveText('6h');await expect(page.getByLabel('Work budget',{exact:true})).toHaveText('12h');
});
test('pencil editing manages identity with contextual undo/redo, then keeps changes on reload',async({page},info)=>{
  await expect(page.getByRole('button',{name:'Undo responsibility edit'})).toHaveCount(0);await edit(page);await expect(page.locator('.ip-editable-wallet')).toHaveAttribute('data-editing','true');await expect(page.getByRole('button',{name:'Undo responsibility edit'})).toHaveCount(0);
  await page.getByRole('button',{name:'Manage selected responsibility',exact:true}).tap();await page.getByLabel('Responsibility name',{exact:true}).fill('People I love');await page.getByRole('button',{name:'Use personal symbol',exact:true}).tap();await page.getByRole('button',{name:'Use color #007AFF',exact:true}).tap();await page.getByRole('button',{name:'Save',exact:true}).tap();
  await expect(page.getByTestId('ip-card-family')).toContainText('People I love');await expect(page.getByTestId('ip-card-family').locator('.ip-card-header img')).toHaveAttribute('src','/icons/icon-category-personal.svg');
  await expect(page.getByRole('button',{name:'Undo responsibility edit'})).toBeEnabled();await expect(page.getByRole('button',{name:'Redo responsibility edit'})).toBeDisabled();
  if(info.project.name==='WebKit iPhone')await page.screenshot({path:path.resolve('screenshots/iphone/edit-history.png'),scale:'css',animations:'disabled'});
  await page.getByRole('button',{name:'Undo responsibility edit'}).tap();await expect(page.getByTestId('ip-card-family')).toContainText('Family');await expect(page.getByRole('button',{name:'Redo responsibility edit'})).toBeEnabled();await page.getByRole('button',{name:'Redo responsibility edit'}).tap();await expect(page.getByTestId('ip-card-family')).toContainText('People I love');
  await page.getByRole('button',{name:'Done editing responsibilities'}).tap();await expect(page.getByRole('button',{name:'Undo responsibility edit'})).toHaveCount(0);await page.reload();await expect(page.getByTestId('ip-card-family')).toContainText('People I love');
});
test('confirmed deletion and undo/redo include tasks, hours and weekly priority',async({page})=>{
  await page.getByRole('button',{name:'Make this week’s priority',exact:true}).tap();await page.getByRole('button',{name:'Cancel',exact:true}).tap();await edit(page);
  await page.getByRole('button',{name:'Delete selected responsibility',exact:true}).tap();await expect(page.getByRole('dialog')).toContainText('removes its 3 tasks');await page.getByRole('button',{name:'Keep responsibility',exact:true}).tap();await expect(page.getByTestId('ip-card-family')).toBeVisible();
  await page.getByRole('button',{name:'Delete selected responsibility',exact:true}).tap();await page.getByRole('button',{name:'Delete Family from this week',exact:true}).tap();await expect(page.getByTestId('ip-card-family')).toHaveCount(0);
  await page.getByRole('button',{name:'Undo responsibility edit'}).tap();await expect(page.getByTestId('ip-card-family')).toContainText('Priority');await expect(page.getByRole('button',{name:'Open Dinner together',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Redo responsibility edit'}).tap();await expect(page.getByTestId('ip-card-family')).toHaveCount(0);await page.getByRole('button',{name:'Undo responsibility edit'}).tap();
  await page.getByRole('button',{name:'Done editing responsibilities'}).tap();await expect(page.getByRole('region',{name:'Weekly priority'})).toContainText('4h of 8h reserved');await nav(page,'Hours');await expect(page.getByLabel('Family budget',{exact:true})).toHaveText('6h');
});
test('left and right swipes reveal the intended actions without reflowing a card',async({page},info)=>{
  await edit(page);const card=page.getByTestId('ip-card-family');await card.hover();const before=await card.boundingBox();const nameBefore=await card.locator('.ip-card-header strong').boundingBox();
  await page.mouse.move(before.x+before.width/2,before.y+25);await page.mouse.down();await page.mouse.move(before.x+before.width/2-90,before.y+25,{steps:10});await page.mouse.up();
  await expect(page.getByRole('button',{name:'Manage Family',exact:true})).toBeVisible();await expect.poll(async()=>Math.round((await card.boundingBox()).x-before.x)).toBe(-92);
  const after=await card.boundingBox(),nameAfter=await card.locator('.ip-card-header strong').boundingBox();expect(after.width).toBeCloseTo(before.width,0);expect(nameAfter.x-after.x).toBeCloseTo(nameBefore.x-before.x,0);
  if(info.project.name==='WebKit iPhone')await page.screenshot({path:path.resolve('screenshots/iphone/swipe-manage.png'),scale:'css',animations:'disabled'});
  await page.getByRole('button',{name:'Manage Family',exact:true}).tap();await page.getByRole('button',{name:'Cancel',exact:true}).tap();await card.hover();const box=await card.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+25);await page.mouse.down();await page.mouse.move(box.x+box.width/2+90,box.y+25,{steps:10});await page.mouse.up();await expect(page.getByRole('button',{name:'Delete Family',exact:true})).toBeVisible();await page.getByRole('button',{name:'Delete Family',exact:true}).tap();await expect(page.getByRole('dialog')).toContainText('Delete Family from this week?');
});
test('reduced motion and enlarged text retain edit controls and priority planning',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});await edit(page);expect(await page.locator('.ip-card-slot').first().evaluate(el=>getComputedStyle(el,'::after').animationName)).toBe('none');
  await page.getByRole('button',{name:'Manage selected responsibility',exact:true}).tap();await page.getByRole('checkbox',{name:'Priority this week',exact:true}).check();await page.getByLabel('Weekly priority goal').fill('8');await page.getByRole('button',{name:'Save',exact:true}).tap();await page.getByRole('button',{name:'Undo responsibility edit'}).tap();await page.getByRole('button',{name:'Redo responsibility edit'}).tap();
  await page.getByRole('button',{name:'Done editing responsibilities'}).tap();await page.getByRole('button',{name:'Preferences',exact:true}).tap();await page.getByRole('combobox',{name:'Text size',exact:true}).selectOption('2');await page.getByRole('button',{name:'Done',exact:true}).tap();await edit(page);await page.getByRole('button',{name:'Manage selected responsibility',exact:true}).tap();
  expect(await page.locator('.ip-sheet-content').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
