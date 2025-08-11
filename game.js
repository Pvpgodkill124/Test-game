/* FZC v2 - improved mobile behavior
   Place player.png, bot.png, pet.png in same folder for sprites (recommended 40-64px)
*/

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const joystickCanvas = document.getElementById('joystick');
const jctx = joystickCanvas.getContext('2d');

const startBtn = document.getElementById('start-btn');
const nameInput = document.getElementById('player-name');
const shootBtn = document.getElementById('shoot-btn');
const kitBtn = document.getElementById('kit-btn');
const jumpBtn = document.getElementById('jump-btn');

let W = window.innerWidth;
let H = window.innerHeight;
function resizeCanvas(){
  W = window.innerWidth;
  H = window.innerHeight;
  // keep canvas full screen
  canvas.width = W;
  canvas.height = H;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/* ---------- Resources ---------- */
const playerImg = new Image(); playerImg.src = 'player.png';
const botImg = new Image(); botImg.src = 'bot.png';
const petImg = new Image(); petImg.src = 'pet.png';

/* ---------- Settings & state ---------- */
const SETTINGS = {
  BOT_COUNT: 14,
  MAP_W: 1800,
  MAP_H: 1200,
  PLAYER_SPEED: 220,
  BOT_SPEED_MIN: 50,
  BOT_SPEED_MAX: 120,
  BULLET_SPEED: 700,
  PLAYER_COOLDOWN: 200
};

let gameRunning = false;
let viewport = { x:0, y:0, w:W, h:H };

/* ---------- Entities ---------- */
class Entity {
  constructor(x,y,r,img){
    this.x = x; this.y = y; this.r = r; this.img = img;
    this.vx = 0; this.vy = 0; this.hp = 100; this.lastShot = 0; this.team = 'bot';
  }
  draw(cam, w=40, h=40){
    if(this.img && this.img.complete){
      ctx.drawImage(this.img, this.x - cam.x - w/2, this.y - cam.y - h/2, w, h);
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(this.x - cam.x, this.y - cam.y, this.r, 0, Math.PI*2); ctx.fill();
    }
    // hp bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.x - cam.x - this.r, this.y - cam.y - this.r - 9, this.r*2, 6);
    ctx.fillStyle = '#b8860b'; ctx.fillRect(this.x - cam.x - this.r, this.y - cam.y - this.r - 9, (this.r*2)*(this.hp/100), 6);
  }
}

let player = new Entity(SETTINGS.MAP_W/2, SETTINGS.MAP_H/2, 18, playerImg);
player.team = 'player';
let pet = { x: player.x + 40, y: player.y + 24, r: 12, img: petImg };

let bots = [];
let bullets = [];

/* ---------- Helpers ---------- */
function rand(min,max){ return Math.random()*(max-min)+min; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

/* ---------- Spawn bots ---------- */
function spawnBots(n){
  bots = [];
  for(let i=0;i<n;i++){
    const b = new Entity(rand(80, SETTINGS.MAP_W-80), rand(80, SETTINGS.MAP_H-80), 16, botImg);
    b.speed = rand(SETTINGS.BOT_SPEED_MIN, SETTINGS.BOT_SPEED_MAX);
    b.hp = 60 + Math.floor(rand(0,40));
    b.team = 'bot';
    b.nextChange = Date.now() + rand(600,2200);
    bots.push(b);
  }
}

/* ---------- Bullets ---------- */
function spawnBullet(x,y,angle,owner){
  bullets.push({
    x,y,
    vx: Math.cos(angle)*SETTINGS.BULLET_SPEED,
    vy: Math.sin(angle)*SETTINGS.BULLET_SPEED,
    r: 4,
    owner
  });
}

/* ---------- Bot AI: movement & shooting ---------- */
function updateBots(dt){
  for(let b of bots){
    if(b.hp <= 0) continue;
    if(Date.now() > b.nextChange){
      if(Math.random() < 0.6){
        // chase player
        const ang = Math.atan2(player.y - b.y, player.x - b.x);
        b.vx = Math.cos(ang) * b.speed;
        b.vy = Math.sin(ang) * b.speed;
      } else {
        const ang = Math.random()*Math.PI*2;
        b.vx = Math.cos(ang) * b.speed * 0.6;
        b.vy = Math.sin(ang) * b.speed * 0.6;
      }
      b.nextChange = Date.now() + rand(700, 2200);
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.x = clamp(b.x, 20, SETTINGS.MAP_W-20);
    b.y = clamp(b.y, 20, SETTINGS.MAP_H-20);

    // shoot when close
    const d = Math.hypot(player.x - b.x, player.y - b.y);
    if(d < 380 && Date.now() - b.lastShot > 700){
      const ang = Math.atan2(player.y - b.y, player.x - b.x);
      spawnBullet(b.x, b.y, ang, b);
      b.lastShot = Date.now();
    }
  }
}

/* ---------- Bullets update & collisions ---------- */
function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const bl = bullets[i];
    bl.x += bl.vx * dt;
    bl.y += bl.vy * dt;
    // bounds
    if(bl.x < 0 || bl.x > SETTINGS.MAP_W || bl.y < 0 || bl.y > SETTINGS.MAP_H){
      bullets.splice(i,1); continue;
    }
    // bot bullets hit player
    if(bl.owner && bl.owner.team === 'bot'){
      if(Math.hypot(player.x - bl.x, player.y - bl.y) < player.r + bl.r){
        player.hp -= 12;
        bullets.splice(i,1); continue;
      }
    } else {
      // player bullet hits bots
      for(let j=0;j<bots.length;j++){
        let bo = bots[j];
        if(bo.hp > 0 && Math.hypot(bo.x - bl.x, bo.y - bl.y) < bo.r + bl.r){
          bo.hp -= 40;
          bullets.splice(i,1);
          break;
        }
      }
    }
  }
  // remove dead bots
  for(let k=bots.length-1;k>=0;k--){
    if(bots[k].hp <= 0) bots.splice(k,1);
  }
}

/* ---------- Drawing ---------- */
function drawBackground(cam){
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#120606'); g.addColorStop(1,'#0b0b0b');
  ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
  // subtle grid
  const tile = 100;
  ctx.strokeStyle = 'rgba(18,18,18,0.5)';
  ctx.lineWidth = 1;
  for(let x = - (cam.x % tile); x < canvas.width; x += tile){
    for(let y = - (cam.y % tile); y < canvas.height; y += tile){
      ctx.strokeRect(x, y, tile, tile);
    }
  }
}

function drawAll(cam){
  drawBackground(cam);
  // bots
  for(let b of bots) b.draw(cam, 40, 40);
  // player
  player.draw(cam, 48, 48);
  // pet
  pet.x = player.x + 36; pet.y = player.y + 20;
  if(pet.img && pet.img.complete) ctx.drawImage(pet.img, pet.x - cam.x - 16, pet.y - cam.y - 16, 32, 32);
  // bullets
  for(let bl of bullets){
    ctx.beginPath();
    ctx.fillStyle = (bl.owner && bl.owner.team==='bot') ? '#ff7070' : '#ffd39b';
    ctx.arc(bl.x - cam.x, bl.y - cam.y, bl.r, 0, Math.PI*2);
    ctx.fill();
  }
  // HUD
  ctx.fillStyle = '#000';
  ctx.fillRect(16,16,220,18);
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(16,16,220*(player.hp/100),18);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.strokeRect(16,16,220,18);
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.fillText('HP', 10, 30);
  ctx.fillText('Enemies: '+bots.length, canvas.width - 120, 30);
}

/* ---------- Joystick Implementation ---------- */
let joystick = { active:false, sx:0, sy:0, dx:0, dy:0 };
function joystickToPlayerMovement(){
  if(!joystick.active) return { x:0, y:0 };
  // dx,dy are relative; scale to speed
  const speedFactor = 0.13; // tweak sensitivity
  return { x: joystick.dx * speedFactor, y: joystick.dy * speedFactor };
}

/* draw joystick UI on joystickCanvas */
function drawJoystickUI(){
  jctx.clearRect(0,0,joystickCanvas.width, joystickCanvas.height);
  // base
  jctx.fillStyle = 'rgba(255,255,255,0.02)';
  jctx.fillRect(0,0,joystickCanvas.width, joystickCanvas.height);
  // knob
  const kx = joystickCanvas.width/2 + joystick.dx/6;
  const ky = joystickCanvas.height/2 + joystick.dy/6;
  jctx.beginPath();
  jctx.fillStyle = 'rgba(184,134,11,0.9)';
  jctx.arc(kx, ky, 28, 0, Math.PI*2);
  jctx.fill();
}

/* ---------- Hook up joystick touch events ---------- */
joystickCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  joystick.active = true;
  // store start relative to joystick element
  const rect = joystickCanvas.getBoundingClientRect();
  joystick.sx = t.clientX - rect.left;
  joystick.sy = t.clientY - rect.top;
  joystick.dx = 0; joystick.dy = 0;
});
joystickCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if(!joystick.active) return;
  const t = e.touches[0];
  const rect = joystickCanvas.getBoundingClientRect();
  const cx = t.clientX - rect.left;
  const cy = t.clientY - rect.top;
  joystick.dx = cx - joystick.sx;
  joystick.dy = cy - joystick.sy;
  // clamp knob travel
  const max = 50;
  if(joystick.dx > max) joystick.dx = max;
  if(joystick.dx < -max) joystick.dx = -max;
  if(joystick.dy > max) joystick.dy = max;
  if(joystick.dy < -max) joystick.dy = -max;
});
joystickCanvas.addEventListener('touchend', e => {
  e.preventDefault();
  joystick.active = false; joystick.dx = 0; joystick.dy = 0;
});

/* ---------- Buttons: shoot, kit, jump ---------- */
let lastPlayerShot = 0;
shootBtn.addEventListener('touchstart', e=>{
  e.preventDefault();
  if(!gameRunning) return;
  const now = Date.now();
  if(now - lastPlayerShot < SETTINGS.PLAYER_COOLDOWN) return;
  lastPlayerShot = now;
  // aim at closest bot
  if(bots.length === 0) return;
  let minD = Infinity, tgt = null;
  for(let b of bots){
    const d = Math.hypot(b.x - player.x, b.y - player.y);
    if(d < minD){ minD = d; tgt = b; }
  }
  const ang = tgt ? Math.atan2(tgt.y - player.y, tgt.x - player.x) : 0;
  spawnBullet(player.x, player.y, ang, player);
});
kitBtn.addEventListener('touchstart', e=>{ e.preventDefault(); if(!gameRunning) return alert('KIT used (placeholder)') });
jumpBtn.addEventListener('touchstart', e=>{ e.preventDefault(); if(!gameRunning) return; player.y -= 40; });

/* ---------- Game loop ---------- */
let last = performance.now();
function loop(now){
  const dt = (now - last)/1000;
  last = now;
  if(gameRunning){
    // joystick movement to player position
    const mv = joystickToPlayerMovement();
    player.x += mv.x * SETTINGS.PLAYER_SPEED * dt;
    player.y += mv.y * SETTINGS.PLAYER_SPEED * dt;
    // clamp on map
    player.x = clamp(player.x, 20, SETTINGS.MAP_W-20);
    player.y = clamp(player.y, 20, SETTINGS.MAP_H-20);

    // update bots & bullets
    updateBots(dt);
    updateBullets(dt);

    // viewport center on player
    viewport.w = canvas.width; viewport.h = canvas.height;
    viewport.x = clamp(player.x - viewport.w/2, 0, SETTINGS.MAP_W - viewport.w);
    viewport.y = clamp(player.y - viewport.h/2, 0, SETTINGS.MAP_H - viewport.h);

    drawAll(viewport);
    drawJoystickUI();

    // win/lose
    if(player.hp <= 0){ gameRunning = false; setTimeout(()=>alert('You were defeated. Refresh to play again.'),50); }
    if(bots.length === 0 && gameRunning){ gameRunning = false; setTimeout(()=>alert('You win! All enemies down.'),50); }
  } else {
    // idle background + joystick UI
    // simple background so user sees something even before start
    drawBackground(viewport);
    drawJoystickUI();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- Start button ---------- */
startBtn.addEventListener('click', ()=>{
  const name = nameInput.value.trim();
  if(name.length === 0){ alert('Enter your name'); return; }
  player.name = name;
  player.x = SETTINGS.MAP_W/2; player.y = SETTINGS.MAP_H/2; player.hp = 100;
  spawnBots(SETTINGS.BOT_COUNT);
  bullets = [];
  // hide login
  document.getElementById('login-screen').style.display = 'none';
  gameRunning = true;
});

/* ---------- Utility ---------- */
function drawBackground(cam){
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#110606'); g.addColorStop(1,'#0b0b0b');
  ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
       }
